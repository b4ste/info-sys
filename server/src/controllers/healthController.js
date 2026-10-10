import mongoose from 'mongoose'

export function getHealth(_request, response) {
  response.json({
    success: true,
    data: {
      api: 'online',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    },
  })
}
