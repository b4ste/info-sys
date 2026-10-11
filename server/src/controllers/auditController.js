import { z } from 'zod'
import AuditEvent from '../models/AuditEvent.js'

const schema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(10).default(10), action: z.string().trim().max(100).optional(), entityType: z.string().trim().max(100).optional() })

export async function listAuditEvents(request, response) {
  const parsed = schema.safeParse(request.query)
  if (!parsed.success) return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid query.' } })
  const { page, limit, action, entityType } = parsed.data
  const filter = { ...(action && { action }), ...(entityType && { entityType }) }
  const [items, total] = await Promise.all([
    AuditEvent.find(filter).populate('actorId', 'email role').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AuditEvent.countDocuments(filter),
  ])
  return response.json({ success: true, data: { items, page, limit, total } })
}
