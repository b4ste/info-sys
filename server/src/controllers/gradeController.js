import mongoose from 'mongoose'
import { z } from 'zod'
import ClassOffering from '../models/ClassOffering.js'
import Enrollment from '../models/Enrollment.js'
import Faculty from '../models/Faculty.js'
import Grade from '../models/Grade.js'
import Student from '../models/Student.js'
import { audit } from '../services/academicService.js'
import { calculateGrade, facultyGradeContext, gradeContext, percentToGradePoint, validateOfficialGrade } from '../services/gradeService.js'

const componentSchema = z.object({ name: z.string().trim().min(1), earnedScore: z.number().min(0), maxScore: z.number().positive() }).strict()
const percentScore = z.number().min(0).max(100).nullable().optional()
const draftSchema = z.object({ components: z.array(componentSchema).optional(), finalGrade: z.number().nullable().optional(), midtermScore: percentScore, finalsScore: percentScore }).strict()

// Students only see the midterm until the official final grade is published.
function forStudent(grade) {
  const item = grade.toObject()
  if (item.status !== 'published') for (const key of ['finalsScore', 'finalsGrade', 'calculatedGrade', 'finalGrade', 'components']) delete item[key]
  if (!item.midtermPublished) for (const key of ['midtermScore', 'midtermGrade']) delete item[key]
  return item
}
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['draft', 'submitted', 'finalized', 'published']).optional(), classOfferingId: z.string().optional() })

function missing(response) {
  return response.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Grade not found.' } })
}

function conflict(response, message) {
  return response.status(409).json({ success: false, error: { code: 'CONFLICT', message } })
}

function badInput(response, parsed) {
  return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: parsed.error.flatten().fieldErrors } })
}

async function canSeeGrade(user, grade) {
  if (user.role === 'admin') return true
  const context = await gradeContext(grade.enrollmentId)
  if (!context?.offering) return false
  if (user.role === 'faculty') {
    const faculty = await Faculty.findOne({ userId: user.id })
    return Boolean(faculty && String(context.offering.facultyId) === faculty.id)
  }
  const student = await Student.findOne({ userId: user.id })
  return Boolean(student && (grade.status === 'published' || grade.midtermPublished) && String(context.enrollment.studentId) === student.id)
}

