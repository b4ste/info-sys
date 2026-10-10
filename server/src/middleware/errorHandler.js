export function notFound(request, _response, next) {
  const error = new Error(`Route not found: ${request.method} ${request.path}`)
  error.status = 404
  next(error)
}

export function errorHandler(error, _request, response, _next) {
  if (error.code === 11000) {
    return response.status(409).json({ success: false, error: { code: 'DUPLICATE_RECORD', message: 'A record with that unique value already exists.' } })
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input.' } })
  }
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
    ? error.status
    : 500

  response.status(status).json({
    success: false,
    error: {
      code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
      message: status === 500 ? 'An unexpected server error occurred.' : error.message,
    },
  })
}
