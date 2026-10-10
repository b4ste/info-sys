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
import Grade from '../src/models/Grade.js'
import Program from '../src/models/Program.js'
import Student from '../src/models/Student.js'
import Subject from '../src/models/Subject.js'
import User from '../src/models/User.js'
import { getTestDatabaseUri } from './testDatabase.js'

const password = 'SecureTestPass123!'
let server
let baseUrl
let enrollment
let cookies
let gradeId

async function call(path, { cookie, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, { method, headers: { ...(cookie && { Cookie: cookie }), ...(body && { 'Content-Type': 'application/json' }) }, ...(body && { body: JSON.stringify(body) }) })
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] }
}

before(async () => {
  await mongoose.connect(getTestDatabaseUri(), { dbName: `sis_grading_test_${randomBytes(5).toString('hex')}` })
  const hash = await bcrypt.hash(password, 12)
  const accounts = {}
  for (const role of ['admin', 'faculty', 'student', 'other']) {
    accounts[role] = await User.create({ email: `${role}@test.example`, passwordHash: hash, role: role === 'other' ? 'faculty' : role, mustChangePassword: false })
  }
  const department = await Department.create({ code: 'SCI', name: 'Science' })
  const program = await Program.create({ departmentId: department.id, code: 'BSCS', name: 'Computer Science', yearLevels: [1] })
  const subject = await Subject.create({ code: 'CS101', name: 'Introduction', units: 3 })
  const term = await AcademicTerm.create({ academicYear: '2026-2027', termNumber: 1, startDate: new Date('2026-10-10'), endDate: new Date('2027-02-10'), enrollmentStart: new Date('2026-10-01'), enrollmentEnd: new Date('2026-10-09') })
  const faculty = await Faculty.create({ userId: accounts.faculty.id, employeeNumber: 'F001', firstName: 'Assigned', lastName: 'Faculty', departmentId: department.id, contactEmail: accounts.faculty.email })
  await Faculty.create({ userId: accounts.other.id, employeeNumber: 'F002', firstName: 'Other', lastName: 'Faculty', departmentId: department.id, contactEmail: accounts.other.email })
  const student = await Student.create({ userId: accounts.student.id, studentNumber: 'S001', firstName: 'Test', lastName: 'Student', contactEmail: accounts.student.email, programId: program.id, yearLevel: 1 })
  const offering = await ClassOffering.create({ subjectId: subject.id, academicTermId: term.id, programId: program.id, yearLevel: 1, facultyId: faculty.id, capacity: 1, enrollmentCount: 1, gradeComponents: [{ name: 'Quizzes', weight: 20 }, { name: 'Activities', weight: 30 }, { name: 'Exams', weight: 50 }] })
  enrollment = await Enrollment.create({ studentId: student.id, classOfferingId: offering.id, status: 'approved' })
  server = createApp({ jwtSecret: 'integration-test-secret-long-enough-for-hs256' }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
  cookies = {}
  for (const role of Object.keys(accounts)) cookies[role] = (await call('/api/auth/login', { method: 'POST', body: { email: accounts[role].email, password } })).cookie
})

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
})

test('only assigned faculty can enter scores; calculated and official grades stay separate', async () => {
  const components = [{ name: 'Quizzes', earnedScore: 85, maxScore: 100 }, { name: 'Activities', earnedScore: 90, maxScore: 100 }, { name: 'Exams', earnedScore: 80, maxScore: 100 }]
  const denied = await call(`/api/grades/enrollment/${enrollment.id}`, { cookie: cookies.other, method: 'PUT', body: { components, finalGrade: 88 } })
  assert.equal(denied.status, 403)

  const created = await call(`/api/grades/enrollment/${enrollment.id}`, { cookie: cookies.faculty, method: 'PUT', body: { components, finalGrade: 88 } })
  assert.equal(created.status, 201)
  assert.equal(created.data.data.item.calculatedGrade, 84)
  assert.equal(created.data.data.item.finalGrade, 88)
  gradeId = created.data.data.item._id

  const hidden = await call('/api/grades/my', { cookie: cookies.student })
  assert.equal(hidden.data.data.total, 0)

  const adminEdit = await call(`/api/grades/${gradeId}`, { cookie: cookies.admin, method: 'PUT', body: { finalGrade: 99 } })
  assert.equal(adminEdit.status, 403)
})

