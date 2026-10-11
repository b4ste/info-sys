import { Router } from 'express'
import { createGradeController } from '../controllers/gradeController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export function createGradeRoutes(secret, policy) {
  const router = Router()
  const controller = createGradeController(policy)
  router.use(requireAuth(secret))
  router.get('/my', requireRole('student'), controller.my)
  router.get('/', requireRole('admin', 'faculty'), controller.list)
  router.put('/enrollment/:enrollmentId', requireRole('faculty'), controller.upsertForEnrollment)
  router.get('/:id', controller.get)
  router.put('/:id', requireRole('faculty'), controller.update)
  router.patch('/:id/publish-midterm', requireRole('faculty'), controller.publishMidterm)
  router.patch('/:id/submit', requireRole('faculty'), controller.submit)
  router.patch('/:id/finalize', requireRole('faculty'), controller.finalize)
  router.patch('/:id/publish', requireRole('faculty'), controller.publish)
  return router
}
