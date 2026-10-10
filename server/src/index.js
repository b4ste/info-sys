import { createApp } from './app.js'
import { connectDatabase, disconnectDatabase } from './config/database.js'
import { loadEnv } from './config/env.js'
import { createResendInvitationSender } from './services/accountInvitation.js'

async function start() {
  const env = loadEnv()
  await connectDatabase(env.MONGODB_URI, env.MONGODB_DB_NAME)

  const sendAccountInvitation = env.RESEND_API_KEY && env.RESEND_FROM_EMAIL
    ? createResendInvitationSender({ apiKey: env.RESEND_API_KEY, senderEmail: env.RESEND_FROM_EMAIL, appUrl: env.CLIENT_ORIGIN })
    : null

  const server = createApp({ clientOrigin: env.CLIENT_ORIGIN, jwtSecret: env.JWT_SECRET, sendAccountInvitation, production: env.NODE_ENV === 'production', gradePolicy: { min: env.FINAL_GRADE_MIN, max: env.FINAL_GRADE_MAX, decimals: env.GRADE_DECIMALS } }).listen(env.PORT, () => {
    console.info(`SIS API listening on http://localhost:${env.PORT}`)
  })

  async function shutdown() {
    server.close(async () => {
      await disconnectDatabase()
      process.exit(0)
    })
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

start().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
