import bcrypt from 'bcryptjs'
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import User from '../models/User.js'
import { passwordSchema } from '../validators/passwordSchema.js'

const loginSchema = z.object({ email: z.email(), password: z.string().min(1) })
const verifyOtpSchema = z.object({ challengeToken: z.string().regex(/^[a-f0-9]{64}$/), code: z.string().regex(/^\d{6}$/), rememberOtp: z.boolean().optional().default(false) })
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
})

const cookieName = 'sis_session'
const otpTrustCookieName = 'sis_otp_trust'
const maxFailedLogins = 5
const loginCooldownMs = 10 * 60 * 1000
const otpLifetimeMs = 10 * 60 * 1000
const maxOtpAttempts = 5
const otpTrustLifetimeMs = 60 * 60 * 1000

function challengeHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

function codeHash(secret, token, code) {
  return createHmac('sha256', secret).update(`${token}:${code}`).digest('hex')
}

function cookieOptions(production) {
  return { httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax', path: '/' }
}

function invalidInput(response, issues) {
  const message = Object.values(issues).flat()[0] ?? 'Invalid input.'
  return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message, details: issues } })
}

function lockedLogin(response, lockedUntil) {
  const seconds = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000))
  const minutes = Math.ceil(seconds / 60)
  response.set('Retry-After', String(seconds))
  return response.status(429).json({
    success: false,
    error: { code: 'ACCOUNT_LOCKED', message: `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` },
  })
}

