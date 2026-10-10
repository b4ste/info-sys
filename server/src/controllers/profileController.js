import mongoose from 'mongoose'
import { z } from 'zod'
import Faculty from '../models/Faculty.js'
import Student from '../models/Student.js'
import { audit } from '../services/academicService.js'
import { validateProfile } from '../services/profileService.js'
import { facultySchema, facultySelfSchema, studentSchema, studentSelfSchema } from '../validators/profileSchemas.js'

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  programId: z.string().optional(),
  departmentId: z.string().optional(),
})

function badInput(response, parsed) {
  return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: parsed.error.flatten().fieldErrors } })
}

function missing(response) {
  return response.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found.' } })
}

export function createProfileController(kind) {
  const Model = kind === 'student' ? Student : Faculty
  const schema = kind === 'student' ? studentSchema : facultySchema
  const selfSchema = kind === 'student' ? studentSelfSchema : facultySelfSchema
  return {
    async list(request, response) {
      const parsed = listSchema.safeParse(request.query)
      if (!parsed.success) return badInput(response, parsed)
      const { page, limit, search, status, programId, departmentId } = parsed.data
      const filter = {}
      if (status) filter.status = status
      if (kind === 'student' && programId) filter.programId = programId
      if (kind === 'faculty' && departmentId) filter.departmentId = departmentId
      if (search) {
        const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        filter.$or = ['firstName', 'lastName', kind === 'student' ? 'studentNumber' : 'employeeNumber'].map((field) => ({ [field]: { $regex: pattern, $options: 'i' } }))
      }
      const [items, total] = await Promise.all([
        Model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        Model.countDocuments(filter),
      ])
      return response.json({ success: true, data: { items, page, limit, total } })
    },
    async me(request, response) {
      const item = await Model.findOne({ userId: request.user.id })
      if (!item) return missing(response)
      return response.json({ success: true, data: { item } })
    },
    async get(request, response) {
      if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
      const item = await Model.findById(request.params.id)
      if (!item) return missing(response)
      if (request.user.role !== 'admin' && String(item.userId) !== request.user.id) return response.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot access this profile.' } })
      return response.json({ success: true, data: { item } })
    },
    async create(request, response) {
      const parsed = schema.safeParse(request.body)
      if (!parsed.success) return badInput(response, parsed)
      await validateProfile(kind, parsed.data)
      const item = await Model.create(parsed.data)
      await audit(request.user.id, `${kind}.created`, Model.modelName, item.id)
      return response.status(201).json({ success: true, data: { item } })
    },
    async update(request, response) {
      if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
      const item = await Model.findById(request.params.id)
      if (!item) return missing(response)
      const admin = request.user.role === 'admin'
      if (!admin && String(item.userId) !== request.user.id) return response.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot edit this profile.' } })
      const parsed = (admin ? schema.omit({ userId: true }).partial() : selfSchema).safeParse(request.body)
      if (!parsed.success) return badInput(response, parsed)
      if (admin) await validateProfile(kind, { ...item.toObject(), ...parsed.data })
      Object.assign(item, parsed.data)
      await item.save()
      if (admin) await audit(request.user.id, `${kind}.updated`, Model.modelName, item.id, { fields: Object.keys(parsed.data) })
      return response.json({ success: true, data: { item } })
    },
  }
}
