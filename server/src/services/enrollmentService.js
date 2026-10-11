import AcademicTerm from '../models/AcademicTerm.js'
import ClassOffering from '../models/ClassOffering.js'
import Student from '../models/Student.js'
import { enrollmentWindow } from './enrollmentWindow.js'

function conflict(message) {
  const error = new Error(message)
  error.status = 409
  throw error
}

export async function enrollmentEligibility(student, offering, { allowUpcoming = false } = {}) {
  if (!student || student.status !== 'active') conflict('An active student profile is required.')
  if (!offering || offering.status !== 'open') conflict('This class is not open for enrollment.')
  const term = await AcademicTerm.findById(offering.academicTermId)
  if (!term || (allowUpcoming ? term.status === 'completed' : term.status !== 'active')) conflict('The offering term is not available for enrollment.')
  if (!allowUpcoming) {
    const window = enrollmentWindow(term)
    if (!window.open) conflict(window.message)
  }
  if (String(student.programId) !== String(offering.programId) || (student.yearLevel !== 'irregular' && student.yearLevel !== offering.yearLevel)) conflict('This offering does not match your program and year level.')
  if (offering.sectionId && String(student.sectionId ?? '') !== String(offering.sectionId)) conflict('This offering does not match your section.')
  if (offering.enrollmentCount >= offering.capacity) conflict('This class is full.')
}

export async function reserveSeat(offeringId) {
  const reserved = await ClassOffering.findOneAndUpdate(
    { _id: offeringId, status: 'open', $expr: { $lt: ['$enrollmentCount', '$capacity'] } },
    { $inc: { enrollmentCount: 1 } },
    { returnDocument: 'after' },
  )
  if (!reserved) conflict('This class is full or closed.')
  return reserved
}

export async function releaseSeat(offeringId) {
  await ClassOffering.updateOne({ _id: offeringId, enrollmentCount: { $gt: 0 } }, { $inc: { enrollmentCount: -1 } })
}

export async function currentStudent(userId) {
  return Student.findOne({ userId })
}
