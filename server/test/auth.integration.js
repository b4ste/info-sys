import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { after, before, test } from 'node:test'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { createApp } from '../src/app.js'
import User from '../src/models/User.js'
import { getTestDatabaseUri } from './testDatabase.js'

const secret = 'integration-test-secret-long-enough-for-hs256'
const password = 'SecureTestPass123!'
let server
let baseUrl
let adminCookie
let studentCookie
let studentId
const invitations = []
const otpCodes = new Map()
let failInvitation = false

async function request(path, { cookie, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(cookie && { Cookie: cookie }), ...(body && { 'Content-Type': 'application/json' }) },
    ...(body && { body: JSON.stringify(body) }),
  })
  return { response, data: await response.json() }
}

async function signIn(email, candidate, rememberOtp = false) {
  const pending = await request('/api/auth/login', { method: 'POST', body: { email, password: candidate } })
  assert.equal(pending.response.status, 200)
  assert.equal(pending.data.data.otpRequired, true)
  assert.equal(pending.response.headers.get('set-cookie'), null)
  return request('/api/auth/verify-otp', { method: 'POST', body: { challengeToken: pending.data.data.challengeToken, code: otpCodes.get(email), rememberOtp } })
}

before(async () => {
  const dbName = `sis_auth_test_${randomBytes(5).toString('hex')}`
  await mongoose.connect(getTestDatabaseUri(), { dbName })
  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({ email: 'admin@test.example', passwordHash, role: 'admin', mustChangePassword: false })
  const student = await User.create({ email: 'student@test.example', passwordHash, role: 'student', mustChangePassword: false })
  studentId = student.id
  server = createApp({ jwtSecret: secret, sendAccountInvitation: async (invitation) => {
    if (failInvitation) throw new Error('Mail service failed')
    invitations.push(invitation)
  }, sendLoginOtp: async ({ email, code }) => { assert.match(code, /^\d{6}$/); otpCodes.set(email, code) } }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
  const adminLogin = await signIn('admin@test.example', password)
  const studentLogin = await signIn('student@test.example', password)
  adminCookie = adminLogin.response.headers.get('set-cookie').split(';')[0]
  studentCookie = studentLogin.response.headers.get('set-cookie').split(';')[0]
})

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
})

test('students cannot list or create accounts; admin can', async () => {
  const denied = await request('/api/users', { cookie: studentCookie })
  assert.equal(denied.response.status, 403)

  const created = await request('/api/users', { cookie: adminCookie, method: 'POST', body: { firstName: 'new', middleName: 'm', lastName: 'faculty', email: 'new@test.example', role: 'faculty' } })
  assert.equal(created.response.status, 201)
  assert.equal(created.data.data.user.name, 'New M Faculty')
  assert.equal(created.data.data.user.middleName, 'M')
  assert.equal(invitations[0].name, 'New M Faculty')
  assert.equal(created.data.data.user.role, 'faculty')
  assert.equal('passwordHash' in created.data.data.user, false)
  assert.equal(invitations.length, 1)
  assert.equal(invitations[0].email, 'new@test.example')
  assert.match(invitations[0].password, /[A-Z]/)
  assert.match(invitations[0].password, /[a-z]/)
  assert.match(invitations[0].password, /[^A-Za-z0-9\s]/)

  const renamed = await request(`/api/users/${created.data.data.user._id}/name`, { cookie: adminCookie, method: 'PATCH', body: { firstName: 'updated', middleName: '', lastName: 'faculty' } })
  assert.equal(renamed.response.status, 200)
  assert.equal(renamed.data.data.user.name, 'Updated Faculty')
  const search = await request('/api/users?search=Updated%20Faculty', { cookie: adminCookie })
  assert.equal(search.data.data.total, 1)

  const missingLastName = await request('/api/users', { cookie: adminCookie, method: 'POST', body: { firstName: 'Only', email: 'invalid@test.example', role: 'faculty' } })
  assert.equal(missingLastName.response.status, 400)
})

test('temporary passwords must be changed before protected resource access', async () => {
  const login = await signIn('new@test.example', invitations[0].password)
  assert.equal(login.response.status, 200)
  const cookie = login.response.headers.get('set-cookie').split(';')[0]
  const denied = await request('/api/departments', { cookie })
  assert.equal(denied.response.status, 403)
  assert.equal(denied.data.error.code, 'PASSWORD_CHANGE_REQUIRED')

  const changed = await request('/api/auth/change-password', { cookie, method: 'POST', body: { currentPassword: invitations[0].password, newPassword: 'Bb!' } })
  assert.equal(changed.response.status, 200)
  const newCookie = changed.response.headers.get('set-cookie').split(';')[0]
  const allowed = await request('/api/departments', { cookie: newCookie })
  assert.equal(allowed.response.status, 200)
  const stale = await request('/api/auth/me', { cookie })
  assert.equal(stale.response.status, 401)
})

