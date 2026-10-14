import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { after, before, test } from 'node:test'
import bcrypt from 'bcryptjs'
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
let failInvitation = false

async function request(path, { cookie, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(cookie && { Cookie: cookie }), ...(body && { 'Content-Type': 'application/json' }) },
    ...(body && { body: JSON.stringify(body) }),
  })
  return { response, data: await response.json() }
}

async function signIn(email, candidate) {
  const login = await request('/api/auth/login', { method: 'POST', body: { email, password: candidate } })
  assert.equal(login.response.status, 200)
  assert.ok(login.data.data.user)
  return login
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
  } }).listen(0)
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
  const duplicateDepartmentCode = await request('/api/departments', { cookie: adminCookie, method: 'POST', body: { code: 'sci', name: 'Physical Sciences' } })
  assert.equal(duplicateDepartmentCode.response.status, 409)
  assert.equal(duplicateDepartmentCode.data.error.code, 'DUPLICATE_DEPARTMENT_CODE')

  const otherDepartment = await request('/api/departments', { cookie: adminCookie, method: 'POST', body: { code: 'ART', name: 'Arts' } })
  assert.equal(otherDepartment.response.status, 201)
  const duplicateRename = await request(`/api/departments/${otherDepartment.data.data.item._id}`, { cookie: adminCookie, method: 'PATCH', body: { name: 'SCIENCE' } })
  assert.equal(duplicateRename.response.status, 409)
  assert.equal(duplicateRename.data.error.code, 'DUPLICATE_DEPARTMENT_NAME')
  const duplicateCodeUpdate = await request(`/api/departments/${otherDepartment.data.data.item._id}`, { cookie: adminCookie, method: 'PATCH', body: { code: 'sci' } })
  assert.equal(duplicateCodeUpdate.response.status, 409)
  assert.equal(duplicateCodeUpdate.data.error.code, 'DUPLICATE_DEPARTMENT_CODE')

  const invalidProgram = await request('/api/programs', { cookie: adminCookie, method: 'POST', body: { departmentId: '000000000000000000000000', code: 'BSCS', name: 'Computer Science', yearLevels: [1, 2, 3, 4] } })
  assert.equal(invalidProgram.response.status, 400)

  const program = await request('/api/programs', { cookie: adminCookie, method: 'POST', body: { departmentId: department.data.data.item._id, code: 'BSCS', name: 'Computer Science', yearLevels: [1, 2, 3, 4] } })
  assert.equal(program.response.status, 201)
  const duplicateProgramName = await request('/api/programs', { cookie: adminCookie, method: 'POST', body: { departmentId: department.data.data.item._id, code: 'BSIT', name: ' computer science ', yearLevels: [1, 2, 3, 4] } })
  assert.equal(duplicateProgramName.response.status, 409)
  assert.equal(duplicateProgramName.data.error.code, 'DUPLICATE_PROGRAM_NAME')
  const duplicateProgramCode = await request('/api/programs', { cookie: adminCookie, method: 'POST', body: { departmentId: department.data.data.item._id, code: 'bscs', name: 'Information Technology', yearLevels: [1, 2, 3, 4] } })
  assert.equal(duplicateProgramCode.response.status, 409)
  assert.equal(duplicateProgramCode.data.error.code, 'DUPLICATE_PROGRAM_CODE')

  const subject = await request('/api/subjects', { cookie: adminCookie, method: 'POST', body: { departmentId: department.data.data.item._id, code: 'SUB1', name: 'Foundations', units: 3 } })
  assert.equal(subject.response.status, 201)
  const duplicateSubjectName = await request('/api/subjects', { cookie: adminCookie, method: 'POST', body: { departmentId: department.data.data.item._id, code: 'SUB2', name: ' foundations ', units: 3 } })
  assert.equal(duplicateSubjectName.response.status, 409)
  assert.equal(duplicateSubjectName.data.error.code, 'DUPLICATE_SUBJECT_NAME')
  const duplicateSubjectCode = await request('/api/subjects', { cookie: adminCookie, method: 'POST', body: { departmentId: department.data.data.item._id, code: 'sub1', name: 'Principles', units: 3 } })
  assert.equal(duplicateSubjectCode.response.status, 409)
  assert.equal(duplicateSubjectCode.data.error.code, 'DUPLICATE_SUBJECT_CODE')

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
