import { Router } from 'express'
import { listAuditEvents } from '../controllers/auditController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export function createAuditRoutes(secret) {
  const router = Router()
  router.use(requireAuth(secret), requireRole('admin'))
  router.get('/', listAuditEvents)
  return router
}
