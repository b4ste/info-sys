import { z } from 'zod'
import { objectId } from './academicSchemas.js'

const name = z.string().trim().min(1).max(100)
const contact = z.email()
const status = z.enum(['active', 'inactive'])

export const studentSchema = z.object({
  userId: objectId,
  studentNumber: z.string().trim().regex(/^\d{4}-\d{6}$/, 'Student number must use the format 0000-000000.'),
  firstName: name,
  middleName: name.nullable().optional(),
  lastName: name,
  birthDate: z.coerce.date().optional().refine((value) => !value || value <= new Date(), 'Birth date cannot be in the future.'),
  contactEmail: contact,
  phone: z.string().trim().regex(/^(?:\+639\d{9}|09\d{9})$/, 'Enter a Philippine mobile number as +639XXXXXXXXX or 09XXXXXXXXX.').transform((value) => value.startsWith('09') ? `+63${value.slice(1)}` : value).optional(),
  programId: objectId,
  yearLevel: z.union([z.number().int().min(1).max(12), z.literal('irregular')]),
  sectionId: objectId.nullable().optional(),
  status: status.optional(),
}).strict()

export const facultySchema = z.object({
  userId: objectId,
  employeeNumber: z.string().trim().min(1).max(40),
  firstName: name,
  lastName: name,
  departmentId: objectId,
  contactEmail: contact,
  status: status.optional(),
}).strict()

export const facultySelfSchema = facultySchema.pick({ contactEmail: true }).partial()