export function createAuthController({ jwtSecret, production, sendLoginOtp }) {
  function issueSession(response, user) {
    const token = jwt.sign({ v: user.sessionVersion }, jwtSecret, { subject: user.id, expiresIn: '8h', algorithm: 'HS256' })
    response.cookie(cookieName, token, { ...cookieOptions(production), maxAge: 8 * 60 * 60 * 1000 })
  }

  function hasTrustedOtp(request, user) {
    const token = request.cookies?.[otpTrustCookieName]
    if (!token) return false
    try {
      const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'], audience: 'otp-trust' })
      return payload.sub === user.id
    } catch {
      return false
    }
  }

  return {
    async login(request, response) {
      const parsed = loginSchema.safeParse(request.body)
      if (!parsed.success) return invalidInput(response, parsed.error.flatten().fieldErrors)

      const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash +sessionVersion +failedLoginAttempts +loginLockedUntil')
      if (!user || user.status !== 'active') {
        return response.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } })
      }

      const now = new Date()
      if (user.loginLockedUntil && user.loginLockedUntil > now) return lockedLogin(response, user.loginLockedUntil)
      if (user.loginLockedUntil) {
        await User.updateOne(
          { _id: user.id, loginLockedUntil: { $lte: now } },
          { $set: { failedLoginAttempts: 0, loginLockedUntil: null } },
        )
      }

      // Reserve an attempt atomically so parallel requests cannot exceed the limit.
      const attempt = await User.findOneAndUpdate(
        { _id: user.id, status: 'active', loginLockedUntil: null, $or: [{ failedLoginAttempts: { $lt: maxFailedLogins } }, { failedLoginAttempts: { $exists: false } }] },
        { $inc: { failedLoginAttempts: 1 } },
        { new: true },
      ).select('+failedLoginAttempts +loginLockedUntil')
      if (!attempt) {
        const current = await User.findById(user.id).select('+loginLockedUntil')
        if (!current || current.status !== 'active') {
          return response.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } })
        }
        const lockedUntil = current.loginLockedUntil ?? new Date(Date.now() + loginCooldownMs)
        await User.updateOne({ _id: user.id, loginLockedUntil: null, failedLoginAttempts: { $gte: maxFailedLogins } }, { $set: { loginLockedUntil: lockedUntil } })
        return lockedLogin(response, lockedUntil)
      }

      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
      if (!valid) {
        if (attempt.failedLoginAttempts >= maxFailedLogins) {
          const lockedUntil = new Date(Date.now() + loginCooldownMs)
          await User.updateOne({ _id: user.id, loginLockedUntil: null }, { $set: { loginLockedUntil: lockedUntil } })
          return lockedLogin(response, lockedUntil)
        }
        const remaining = maxFailedLogins - attempt.failedLoginAttempts
        return response.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: `Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before a 10-minute lockout.` } })
      }

      await User.updateOne({ _id: user.id }, { $set: { failedLoginAttempts: 0, loginLockedUntil: null } })
      if (hasTrustedOtp(request, user)) {
        issueSession(response, user)
        return response.json({ success: true, data: { user: user.toJSON() } })
      }
      if (!sendLoginOtp) {
        return response.status(503).json({ success: false, error: { code: 'EMAIL_NOT_CONFIGURED', message: 'Sign-in email is not configured.' } })
      }

      const challengeToken = randomBytes(32).toString('hex')
      const code = randomInt(1_000_000).toString().padStart(6, '0')
      const hashedChallenge = challengeHash(challengeToken)
      await User.updateOne({ _id: user.id, status: 'active' }, { $set: {
        loginOtpChallengeHash: hashedChallenge,
        loginOtpCodeHash: codeHash(jwtSecret, challengeToken, code),
        loginOtpExpiresAt: new Date(Date.now() + otpLifetimeMs),
        loginOtpAttempts: 0,
      } })
      try {
        await sendLoginOtp({ email: user.email, code })
      } catch (error) {
        console.error('Sign-in code email failed:', error.message)
        await User.updateOne({ _id: user.id, loginOtpChallengeHash: hashedChallenge }, { $unset: { loginOtpChallengeHash: '', loginOtpCodeHash: '', loginOtpExpiresAt: '' }, $set: { loginOtpAttempts: 0 } })
        return response.status(502).json({ success: false, error: { code: 'OTP_EMAIL_FAILED', message: 'The sign-in code could not be emailed. Please try again.' } })
      }
      return response.json({ success: true, data: { otpRequired: true, challengeToken, email: user.email } })
    },
    async verifyOtp(request, response) {
      const parsed = verifyOtpSchema.safeParse(request.body)
      if (!parsed.success) return invalidInput(response, parsed.error.flatten().fieldErrors)
      const { challengeToken, code, rememberOtp } = parsed.data
      const hashedChallenge = challengeHash(challengeToken)
      const user = await User.findOne({ loginOtpChallengeHash: hashedChallenge, status: 'active' })
        .select('+loginOtpCodeHash +loginOtpExpiresAt +loginOtpAttempts +sessionVersion')
      if (!user) {
        return response.status(400).json({ success: false, error: { code: 'OTP_INVALID', message: 'This sign-in code is no longer valid. Sign in again.' } })
      }
      if (!user.loginOtpCodeHash || !user.loginOtpExpiresAt || user.loginOtpExpiresAt <= new Date()) {
        await User.updateOne({ _id: user.id, loginOtpChallengeHash: hashedChallenge }, { $unset: { loginOtpChallengeHash: '', loginOtpCodeHash: '', loginOtpExpiresAt: '' }, $set: { loginOtpAttempts: 0 } })
        return response.status(400).json({ success: false, error: { code: 'OTP_EXPIRED', message: 'The sign-in code expired. Sign in again to get a new one.' } })
      }
      const expected = Buffer.from(codeHash(jwtSecret, challengeToken, code), 'hex')
      const actual = Buffer.from(user.loginOtpCodeHash, 'hex')
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        const attempt = await User.findOneAndUpdate(
          { _id: user.id, loginOtpChallengeHash: hashedChallenge, loginOtpAttempts: { $lt: maxOtpAttempts } },
          { $inc: { loginOtpAttempts: 1 } },
          { new: true },
        ).select('+loginOtpAttempts')
        const remaining = maxOtpAttempts - (attempt?.loginOtpAttempts ?? maxOtpAttempts)
        if (remaining <= 0) {
          await User.updateOne({ _id: user.id, loginOtpChallengeHash: hashedChallenge }, { $unset: { loginOtpChallengeHash: '', loginOtpCodeHash: '', loginOtpExpiresAt: '' }, $set: { loginOtpAttempts: 0 } })
          return response.status(429).json({ success: false, error: { code: 'OTP_LOCKED', message: 'Too many wrong codes. Sign in again to get a new code.' } })
        }
        return response.status(401).json({ success: false, error: { code: 'OTP_INCORRECT', message: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` } })
      }
      const verified = await User.findOneAndUpdate(
        { _id: user.id, status: 'active', loginOtpChallengeHash: hashedChallenge, loginOtpCodeHash: user.loginOtpCodeHash, loginOtpExpiresAt: { $gt: new Date() }, loginOtpAttempts: { $lt: maxOtpAttempts } },
        { $unset: { loginOtpChallengeHash: '', loginOtpCodeHash: '', loginOtpExpiresAt: '' }, $set: { loginOtpAttempts: 0 } },
        { new: true },
      ).select('+sessionVersion')
      if (!verified) {
        return response.status(400).json({ success: false, error: { code: 'OTP_INVALID', message: 'This sign-in code is no longer valid. Sign in again.' } })
      }
      issueSession(response, verified)
      if (rememberOtp) {
        const trustToken = jwt.sign({}, jwtSecret, { subject: verified.id, audience: 'otp-trust', expiresIn: '1h', algorithm: 'HS256' })
        response.cookie(otpTrustCookieName, trustToken, { ...cookieOptions(production), maxAge: otpTrustLifetimeMs })
      }
      return response.json({ success: true, data: { user: verified.toJSON() } })
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
      user.failedLoginAttempts = 0
      user.loginLockedUntil = null
      await user.save()
      issueSession(response, user)
      return response.json({ success: true, data: { user: user.toJSON() } })
    },
  }
}
