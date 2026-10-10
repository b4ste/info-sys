import { Router } from 'express'
import { changeUserName, changeUserStatus, createUser, listUsers } from '../controllers/userController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export function createUserRoutes(secret) {
  const router = Router()
  router.use(requireAuth(secret), requireRole('admin'))
  router.get('/', listUsers)
  router.post('/', createUser)
  router.patch('/:id/name', changeUserName)
  router.patch('/:id/status', changeUserStatus)
  return router
}