test('publication exposes the grade, then correction approval preserves its previous value', async () => {
  for (const operation of ['submit', 'finalize', 'publish']) {
    const result = await call(`/api/grades/${gradeId}/${operation}`, { cookie: cookies.faculty, method: 'PATCH' })
    assert.equal(result.status, 200)
  }
  const visible = await call('/api/grades/my', { cookie: cookies.student })
  assert.equal(visible.data.data.total, 1)
  assert.equal(visible.data.data.items[0].finalGrade, 88)

  const directEdit = await call(`/api/grades/${gradeId}`, { cookie: cookies.faculty, method: 'PUT', body: { finalGrade: 90 } })
  assert.equal(directEdit.status, 409)

  const requested = await call('/api/grade-correction-requests', { cookie: cookies.faculty, method: 'POST', body: { gradeId, proposedFinalGrade: 90, reason: 'Verified official score adjustment.' } })
  assert.equal(requested.status, 201)
  const approved = await call(`/api/grade-correction-requests/${requested.data.data.item._id}/approve`, { cookie: cookies.admin, method: 'PATCH' })
  assert.equal(approved.status, 200)
  const grade = await Grade.findById(gradeId)
  assert.equal(grade.finalGrade, 90)
  assert.equal(grade.revisions[0].previousFinalGrade, 88)
  assert.equal(grade.revisions[0].newFinalGrade, 90)

  const secondRequest = await call('/api/grade-correction-requests', { cookie: cookies.faculty, method: 'POST', body: { gradeId, proposedFinalGrade: 92, reason: 'Second adjustment review.' } })
  assert.equal(secondRequest.status, 201)
  const rejected = await call(`/api/grade-correction-requests/${secondRequest.data.data.item._id}/reject`, { cookie: cookies.admin, method: 'PATCH', body: {} })
  assert.equal(rejected.status, 200)
  assert.equal((await Grade.findById(gradeId)).finalGrade, 90)
})

test('a retake uses a new offering, enrollment, and grade without replacing the first attempt', async () => {
  const firstOffering = await ClassOffering.findById(enrollment.classOfferingId)
  const secondTerm = await AcademicTerm.create({ academicYear: '2026-2027', termNumber: 2, startDate: new Date('2027-02-11'), endDate: new Date('2027-06-11'), enrollmentStart: new Date('2027-02-01'), enrollmentEnd: new Date('2027-02-10') })
  const secondOffering = await ClassOffering.create({ subjectId: firstOffering.subjectId, academicTermId: secondTerm.id, programId: firstOffering.programId, yearLevel: firstOffering.yearLevel, facultyId: firstOffering.facultyId, capacity: 1, enrollmentCount: 1, gradeComponents: firstOffering.gradeComponents })
  const secondEnrollment = await Enrollment.create({ studentId: enrollment.studentId, classOfferingId: secondOffering.id, status: 'approved' })
  await Grade.create({ enrollmentId: secondEnrollment.id, components: [{ name: 'Quizzes', weight: 20, earnedScore: 70, maxScore: 100 }, { name: 'Activities', weight: 30, earnedScore: 80, maxScore: 100 }, { name: 'Exams', weight: 50, earnedScore: 75, maxScore: 100 }], calculatedGrade: 75.5, finalGrade: 79, status: 'published', publishedAt: new Date() })

  const history = await call('/api/grades/my', { cookie: cookies.student })
  assert.equal(history.data.data.total, 2)
  assert.equal((await Grade.findById(gradeId)).finalGrade, 90)
  assert.equal(await Enrollment.countDocuments({ studentId: enrollment.studentId }), 2)
})
