import bcrypt from 'bcryptjs'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { loadEnv } from '../config/env.js'
import User from '../models/User.js'
import { passwordSchema } from '../validators/passwordSchema.js'

async function main() {
  const env = loadEnv()
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD.')
  }
  const parsedPassword = passwordSchema.safeParse(password)
  if (!parsedPassword.success) throw new Error(parsedPassword.error.issues[0].message)

  await connectDatabase(env.MONGODB_URI, env.MONGODB_DB_NAME)
  const admins = await User.countDocuments({ role: 'admin' })
  if (admins > 0) throw new Error('An admin already exists. Use the admin account to create more users.')

  await User.create({ email, passwordHash: await bcrypt.hash(password, 12), role: 'admin', mustChangePassword: true })
  console.info(`Created initial admin account: ${email}`)
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(disconnectDatabase)
