import assert from 'node:assert/strict'
import { test } from 'node:test'
import { studentSchema } from '../src/validators/profileSchemas.js'

const validStudent = {
  userId: '507f1f77bcf86cd799439011',
  studentNumber: '1234-123456',
  firstName: 'Test',
  lastName: 'Student',
  contactEmail: 'student@example.edu',
  programId: '507f1f77bcf86cd799439012',
  yearLevel: 1,
}

test('student numbers must use four digits, a hyphen, and six digits', () => {
  assert.equal(studentSchema.safeParse(validStudent).success, true)
  assert.equal(studentSchema.safeParse({ ...validStudent, studentNumber: '123-123456' }).success, false)
  assert.equal(studentSchema.safeParse({ ...validStudent, studentNumber: '1234 123456' }).success, false)
})

test('student birth dates cannot be in the future', () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  assert.equal(studentSchema.safeParse({ ...validStudent, birthDate: tomorrow.toISOString() }).success, false)
})

test('Philippine mobile numbers are validated and normalized to +63', () => {
  const international = studentSchema.safeParse({ ...validStudent, phone: '+639171234567' })
  const local = studentSchema.safeParse({ ...validStudent, phone: '09171234567' })

  assert.equal(international.success, true)
  assert.equal(international.data.phone, '+639171234567')
  assert.equal(local.success, true)
  assert.equal(local.data.phone, '+639171234567')
  assert.equal(studentSchema.safeParse({ ...validStudent, phone: '1234567' }).success, false)
})