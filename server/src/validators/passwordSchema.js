import { z } from 'zod'

export const passwordSchema = z.string().max(128).refine(
  (value) => /[A-Z]/.test(value) && /[a-z]/.test(value) && /[^A-Za-z0-9\s]/.test(value),
  'Password needs an uppercase letter, a lowercase letter, and a special character.',
)
