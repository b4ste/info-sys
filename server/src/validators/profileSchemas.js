import { z } from 'zod'
import { objectId } from './academicSchemas.js'

const name = z.string().trim().min(1).max(100)
const contact = z.email()
const status = z.enum(['active', 'inactive'])

export const studentSchema = z.object({
  userId: objectId,
  studentNumber: z.string().trim().min(1).max(40),
  firstName: name,
  middleName: name.optional(),
  lastName: name,
  birthDate: z.coerce.date().optional(),
  contactEmail: contact,
  phone: z.string().trim().max(40).optional(),
  programId: objectId,
  yearLevel: z.number().int().min(1).max(12),
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

export const studentSelfSchema = studentSchema.pick({ contactEmail: true, phone: true }).partial()
export const facultySelfSchema = facultySchema.pick({ contactEmail: true }).partial()
