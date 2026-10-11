import mongoose from 'mongoose'
import { z } from 'zod'
import ClassOffering from '../models/ClassOffering.js'
import Enrollment from '../models/Enrollment.js'
import Faculty from '../models/Faculty.js'
import Student from '../models/Student.js'
import AcademicTerm from '../models/AcademicTerm.js'
import { audit } from '../services/academicService.js'
import { facultyOwnsOffering, validateOffering } from '../services/offeringService.js'
import { offeringSchema, offeringStatusSchema } from '../validators/offeringSchema.js'

const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['open', 'closed', 'completed']).optional(), academicTermId: z.string().optional(), programId: z.string().optional() })

function badInput(response, parsed) {
  return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: parsed.error.flatten().fieldErrors } })
}

function missing(response) {
  return response.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offering not found.' } })
}

async function permitted(request, offering) {
  if (request.user.role === 'admin') return true
  if (request.user.role === 'faculty') return Boolean(await facultyOwnsOffering(request.user.id, offering))
  const student = await Student.findOne({ userId: request.user.id })
  return Boolean(student && String(student.programId) === String(offering.programId) && (student.yearLevel === 'irregular' || student.yearLevel === offering.yearLevel))
}

export async function listOfferings(request, response) {
  const parsed = listSchema.safeParse(request.query)
  if (!parsed.success) return badInput(response, parsed)
  const { page, limit, status, academicTermId, programId } = parsed.data
  const filter = {}
  if (status) filter.status = status
  if (academicTermId) filter.academicTermId = academicTermId
  if (programId) filter.programId = programId
  if (request.user.role === 'student') {
    const student = await Student.findOne({ userId: request.user.id })
    const activeTerm = await AcademicTerm.findOne({ status: 'active' })
    if (!student || !activeTerm) return response.json({ success: true, data: { items: [], page, limit, total: 0 } })
    filter.programId = student.programId
    if (student.yearLevel !== 'irregular') filter.yearLevel = student.yearLevel
    filter.academicTermId = activeTerm.id
    filter.status = 'open'
    filter.$or = student.sectionId
      ? [{ sectionId: { $exists: false } }, { sectionId: null }, { sectionId: student.sectionId }]
      : [{ sectionId: { $exists: false } }, { sectionId: null }]
  }
  if (request.user.role === 'faculty') {
    const faculty = await Faculty.findOne({ userId: request.user.id })
    if (!faculty) return response.json({ success: true, data: { items: [], page, limit, total: 0 } })
    filter.facultyId = faculty.id
  }
  const [items, total] = await Promise.all([
    ClassOffering.find(filter).populate('subjectId', 'code name units').populate('academicTermId', 'academicYear termNumber status enrollmentStart enrollmentEnd').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ClassOffering.countDocuments(filter),
  ])
  return response.json({ success: true, data: { items, page, limit, total } })
}

export async function getOffering(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
  const item = await ClassOffering.findById(request.params.id).populate('subjectId', 'code name units').populate('academicTermId', 'academicYear termNumber status enrollmentStart enrollmentEnd')
  if (!item) return missing(response)
  if (!await permitted(request, item)) return response.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot view this offering.' } })
  return response.json({ success: true, data: { item } })
}

export async function createOffering(request, response) {
  const parsed = offeringSchema.safeParse(request.body)
  if (!parsed.success) return badInput(response, parsed)
  await validateOffering(parsed.data)
  const item = await ClassOffering.create(parsed.data)
  await audit(request.user.id, 'offering.created', 'ClassOffering', item.id)
  return response.status(201).json({ success: true, data: { item } })
}

export async function updateOffering(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
  const parsed = offeringSchema.partial().safeParse(request.body)
  if (!parsed.success) return badInput(response, parsed)
  const item = await ClassOffering.findById(request.params.id)
  if (!item) return missing(response)
  if (item.status === 'completed') return response.status(409).json({ success: false, error: { code: 'OFFERING_LOCKED', message: 'Completed offerings cannot be edited.' } })
  await validateOffering({ ...item.toObject(), ...parsed.data }, item)
  const updated = await ClassOffering.findOneAndUpdate(
    { _id: item.id, status: { $ne: 'completed' }, ...(parsed.data.capacity && { enrollmentCount: { $lte: parsed.data.capacity } }) },
    { $set: parsed.data },
    { returnDocument: 'after', runValidators: true },
  )
  if (!updated) return response.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Offering changed or capacity is below the current enrollment count.' } })
  await audit(request.user.id, 'offering.updated', 'ClassOffering', updated.id, { fields: Object.keys(parsed.data) })
  return response.json({ success: true, data: { item: updated } })
}

export async function changeOfferingStatus(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
  const parsed = offeringStatusSchema.safeParse(request.body)
  if (!parsed.success) return badInput(response, parsed)
  const item = await ClassOffering.findById(request.params.id)
  if (!item) return missing(response)
  if (item.status === 'completed' && parsed.data.status !== 'completed') return response.status(409).json({ success: false, error: { code: 'OFFERING_LOCKED', message: 'Completed offerings cannot be reopened.' } })
  item.status = parsed.data.status
  await item.save()
  await audit(request.user.id, 'offering.status', 'ClassOffering', item.id, { status: item.status })
  return response.json({ success: true, data: { item } })
}

export async function getRoster(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
  const item = await ClassOffering.findById(request.params.id)
  if (!item) return missing(response)
  if (request.user.role !== 'admin' && !await facultyOwnsOffering(request.user.id, item)) return response.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot view this roster.' } })
  const enrollments = await Enrollment.find({ classOfferingId: item.id, status: 'approved' }).populate('studentId', 'studentNumber firstName lastName')
  return response.json({ success: true, data: { items: enrollments } })
}
