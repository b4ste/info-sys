import { Router } from 'express'
import { changeOfferingStatus, createOffering, getOffering, getRoster, listOfferings, updateOffering } from '../controllers/offeringController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export function createOfferingRoutes(secret) {
  const router = Router()
  router.use(requireAuth(secret))
  router.get('/', listOfferings)
  router.post('/', requireRole('admin'), createOffering)
  router.get('/:id', getOffering)
  router.patch('/:id', requireRole('admin'), updateOffering)
  router.patch('/:id/status', requireRole('admin'), changeOfferingStatus)
  router.get('/:id/roster', requireRole('admin', 'faculty'), getRoster)
  return router
}