test('remembered OTP skips codes for one hour on the same browser only', async () => {
  const remembered = await signIn('admin@test.example', password, true)
  assert.equal(remembered.response.status, 200)
  const trustHeader = remembered.response.headers.getSetCookie().find((item) => item.startsWith('sis_otp_trust='))
  assert.ok(trustHeader)
  assert.match(trustHeader, /Max-Age=3600/)
  const trustCookie = trustHeader.split(';')[0]
  const trustToken = jwt.verify(trustCookie.split('=')[1], secret, { audience: 'otp-trust' })
  assert.equal(trustToken.exp - trustToken.iat, 3600)

  const repeated = await request('/api/auth/login', { cookie: trustCookie, method: 'POST', body: { email: 'admin@test.example', password } })
  assert.equal(repeated.response.status, 200)
  assert.equal(repeated.data.data.user.email, 'admin@test.example')
  assert.equal(repeated.data.data.otpRequired, undefined)
  assert.ok(repeated.response.headers.get('set-cookie')?.includes('sis_session='))

  const wrongPassword = await request('/api/auth/login', { cookie: trustCookie, method: 'POST', body: { email: 'admin@test.example', password: 'Wrong!' } })
  assert.equal(wrongPassword.response.status, 401)

  const otherBrowser = await request('/api/auth/login', { method: 'POST', body: { email: 'admin@test.example', password } })
  assert.equal(otherBrowser.data.data.otpRequired, true)

  const expiredToken = jwt.sign({}, secret, { subject: trustToken.sub, audience: 'otp-trust', expiresIn: -1 })
  const expired = await request('/api/auth/login', { cookie: `sis_otp_trust=${expiredToken}`, method: 'POST', body: { email: 'admin@test.example', password } })
  assert.equal(expired.data.data.otpRequired, true)
})

test('a wrong or reused sign-in code cannot create a session', async () => {
  const pending = await request('/api/auth/login', { method: 'POST', body: { email: 'admin@test.example', password } })
  assert.equal(pending.response.status, 200)
  const challengeToken = pending.data.data.challengeToken
  const wrongCode = otpCodes.get('admin@test.example') === '000000' ? '000001' : '000000'
  const wrong = await request('/api/auth/verify-otp', { method: 'POST', body: { challengeToken, code: wrongCode } })
  assert.equal(wrong.response.status, 401)
  assert.equal(wrong.response.headers.get('set-cookie'), null)
  const verified = await request('/api/auth/verify-otp', { method: 'POST', body: { challengeToken, code: otpCodes.get('admin@test.example') } })
  assert.equal(verified.response.status, 200)
  assert.ok(verified.response.headers.get('set-cookie'))
  const reused = await request('/api/auth/verify-otp', { method: 'POST', body: { challengeToken, code: otpCodes.get('admin@test.example') } })
  assert.equal(reused.response.status, 400)
})

test('sign-in codes expire and allow only five wrong guesses', async () => {
  const pending = await request('/api/auth/login', { method: 'POST', body: { email: 'admin@test.example', password } })
  const challengeToken = pending.data.data.challengeToken
  const wrongCode = otpCodes.get('admin@test.example') === '000000' ? '000001' : '000000'
  for (let index = 0; index < 4; index += 1) {
    const wrong = await request('/api/auth/verify-otp', { method: 'POST', body: { challengeToken, code: wrongCode } })
    assert.equal(wrong.response.status, 401)
  }
  const fifth = await request('/api/auth/verify-otp', { method: 'POST', body: { challengeToken, code: wrongCode } })
  assert.equal(fifth.response.status, 429)
  const rejected = await request('/api/auth/verify-otp', { method: 'POST', body: { challengeToken, code: otpCodes.get('admin@test.example') } })
  assert.equal(rejected.response.status, 400)

  const next = await request('/api/auth/login', { method: 'POST', body: { email: 'admin@test.example', password } })
  await User.updateOne({ email: 'admin@test.example' }, { $set: { loginOtpExpiresAt: new Date(Date.now() - 1000) } })
  const expired = await request('/api/auth/verify-otp', { method: 'POST', body: { challengeToken: next.data.data.challengeToken, code: otpCodes.get('admin@test.example') } })
  assert.equal(expired.response.status, 400)
  assert.equal(expired.data.error.code, 'OTP_EXPIRED')
})

