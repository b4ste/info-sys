import { Router } from 'express'
import { createCorrectionController } from '../controllers/correctionController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export function createCorrectionRoutes(secret, policy) {
  const router = Router()
  const controller = createCorrectionController(policy)
  router.use(requireAuth(secret))
  router.post('/', requireRole('faculty'), controller.create)
  router.get('/', requireRole('admin', 'faculty'), controller.list)
  router.get('/:id', requireRole('admin', 'faculty'), controller.get)
  router.patch('/:id/approve', requireRole('admin'), controller.approve)
  router.patch('/:id/reject', requireRole('admin'), controller.reject)
  return router
}
