import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export function requireAuth(secret) {
  return async (request, response, next) => {
    const token = request.cookies?.sis_session
    if (!token) return response.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } })

    try {
      const payload = jwt.verify(token, secret, { algorithms: ['HS256'] })
      const user = await User.findById(payload.sub).select('+sessionVersion')
      if (!user || user.status !== 'active' || payload.v !== user.sessionVersion) {
        return response.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'This session is no longer active.' } })
      }
      const allowedBeforeChange = ['/api/auth/me', '/api/auth/logout', '/api/auth/change-password']
      if (user.mustChangePassword && !allowedBeforeChange.includes(request.originalUrl.split('?')[0])) {
        return response.status(403).json({ success: false, error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'Change your temporary password to continue.' } })
      }
      request.user = user
      next()
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return response.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } })
      }
      next(error)
    }
  }
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!roles.includes(request.user.role)) {
      return response.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot access this resource.' } })
    }
    next()
  }
}