test('five failed sign-ins lock an account for ten minutes', async () => {
  const email = 'new@test.example'
  const body = (candidate) => ({ email, password: candidate })

  for (let index = 0; index < 2; index += 1) {
    const failed = await request('/api/auth/login', { method: 'POST', body: body('Wrong!') })
    assert.equal(failed.response.status, 401)
    assert.match(failed.data.error.message, new RegExp(`${4 - index} attempts remaining`))
  }
  const success = await signIn(email, 'Bb!')
  assert.equal(success.response.status, 200)
  assert.equal('failedLoginAttempts' in success.data.data.user, false)
  assert.equal('loginLockedUntil' in success.data.data.user, false)

  for (let index = 0; index < 4; index += 1) {
    const failed = await request('/api/auth/login', { method: 'POST', body: body('Wrong!') })
    assert.equal(failed.response.status, 401)
    assert.match(failed.data.error.message, new RegExp(`${4 - index} attempt${index === 3 ? '' : 's'} remaining`))
  }
  const fifth = await request('/api/auth/login', { method: 'POST', body: body('Wrong!') })
  assert.equal(fifth.response.status, 429)
  assert.equal(fifth.data.error.code, 'ACCOUNT_LOCKED')
  assert.ok(Number(fifth.response.headers.get('retry-after')) <= 600)

  const correctWhileLocked = await request('/api/auth/login', { method: 'POST', body: body('Bb!') })
  assert.equal(correctWhileLocked.response.status, 429)

  await User.updateOne({ email }, { $set: { loginLockedUntil: new Date(Date.now() - 1000) } })
  const afterCooldown = await signIn(email, 'Bb!')
  assert.equal(afterCooldown.response.status, 200)
  const user = await User.findOne({ email }).select('+failedLoginAttempts +loginLockedUntil')
  assert.equal(user.failedLoginAttempts, 0)
  assert.equal(user.loginLockedUntil, null)
})

test('inactive accounts cannot log in or use an existing session', async () => {
  const status = await request(`/api/users/${studentId}/status`, { cookie: adminCookie, method: 'PATCH', body: { status: 'inactive' } })
  assert.equal(status.response.status, 200)

  const login = await request('/api/auth/login', { method: 'POST', body: { email: 'student@test.example', password } })
  assert.equal(login.response.status, 401)

  const session = await request('/api/auth/me', { cookie: studentCookie })
  assert.equal(session.response.status, 401)
})

test('duplicate email is rejected', async () => {
  const duplicate = await request('/api/users', { cookie: adminCookie, method: 'POST', body: { firstName: 'Duplicate', lastName: 'Admin', email: 'admin@test.example', role: 'admin' } })
  assert.equal(duplicate.response.status, 409)
})

test('failed invitation does not leave an account behind', async () => {
  failInvitation = true
  try {
    const failed = await request('/api/users', { cookie: adminCookie, method: 'POST', body: { firstName: 'Mail', lastName: 'Failure', email: 'mail-failure@test.example', role: 'student' } })
    assert.equal(failed.response.status, 502)
    assert.equal(await User.countDocuments({ email: 'mail-failure@test.example' }), 0)
  } finally {
    failInvitation = false
  }
})

test('academic resources require admin writes and validate program relationships', async () => {
  const studentWrite = await request('/api/departments', { cookie: studentCookie, method: 'POST', body: { code: 'SCI', name: 'Science' } })
  assert.equal(studentWrite.response.status, 401)

  const department = await request('/api/departments', { cookie: adminCookie, method: 'POST', body: { code: 'SCI', name: 'Science' } })
  assert.equal(department.response.status, 201)
  const duplicateDepartment = await request('/api/departments', { cookie: adminCookie, method: 'POST', body: { code: 'SCI2', name: ' science ' } })
  assert.equal(duplicateDepartment.response.status, 409)
  assert.equal(duplicateDepartment.data.error.code, 'DUPLICATE_DEPARTMENT_NAME')

  const otherDepartment = await request('/api/departments', { cookie: adminCookie, method: 'POST', body: { code: 'ART', name: 'Arts' } })
  assert.equal(otherDepartment.response.status, 201)
  const duplicateRename = await request(`/api/departments/${otherDepartment.data.data.item._id}`, { cookie: adminCookie, method: 'PATCH', body: { name: 'SCIENCE' } })
  assert.equal(duplicateRename.response.status, 409)
  assert.equal(duplicateRename.data.error.code, 'DUPLICATE_DEPARTMENT_NAME')

  const invalidProgram = await request('/api/programs', { cookie: adminCookie, method: 'POST', body: { departmentId: '000000000000000000000000', code: 'BSCS', name: 'Computer Science', yearLevels: [1, 2, 3, 4] } })
  assert.equal(invalidProgram.response.status, 400)

  const program = await request('/api/programs', { cookie: adminCookie, method: 'POST', body: { departmentId: department.data.data.item._id, code: 'BSCS', name: 'Computer Science', yearLevels: [1, 2, 3, 4] } })
  assert.equal(program.response.status, 201)

  const wrongYear = await request('/api/sections', { cookie: adminCookie, method: 'POST', body: { programId: program.data.data.item._id, yearLevel: 5, academicTermId: '000000000000000000000000', name: 'A' } })
  assert.equal(wrongYear.response.status, 400)
})

test('logout invalidates the previous session token', async () => {
  const beforeLogout = await request('/api/auth/me', { cookie: adminCookie })
  assert.equal(beforeLogout.response.status, 200)
  const logout = await request('/api/auth/logout', { cookie: adminCookie, method: 'POST' })
  assert.equal(logout.response.status, 200)
  const afterLogout = await request('/api/auth/me', { cookie: adminCookie })
  assert.equal(afterLogout.response.status, 401)
})
