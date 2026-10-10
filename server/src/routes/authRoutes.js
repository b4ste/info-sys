import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { createAuthController } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'

export function createAuthRoutes(options) {
  const router = Router()
  const controller = createAuthController(options)
  const authenticated = requireAuth(options.jwtSecret)
  const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false })

  router.post('/login', loginLimit, controller.login)
  router.post('/logout', authenticated, controller.logout)
  router.get('/me', authenticated, controller.me)
  router.post('/change-password', authenticated, controller.changePassword)
  return router
}
