import mongoose from 'mongoose'
import { z } from 'zod'
import ClassOffering from '../models/ClassOffering.js'
import Enrollment from '../models/Enrollment.js'
import Faculty from '../models/Faculty.js'
import Grade from '../models/Grade.js'
import Student from '../models/Student.js'
import { audit } from '../services/academicService.js'
import { currentStudent, enrollmentEligibility, releaseSeat, reserveSeat } from '../services/enrollmentService.js'
import { objectId } from '../validators/academicSchemas.js'

const requestSchema = z.object({ classOfferingId: objectId }).strict()
const assignSchema = z.object({ studentId: objectId, classOfferingId: objectId }).strict()
const rejectSchema = z.object({ rejectionReason: z.string().trim().min(1).max(500) }).strict()
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['pending', 'approved', 'rejected', 'withdrawn']).optional(), classOfferingId: objectId.optional() })

function missing(response) {
  return response.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enrollment not found.' } })
}

function badInput(response, parsed) {
  return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: parsed.error.flatten().fieldErrors } })
}

function conflict(response, message) {
  return response.status(409).json({ success: false, error: { code: 'CONFLICT', message } })
}

export async function requestEnrollment(request, response) {
  const parsed = requestSchema.safeParse(request.body)
  if (!parsed.success) return badInput(response, parsed)
  const student = await currentStudent(request.user.id)
  const offering = await ClassOffering.findById(parsed.data.classOfferingId)
  await enrollmentEligibility(student, offering)
  const duplicate = await Enrollment.exists({ studentId: student.id, classOfferingId: offering.id })
  if (duplicate) return conflict(response, 'You already have an enrollment record for this offering.')
  const item = await Enrollment.create({ studentId: student.id, classOfferingId: offering.id })
  await audit(request.user.id, 'enrollment.requested', 'Enrollment', item.id)
  return response.status(201).json({ success: true, data: { item } })
}

export async function assignEnrollment(request, response) {
  const parsed = assignSchema.safeParse(request.body)
  if (!parsed.success) return badInput(response, parsed)
  const [student, offering] = await Promise.all([
    Student.findById(parsed.data.studentId),
    ClassOffering.findById(parsed.data.classOfferingId),
  ])
  await enrollmentEligibility(student, offering, { allowUpcoming: true })
  if (await Enrollment.exists({ studentId: student.id, classOfferingId: offering.id })) {
    return conflict(response, 'This student already has an enrollment record for this class.')
  }
  await reserveSeat(offering.id)
  let item
  try {
    item = await Enrollment.create({ studentId: student.id, classOfferingId: offering.id, status: 'approved', reviewedBy: request.user.id, reviewedAt: new Date() })
  } catch (error) {
    await releaseSeat(offering.id)
    if (error.code === 11000) return conflict(response, 'This student already has an enrollment record for this class.')
    throw error
  }
  await audit(request.user.id, 'enrollment.assigned', 'Enrollment', item.id)
  return response.status(201).json({ success: true, data: { item } })
}

export async function listEnrollments(request, response) {
  const parsed = listSchema.safeParse(request.query)
  if (!parsed.success) return badInput(response, parsed)
  const { page, limit, status, classOfferingId } = parsed.data
  const filter = {}
  if (status) filter.status = status
  if (classOfferingId) filter.classOfferingId = classOfferingId
  if (request.user.role === 'student') {
    const student = await currentStudent(request.user.id)
    if (!student) return response.json({ success: true, data: { items: [], page, limit, total: 0 } })
    filter.studentId = student.id
  }
  if (request.user.role === 'faculty') {
    const faculty = await Faculty.findOne({ userId: request.user.id })
    const offerings = faculty ? await ClassOffering.find({ facultyId: faculty.id }).distinct('_id') : []
    filter.classOfferingId = classOfferingId ? { $in: offerings.filter((id) => String(id) === classOfferingId) } : { $in: offerings }
  }
  const [items, total] = await Promise.all([
    Enrollment.find(filter).populate('studentId', 'studentNumber firstName lastName').populate({ path: 'classOfferingId', populate: { path: 'subjectId', select: 'code name' } }).sort({ requestedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Enrollment.countDocuments(filter),
  ])
  return response.json({ success: true, data: { items, page, limit, total } })
}

export async function getEnrollment(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
  const item = await Enrollment.findById(request.params.id).populate('studentId').populate('classOfferingId')
  if (!item) return missing(response)
  if (request.user.role === 'student' && String(item.studentId.userId) !== request.user.id) return missing(response)
  if (request.user.role === 'faculty') {
    const faculty = await Faculty.findOne({ userId: request.user.id })
    if (!faculty || String(item.classOfferingId.facultyId) !== faculty.id) return missing(response)
  }
  return response.json({ success: true, data: { item } })
}

export async function approveEnrollment(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
  const item = await Enrollment.findById(request.params.id)
  if (!item) return missing(response)
  if (item.status !== 'pending') return conflict(response, 'Only pending requests can be approved.')
  const [student, offering] = await Promise.all([currentStudentById(item.studentId), ClassOffering.findById(item.classOfferingId)])
  await enrollmentEligibility(student, offering)
  await reserveSeat(offering.id)
  let approved
  try {
    approved = await Enrollment.findOneAndUpdate(
      { _id: item.id, status: 'pending' },
      { $set: { status: 'approved', reviewedBy: request.user.id, reviewedAt: new Date() } },
      { returnDocument: 'after' },
    )
  } catch (error) {
    await releaseSeat(offering.id)
    throw error
  }
  if (!approved) {
    await releaseSeat(offering.id)
    return conflict(response, 'This request has already been reviewed.')
  }
  await audit(request.user.id, 'enrollment.approved', 'Enrollment', item.id)
  return response.json({ success: true, data: { item: approved } })
}

async function currentStudentById(id) {
  const Student = (await import('../models/Student.js')).default
  return Student.findById(id)
}

export async function rejectEnrollment(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
  const parsed = rejectSchema.safeParse(request.body)
  if (!parsed.success) return badInput(response, parsed)
  const item = await Enrollment.findOneAndUpdate(
    { _id: request.params.id, status: 'pending' },
    { $set: { status: 'rejected', rejectionReason: parsed.data.rejectionReason, reviewedBy: request.user.id, reviewedAt: new Date() } },
    { returnDocument: 'after' },
  )
  if (!item) return conflict(response, 'Pending request not found.')
  await audit(request.user.id, 'enrollment.rejected', 'Enrollment', item.id, { reason: item.rejectionReason })
  return response.json({ success: true, data: { item } })
}

export async function withdrawEnrollment(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
  const existing = await Enrollment.findById(request.params.id)
  if (!existing) return missing(response)
  if (request.user.role === 'student') {
    const student = await currentStudent(request.user.id)
    if (!student || String(existing.studentId) !== student.id) return missing(response)
  }
  if (!['pending', 'approved'].includes(existing.status)) return conflict(response, 'This enrollment cannot be withdrawn.')
  if (await Grade.exists({ enrollmentId: existing.id })) return conflict(response, 'An enrollment with a grade record cannot be withdrawn.')
  const item = await Enrollment.findOneAndUpdate(
    { _id: existing.id, status: { $in: ['pending', 'approved'] } },
    { $set: { status: 'withdrawn' } },
    { returnDocument: 'before' },
  )
  if (!item) return conflict(response, 'Enrollment status changed. Please retry.')
  if (item.status === 'approved') await releaseSeat(item.classOfferingId)
  await audit(request.user.id, 'enrollment.withdrawn', 'Enrollment', item.id)
  return response.json({ success: true, data: { item: await Enrollment.findById(item.id) } })
}