export function createGradeController(policy) {
  async function saveDraft(request, response, enrollmentId, existing = null) {
    const parsed = draftSchema.safeParse(request.body)
    if (!parsed.success) return badInput(response, parsed)
    const context = await facultyGradeContext(request.user.id, enrollmentId)
    if (!context) return response.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot grade this enrollment.' } })
    if (existing && !['draft', 'submitted'].includes(existing.status)) return conflict(response, 'Finalized or published grades cannot be edited directly.')
    if ('finalGrade' in parsed.data && parsed.data.finalGrade !== null) validateOfficialGrade(parsed.data.finalGrade, policy)

    const grade = existing ?? new Grade({ enrollmentId })
    if ('midtermScore' in parsed.data || 'finalsScore' in parsed.data) {
      const { midtermScore, finalsScore } = parsed.data
      if (midtermScore !== undefined) {
        if (grade.midtermPublished && midtermScore !== grade.midtermScore) return conflict(response, 'Published midterm grades cannot be edited.')
        grade.midtermScore = midtermScore ?? undefined
        grade.midtermGrade = midtermScore == null ? undefined : percentToGradePoint(midtermScore)
      }
      if (finalsScore !== undefined) {
        grade.finalsScore = finalsScore ?? undefined
        grade.finalsGrade = finalsScore == null ? undefined : percentToGradePoint(finalsScore)
      }
      if (grade.midtermScore == null || grade.finalsScore == null) {
        grade.calculatedGrade = undefined
        grade.finalGrade = undefined
      } else {
        const average = (grade.midtermScore + grade.finalsScore) / 2
        grade.calculatedGrade = Number(average.toFixed(policy.decimals))
        grade.finalGrade = percentToGradePoint(average)
      }
    } else {
      const entered = parsed.data.components ?? existing?.components.map((item) => ({ name: item.name, earnedScore: item.earnedScore, maxScore: item.maxScore })) ?? []
      const { components, calculatedGrade } = calculateGrade(entered, context.offering.gradeComponents, policy.decimals)
      grade.components = components
      grade.calculatedGrade = calculatedGrade
      if ('finalGrade' in parsed.data) grade.finalGrade = parsed.data.finalGrade
    }
    grade.updatedBy = request.user.id
    await grade.save()
    return response.status(existing ? 200 : 201).json({ success: true, data: { item: grade } })
  }

  return {
    async upsertForEnrollment(request, response) {
      if (!mongoose.isValidObjectId(request.params.enrollmentId)) return missing(response)
      const grade = await Grade.findOne({ enrollmentId: request.params.enrollmentId })
      return saveDraft(request, response, request.params.enrollmentId, grade)
    },
    async update(request, response) {
      if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
      const grade = await Grade.findById(request.params.id)
      if (!grade) return missing(response)
      return saveDraft(request, response, grade.enrollmentId, grade)
    },
    async list(request, response) {
      const parsed = listSchema.safeParse(request.query)
      if (!parsed.success) return badInput(response, parsed)
      const { page, limit, status, classOfferingId } = parsed.data
      const filter = {}
      if (status) filter.status = status
      if (request.user.role === 'faculty') {
        const faculty = await Faculty.findOne({ userId: request.user.id })
        const offerings = faculty ? await ClassOffering.find({ facultyId: faculty.id }).distinct('_id') : []
        const allowed = classOfferingId ? offerings.filter((id) => String(id) === classOfferingId) : offerings
        filter.enrollmentId = { $in: await Enrollment.find({ classOfferingId: { $in: allowed } }).distinct('_id') }
      } else if (classOfferingId) {
        filter.enrollmentId = { $in: await Enrollment.find({ classOfferingId }).distinct('_id') }
      }
      const [items, total] = await Promise.all([
        Grade.find(filter).populate({ path: 'enrollmentId', populate: 'studentId' }).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
        Grade.countDocuments(filter),
      ])
      return response.json({ success: true, data: { items, page, limit, total } })
    },
    async my(request, response) {
      const parsed = listSchema.safeParse(request.query)
      if (!parsed.success) return badInput(response, parsed)
      const { page, limit } = parsed.data
      const student = await Student.findOne({ userId: request.user.id })
      if (!student) return response.json({ success: true, data: { items: [], page, limit, total: 0 } })
      const enrollmentIds = await Enrollment.find({ studentId: student.id }).distinct('_id')
      const filter = { enrollmentId: { $in: enrollmentIds }, $or: [{ status: 'published' }, { midtermPublished: true }] }
      const [items, total] = await Promise.all([
        Grade.find(filter).populate({ path: 'enrollmentId', populate: { path: 'classOfferingId', populate: 'subjectId' } }).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
        Grade.countDocuments(filter),
      ])
      return response.json({ success: true, data: { items: items.map(forStudent), page, limit, total } })
    },
    async get(request, response) {
      if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
      const item = await Grade.findById(request.params.id)
      if (!item || !await canSeeGrade(request.user, item)) return missing(response)
      return response.json({ success: true, data: { item: request.user.role === 'student' ? forStudent(item) : item } })
    },
    async publishMidterm(request, response) {
      if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
      const grade = await Grade.findById(request.params.id)
      if (!grade) return missing(response)
      const context = await facultyGradeContext(request.user.id, grade.enrollmentId)
      if (!context) return response.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot grade this enrollment.' } })
      if (grade.midtermScore == null) return conflict(response, 'A midterm score is required before publishing.')
      if (grade.midtermPublished) return conflict(response, 'Midterm grade is already published.')
      grade.midtermPublished = true
      grade.midtermPublishedAt = new Date()
      grade.updatedBy = request.user.id
      await grade.save()
      await audit(request.user.id, 'grade.midterm.published', 'Grade', grade.id)
      return response.json({ success: true, data: { item: grade } })
    },
    async submit(request, response) {
      return transition(request, response, 'draft', 'submitted', true)
    },
    async finalize(request, response) {
      return transition(request, response, 'submitted', 'finalized', true)
    },
    async publish(request, response) {
      return transition(request, response, 'finalized', 'published', false)
    },
  }

  async function transition(request, response, from, to, requireComplete) {
    if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
    const grade = await Grade.findById(request.params.id)
    if (!grade) return missing(response)
    const context = await facultyGradeContext(request.user.id, grade.enrollmentId)
    if (!context) return response.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot grade this enrollment.' } })
    if (grade.status !== from) return conflict(response, `Grade must be ${from} before it can be ${to}.`)
    if (requireComplete || to === 'published') {
      if (grade.calculatedGrade == null || grade.finalGrade == null) return conflict(response, 'All component scores and an official final grade are required.')
      validateOfficialGrade(grade.finalGrade, policy)
    }
    const update = { status: to, updatedBy: request.user.id, ...(to === 'published' && { publishedAt: new Date() }) }
    const item = await Grade.findOneAndUpdate({ _id: grade.id, status: from }, { $set: update }, { returnDocument: 'after' })
    if (!item) return conflict(response, 'Grade status changed. Please retry.')
    await audit(request.user.id, `grade.${to}`, 'Grade', item.id)
    return response.json({ success: true, data: { item } })
  }
}
