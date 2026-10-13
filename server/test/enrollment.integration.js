import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { after, before, test } from 'node:test'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { createApp } from '../src/app.js'
import AcademicTerm from '../src/models/AcademicTerm.js'
import ClassOffering from '../src/models/ClassOffering.js'
import Department from '../src/models/Department.js'
import Enrollment from '../src/models/Enrollment.js'
import Faculty from '../src/models/Faculty.js'
import Program from '../src/models/Program.js'
import Student from '../src/models/Student.js'
import Subject from '../src/models/Subject.js'
import User from '../src/models/User.js'
import { getTestDatabaseUri } from './testDatabase.js'

const password = 'SecureTestPass123!'
let server
let baseUrl
let offering
let adminCookie
let studentCookies
const otpCodes = new Map()

async function call(path, { cookie, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, { method, headers: { ...(cookie && { Cookie: cookie }), ...(body && { 'Content-Type': 'application/json' }) }, ...(body && { body: JSON.stringify(body) }) })
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] }
}

async function signIn(email) {
  const pending = await call('/api/auth/login', { method: 'POST', body: { email, password } })
  assert.equal(pending.status, 200)
  const verified = await call('/api/auth/verify-otp', { method: 'POST', body: { challengeToken: pending.data.data.challengeToken, code: otpCodes.get(email) } })
  assert.equal(verified.status, 200)
  return verified.cookie
}

before(async () => {
  await mongoose.connect(getTestDatabaseUri(), { dbName: `sis_enrollment_test_${randomBytes(5).toString('hex')}` })
  const hash = await bcrypt.hash(password, 12)
  const admin = await User.create({ email: 'admin@test.example', passwordHash: hash, role: 'admin', mustChangePassword: false })
  const studentUsers = await User.create([
    { email: 'one@test.example', passwordHash: hash, role: 'student', mustChangePassword: false },
    { email: 'two@test.example', passwordHash: hash, role: 'student', mustChangePassword: false },
  ])
  const facultyUser = await User.create({ email: 'faculty@test.example', passwordHash: hash, role: 'faculty', mustChangePassword: false })
  const department = await Department.create({ code: 'SCI', name: 'Science' })
  const program = await Program.create({ departmentId: department.id, code: 'BSCS', name: 'Computer Science', yearLevels: [1] })
  const subject = await Subject.create({ code: 'CS101', name: 'Introduction', units: 3 })
  const now = Date.now()
  const term = await AcademicTerm.create({ academicYear: '2026-2027', termNumber: 1, startDate: new Date(now + 2 * 86400000), endDate: new Date(now + 120 * 86400000), enrollmentStart: new Date(now - 86400000), enrollmentEnd: new Date(now + 86400000), status: 'active' })
  const faculty = await Faculty.create({ userId: facultyUser.id, employeeNumber: 'F001', firstName: 'Test', lastName: 'Faculty', departmentId: department.id, contactEmail: 'faculty@test.example' })
  await Student.create(studentUsers.map((user, index) => ({ userId: user.id, studentNumber: `S00${index + 1}`, firstName: 'Test', lastName: `Student${index + 1}`, contactEmail: user.email, programId: program.id, yearLevel: 1 })))
  offering = await ClassOffering.create({ subjectId: subject.id, academicTermId: term.id, programId: program.id, yearLevel: 1, facultyId: faculty.id, capacity: 1 })
  server = createApp({ jwtSecret: 'integration-test-secret-long-enough-for-hs256', sendLoginOtp: async ({ email, code }) => { otpCodes.set(email, code) } }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
  adminCookie = await signIn(admin.email)
  studentCookies = await Promise.all(studentUsers.map((user) => signIn(user.email)))
})

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
})

test('concurrent approvals cannot exceed capacity, and withdrawal releases a seat', async () => {
  const requests = await Promise.all(studentCookies.map((cookie) => call('/api/enrollments', { cookie, method: 'POST', body: { classOfferingId: offering.id } })))
  assert.deepEqual(requests.map((result) => result.status), [201, 201])

  const decisions = await Promise.all(requests.map((result) => call(`/api/enrollments/${result.data.data.item._id}/approve`, { cookie: adminCookie, method: 'PATCH' })))
  assert.equal(decisions.filter((result) => result.status === 200).length, 1)
  assert.equal(decisions.filter((result) => result.status === 409).length, 1)
  assert.equal((await ClassOffering.findById(offering.id)).enrollmentCount, 1)
  assert.equal(await Enrollment.countDocuments({ classOfferingId: offering.id, status: 'approved' }), 1)

  const approvedIndex = decisions.findIndex((result) => result.status === 200)
  const withdrawn = await call(`/api/enrollments/${requests[approvedIndex].data.data.item._id}/withdraw`, { cookie: studentCookies[approvedIndex], method: 'PATCH' })
  assert.equal(withdrawn.status, 200)
  assert.equal((await ClassOffering.findById(offering.id)).enrollmentCount, 0)

  const otherIndex = approvedIndex === 0 ? 1 : 0
  const secondApproval = await call(`/api/enrollments/${requests[otherIndex].data.data.item._id}/approve`, { cookie: adminCookie, method: 'PATCH' })
  assert.equal(secondApproval.status, 200)
  assert.equal((await ClassOffering.findById(offering.id)).enrollmentCount, 1)
})

test('full and closed offerings reject requests, and program or year mismatch is blocked', async () => {
  const full = await call('/api/enrollments', { cookie: studentCookies[0], method: 'POST', body: { classOfferingId: offering.id } })
  assert.equal(full.status, 409)
  assert.match(full.data.error.message, /full/i)

  await Student.updateOne({ studentNumber: 'S001' }, { $set: { yearLevel: 2 } })
  const wrongYear = await call('/api/enrollments', { cookie: studentCookies[0], method: 'POST', body: { classOfferingId: offering.id } })
  assert.equal(wrongYear.status, 409)
  assert.match(wrongYear.data.error.message, /year level/i)

  await ClassOffering.updateOne({ _id: offering.id }, { $set: { status: 'closed' } })
  const closed = await call('/api/enrollments', { cookie: studentCookies[1], method: 'POST', body: { classOfferingId: offering.id } })
  assert.equal(closed.status, 409)
  assert.match(closed.data.error.message, /not open/i)
})

test('deactivating a subject closes its offerings and prevents reopening or enrollment', async () => {
  await ClassOffering.updateOne({ _id: offering.id }, { $set: { status: 'open' } })
  const deactivated = await call(`/api/subjects/${offering.subjectId}`, { cookie: adminCookie, method: 'DELETE' })
  assert.equal(deactivated.status, 200)
  assert.equal((await ClassOffering.findById(offering.id)).status, 'closed')

  const reopened = await call(`/api/class-offerings/${offering.id}/status`, { cookie: adminCookie, method: 'PATCH', body: { status: 'open' } })
  assert.equal(reopened.status, 409)
  assert.equal(reopened.data.error.code, 'SUBJECT_INACTIVE')

  await ClassOffering.updateOne({ _id: offering.id }, { $set: { status: 'open' } })
  const enrollment = await call('/api/enrollments', { cookie: studentCookies[0], method: 'POST', body: { classOfferingId: offering.id } })
  assert.equal(enrollment.status, 409)
  assert.match(enrollment.data.error.message, /subject is inactive/i)

  const visibleOfferings = await call('/api/class-offerings', { cookie: studentCookies[0] })
  assert.equal(visibleOfferings.data.data.items.some((item) => item._id === offering.id), false)
})
