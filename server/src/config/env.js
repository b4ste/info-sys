import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) })

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().trim().min(1).default('student_infosys'),
  CLIENT_ORIGIN: z.url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  FINAL_GRADE_MIN: z.coerce.number().default(0),
  FINAL_GRADE_MAX: z.coerce.number().default(100),
  GRADE_DECIMALS: z.coerce.number().int().min(0).max(4).default(2),
})

export function loadEnv(source = process.env) {
  const parsed = schema.safeParse(source)

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    throw new Error(`Invalid server configuration: ${details.join('; ')}`)
  }

  if (parsed.data.FINAL_GRADE_MIN >= parsed.data.FINAL_GRADE_MAX) {
    throw new Error('Invalid server configuration: FINAL_GRADE_MAX must exceed FINAL_GRADE_MIN')
  }

  return parsed.data
}
