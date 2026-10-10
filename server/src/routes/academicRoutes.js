import { Router } from 'express'
import { activateAcademicTerm, completeAcademicTerm, createAcademicController } from '../controllers/academicController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { academicModels } from '../services/academicService.js'

export function createAcademicRoutes(secret) {
  const router = Router()
  const authenticated = requireAuth(secret)
  for (const resource of Object.keys(academicModels)) {
    const controller = createAcademicController(resource)
    router.get(`/${resource}`, authenticated, controller.list)
    router.get(`/${resource}/:id`, authenticated, controller.get)
    router.post(`/${resource}`, authenticated, requireRole('admin'), controller.create)
    router.patch(`/${resource}/:id`, authenticated, requireRole('admin'), controller.update)
    router.delete(`/${resource}/:id`, authenticated, requireRole('admin'), controller.remove)
  }
  router.patch('/academic-terms/:id/activate', authenticated, requireRole('admin'), activateAcademicTerm)
  router.patch('/academic-terms/:id/complete', authenticated, requireRole('admin'), completeAcademicTerm)
  return router
}
