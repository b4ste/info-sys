import assert from 'node:assert/strict'
import { test } from 'node:test'
import AcademicTerm from '../src/models/AcademicTerm.js'
import Subject from '../src/models/Subject.js'
import { enrollmentEligibility } from '../src/services/enrollmentService.js'

test('admin assignment accepts an upcoming term and checks the student section', async () => {
  const originalFindById = AcademicTerm.findById
  const originalSubjectFindById = Subject.findById
  AcademicTerm.findById = async () => ({ status: 'upcoming' })
  Subject.findById = () => ({ select: async () => ({ status: 'active' }) })
  try {
    const student = { status: 'active', programId: 'program-1', yearLevel: 2, sectionId: 'section-1' }
    const offering = { status: 'open', subjectId: 'subject-1', academicTermId: 'term-1', programId: 'program-1', yearLevel: 2, sectionId: 'section-1', enrollmentCount: 0, capacity: 30 }
    await enrollmentEligibility(student, offering, { allowUpcoming: true })
    await assert.rejects(enrollmentEligibility({ ...student, sectionId: 'section-2' }, offering, { allowUpcoming: true }), /does not match your section/i)
    await assert.rejects(enrollmentEligibility(student, offering), /term is not available/i)
    Subject.findById = () => ({ select: async () => ({ status: 'inactive' }) })
    await assert.rejects(enrollmentEligibility(student, offering, { allowUpcoming: true }), /subject is inactive/i)
  } finally {
    AcademicTerm.findById = originalFindById
    Subject.findById = originalSubjectFindById
  }
})
