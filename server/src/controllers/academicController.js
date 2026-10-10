import mongoose from 'mongoose'
import { z } from 'zod'
import AcademicTerm from '../models/AcademicTerm.js'
import { academicModels, activateTerm, audit, completeTerm, validateAcademicRelationship } from '../services/academicService.js'
import { academicSchemas } from '../validators/academicSchemas.js'

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.string().optional(),
  programId: z.string().optional(),
  academicTermId: z.string().optional(),
})

function badInput(response, parsed) {
  return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: parsed.error.flatten().fieldErrors } })
}

function missing(response) {
  return response.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Record not found.' } })
}

export function createAcademicController(resource) {
  const Model = academicModels[resource]
  const schema = academicSchemas[resource]
  const term = resource === 'academic-terms'
  return {
    async list(request, response) {
      const parsed = listSchema.safeParse(request.query)
      if (!parsed.success) return badInput(response, parsed)
      const { page, limit, search, status, programId, academicTermId } = parsed.data
      const filter = {}
      if (status) filter.status = status
      if (programId && Model.schema.path('programId')) filter.programId = programId
      if (academicTermId && Model.schema.path('academicTermId')) filter.academicTermId = academicTermId
      if (search) {
        const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const fields = ['code', 'name', 'academicYear'].filter((field) => Model.schema.path(field))
        if (fields.length) filter.$or = fields.map((field) => ({ [field]: { $regex: pattern, $options: 'i' } }))
      }
      const [items, total] = await Promise.all([
        Model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        Model.countDocuments(filter),
      ])
      return response.json({ success: true, data: { items, page, limit, total } })
    },
    async get(request, response) {
      if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
      const item = await Model.findById(request.params.id)
      if (!item) return missing(response)
      return response.json({ success: true, data: { item } })
    },
    async create(request, response) {
      const parsed = schema.safeParse(request.body)
      if (!parsed.success) return badInput(response, parsed)
      await validateAcademicRelationship(resource, parsed.data)
      const item = await Model.create(parsed.data)
      await audit(request.user.id, `${resource}.created`, Model.modelName, item.id)
      return response.status(201).json({ success: true, data: { item } })
    },
    async update(request, response) {
      if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
      const parsed = schema.partial().safeParse(request.body)
      if (!parsed.success) return badInput(response, parsed)
      const item = await Model.findById(request.params.id)
      if (!item) return missing(response)
      if (term && item.status !== 'upcoming') return response.status(409).json({ success: false, error: { code: 'TERM_LOCKED', message: 'Only upcoming terms can be edited.' } })
      const data = { ...item.toObject(), ...parsed.data }
      await validateAcademicRelationship(resource, data)
      Object.assign(item, parsed.data)
      await item.save()
      await audit(request.user.id, `${resource}.updated`, Model.modelName, item.id, { fields: Object.keys(parsed.data) })
      return response.json({ success: true, data: { item } })
    },
    async remove(request, response) {
      if (!mongoose.isValidObjectId(request.params.id)) return missing(response)
      const item = await Model.findById(request.params.id)
      if (!item) return missing(response)
      if (term) return response.status(409).json({ success: false, error: { code: 'TERM_ARCHIVE_REQUIRED', message: 'Complete terms instead of deleting them.' } })
      item.status = 'inactive'
      await item.save()
      await audit(request.user.id, `${resource}.archived`, Model.modelName, item.id)
      return response.json({ success: true, data: { item } })
    },
  }
}

export async function activateAcademicTerm(request, response) {
  const term = mongoose.isValidObjectId(request.params.id) && await AcademicTerm.findById(request.params.id)
  if (!term) return missing(response)
  await activateTerm(term, request.user.id)
  return response.json({ success: true, data: { item: term } })
}

export async function completeAcademicTerm(request, response) {
  const term = mongoose.isValidObjectId(request.params.id) && await AcademicTerm.findById(request.params.id)
  if (!term) return missing(response)
  await completeTerm(term, request.user.id)
  return response.json({ success: true, data: { item: term } })
}
