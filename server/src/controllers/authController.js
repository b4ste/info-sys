import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import User from '../models/User.js'
import { passwordSchema } from '../validators/passwordSchema.js'

const loginSchema = z.object({ email: z.email(), password: z.string().min(1) })
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
})

const cookieName = 'sis_session'

function cookieOptions(production) {
  return { httpOnly: true, secure: production, sameSite: 'lax', path: '/' }
}

function invalidInput(response, issues) {
  const message = Object.values(issues).flat()[0] ?? 'Invalid input.'
  return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message, details: issues } })
}

export function createAuthController({ jwtSecret, production }) {
  function issueSession(response, user) {
    const token = jwt.sign({ v: user.sessionVersion }, jwtSecret, { subject: user.id, expiresIn: '8h', algorithm: 'HS256' })
    response.cookie(cookieName, token, { ...cookieOptions(production), maxAge: 8 * 60 * 60 * 1000 })
  }

  return {
    async login(request, response) {
      const parsed = loginSchema.safeParse(request.body)
      if (!parsed.success) return invalidInput(response, parsed.error.flatten().fieldErrors)

      const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash +sessionVersion')
      const valid = user && await bcrypt.compare(parsed.data.password, user.passwordHash)
      if (!valid || user.status !== 'active') {
        return response.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } })
      }

      issueSession(response, user)
      return response.json({ success: true, data: { user: user.toJSON() } })
    },
    async logout(request, response) {
      await User.updateOne({ _id: request.user.id }, { $inc: { sessionVersion: 1 } })
      response.clearCookie(cookieName, cookieOptions(production))
      return response.json({ success: true, data: { message: 'Signed out.' } })
    },
    me(request, response) {
      return response.json({ success: true, data: { user: request.user.toJSON() } })
    },
    async changePassword(request, response) {
      const parsed = changePasswordSchema.safeParse(request.body)
      if (!parsed.success) return invalidInput(response, parsed.error.flatten().fieldErrors)
      const user = await User.findById(request.user.id).select('+passwordHash +sessionVersion')
      if (!await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)) {
        return response.status(400).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect.' } })
      }
      user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
      user.mustChangePassword = false
      user.sessionVersion += 1
      await user.save()
      issueSession(response, user)
      return response.json({ success: true, data: { user: user.toJSON() } })
    },
  }
}
