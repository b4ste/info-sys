import mongoose from 'mongoose'
import { z } from 'zod'
import Grade from '../models/Grade.js'
import GradeCorrectionRequest from '../models/GradeCorrectionRequest.js'
import { audit } from '../services/academicService.js'
import { facultyGradeContext, validateOfficialGrade } from '../services/gradeService.js'
import { objectId } from '../validators/academicSchemas.js'

const requestSchema = z.object({ gradeId: objectId, proposedFinalGrade: z.number(), reason: z.string().trim().min(5).max(2000) }).strict()
const rejectSchema = z.object({ reason: z.string().trim().min(1).max(1000).optional() }).strict()
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['pending', 'reviewing', 'approved', 'rejected']).optional() })

function missing(response) {
  return response.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Correction request not found.' } })
}

function conflict(response, message) {
  return response.status(409).json({ success: false, error: { code: 'CONFLICT', message } })
}

function badInput(response, parsed) {
  return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: parsed.error.flatten().fieldErrors } })
}

export function createCorrectionController(policy) {
  return {
    async create(request, response) {
      const parsed = requestSchema.safeParse(request.body)
      if (!parsed.success) return badInput(response, parsed)
      validateOfficialGrade(parsed.data.proposedFinalGrade, policy)
      const grade = await Grade.findById(parsed.data.gradeId)
      if (!grade || grade.status !== 'published') return conflict(response, 'Only published grades can be corrected.')
      const context = await facultyGradeContext(request.user.id, grade.enrollmentId)
      if (!context) return response.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot correct this grade.' } })
      if (grade.finalGrade === parsed.data.proposedFinalGrade) return conflict(response, 'Proposed grade must differ from the current official grade.')
      if (await GradeCorrectionRequest.exists({ gradeId: grade.id, status: { $in: ['pending', 'reviewing'] } })) return conflict(response, 'A correction request is already pending.')
      const item = await GradeCorrectionRequest.create({ gradeId: grade.id, requestedBy: request.user.id, previousFinalGrade: grade.finalGrade, proposedFinalGrade: parsed.data.proposedFinalGrade, reason: parsed.data.reason })
      await audit(request.user.id, 'grade.correction.requested', 'GradeCorrectionRequest', item.id)
      return response.status(201).json({ success: true, data: { item } })
    },
    async list(request, response) {
      const parsed = listSchema.safeParse(request.query)
      if (!parsed.success) return badInput(response, parsed)
      const { page, limit, status } = parsed.data
      const filter = {}
      if (status) filter.status = status
      if (request.user.role === 'faculty') filter.requestedBy = request.user.id
      const [items, total] = await Promise.all([
        GradeCorrectionRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        GradeCorrectionRequest.countDocuments(filter),
      ])
      return response.json({ success: true, data: { items, page, limit, total } })
    },
    async get(request, response) {
      if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
      const item = await GradeCorrectionRequest.findById(request.params.id)
      if (!item || (request.user.role === 'faculty' && String(item.requestedBy) !== request.user.id)) return missing(response)
      return response.json({ success: true, data: { item } })
    },
    async approve(request, response) {
      if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
      let item = await GradeCorrectionRequest.findOneAndUpdate({ _id: request.params.id, status: 'pending' }, { $set: { status: 'reviewing' } }, { returnDocument: 'after' })
      if (!item) {
        item = await GradeCorrectionRequest.findById(request.params.id)
        if (!item) return missing(response)
        if (item.status !== 'reviewing') return conflict(response, 'This request has already been reviewed.')
      }
      const grade = await Grade.findOneAndUpdate(
        { _id: item.gradeId, status: 'published', finalGrade: item.previousFinalGrade, 'revisions.correctionRequestId': { $ne: item.id } },
        { $set: { finalGrade: item.proposedFinalGrade, updatedBy: request.user.id }, $push: { revisions: { previousFinalGrade: item.previousFinalGrade, newFinalGrade: item.proposedFinalGrade, changedAt: new Date(), correctionRequestId: item.id } } },
        { returnDocument: 'after' },
      )
      if (!grade) {
        const current = await Grade.findById(item.gradeId)
        const alreadyApplied = current?.revisions.some((revision) => String(revision.correctionRequestId) === item.id) && current.finalGrade === item.proposedFinalGrade
        if (!alreadyApplied) {
          await GradeCorrectionRequest.updateOne({ _id: item.id, status: 'reviewing' }, { $set: { status: 'pending' } })
          return conflict(response, 'The published grade changed. Review the request again.')
        }
      }
      item = await GradeCorrectionRequest.findOneAndUpdate({ _id: item.id, status: 'reviewing' }, { $set: { status: 'approved', reviewedBy: request.user.id, reviewedAt: new Date() } }, { returnDocument: 'after' })
      if (!item) return conflict(response, 'This request has already been reviewed.')
      await audit(request.user.id, 'grade.correction.approved', 'GradeCorrectionRequest', item.id, { previousFinalGrade: item.previousFinalGrade, proposedFinalGrade: item.proposedFinalGrade })
      return response.json({ success: true, data: { item } })
    },
    async reject(request, response) {
      if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
      const parsed = rejectSchema.safeParse(request.body)
      if (!parsed.success) return badInput(response, parsed)
      const item = await GradeCorrectionRequest.findOneAndUpdate({ _id: request.params.id, status: 'pending' }, { $set: { status: 'rejected', reviewedBy: request.user.id, reviewedAt: new Date() } }, { returnDocument: 'after' })
      if (!item) return conflict(response, 'Pending request not found.')
      await audit(request.user.id, 'grade.correction.rejected', 'GradeCorrectionRequest', item.id, { reason: parsed.data.reason })
      return response.json({ success: true, data: { item } })
    },
  }
}
