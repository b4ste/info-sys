import { Router } from 'express'
import { approveEnrollment, assignEnrollment, getEnrollment, listEnrollments, rejectEnrollment, requestEnrollment, withdrawEnrollment } from '../controllers/enrollmentController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export function createEnrollmentRoutes(secret) {
  const router = Router()
  router.use(requireAuth(secret))
  router.post('/', requireRole('student'), requestEnrollment)
  router.post('/assign', requireRole('admin'), assignEnrollment)
  router.get('/my', requireRole('student'), listEnrollments)
  router.get('/', requireRole('admin', 'faculty'), listEnrollments)
  router.get('/:id', getEnrollment)
  router.patch('/:id/approve', requireRole('admin'), approveEnrollment)
  router.patch('/:id/reject', requireRole('admin'), rejectEnrollment)
  router.patch('/:id/withdraw', requireRole('student', 'admin'), withdrawEnrollment)
  return router
}
