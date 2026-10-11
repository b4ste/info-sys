import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import healthRoutes from './routes/healthRoutes.js'
import { createAuthRoutes } from './routes/authRoutes.js'
import { createUserRoutes } from './routes/userRoutes.js'
import { createAcademicRoutes } from './routes/academicRoutes.js'
import { createProfileRoutes } from './routes/profileRoutes.js'
import { createOfferingRoutes } from './routes/offeringRoutes.js'
import { createEnrollmentRoutes } from './routes/enrollmentRoutes.js'
import { createGradeRoutes } from './routes/gradeRoutes.js'
import { createCorrectionRoutes } from './routes/correctionRoutes.js'
import { createAuditRoutes } from './routes/auditRoutes.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

export function createApp({ clientOrigin = 'http://localhost:5173', jwtSecret, sendAccountInvitation = null, sendLoginOtp = null, production = false, gradePolicy = { min: 0, max: 100, decimals: 2 } } = {}) {
  if (!jwtSecret || jwtSecret.length < 32) throw new Error('A strong JWT secret is required.')
  const app = express()
  const allowedOrigins = clientOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)

  app.disable('x-powered-by')
  if (production) app.set('trust proxy', 1)
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Request origin is not allowed by the server.'))
    },
    credentials: true,
  }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use('/api', healthRoutes)
  app.use('/api/auth', createAuthRoutes({ jwtSecret, production, sendLoginOtp }))
  app.use('/api/users', createUserRoutes(jwtSecret, sendAccountInvitation))
  app.use('/api/students', createProfileRoutes(jwtSecret, 'student'))
  app.use('/api/faculty', createProfileRoutes(jwtSecret, 'faculty'))
  app.use('/api/class-offerings', createOfferingRoutes(jwtSecret))
  app.use('/api/enrollments', createEnrollmentRoutes(jwtSecret))
  app.use('/api/grades', createGradeRoutes(jwtSecret, gradePolicy))
  app.use('/api/grade-correction-requests', createCorrectionRoutes(jwtSecret, gradePolicy))
  app.use('/api/audit-events', createAuditRoutes(jwtSecret))
  app.use('/api', createAcademicRoutes(jwtSecret))
  app.use(notFound)
  app.use(errorHandler)

  return app
}
