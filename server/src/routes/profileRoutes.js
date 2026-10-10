import { Router } from 'express'
import { createProfileController } from '../controllers/profileController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export function createProfileRoutes(secret, kind) {
  const router = Router()
  const controller = createProfileController(kind)
  router.use(requireAuth(secret))
  router.get('/my', requireRole(kind), controller.me)
  router.get('/', requireRole('admin'), controller.list)
  router.post('/', requireRole('admin'), controller.create)
  router.get('/:id', requireRole('admin', kind), controller.get)
  router.patch('/:id', requireRole('admin', kind), controller.update)
  return router
}
