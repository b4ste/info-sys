import { z } from 'zod'

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID.')
const status = z.enum(['active', 'inactive'])
const code = z.string().trim().min(1).max(30)
const name = z.string().trim().min(1).max(160)
const yearLevel = z.number().int().min(1).max(12)

export const academicSchemas = {
  departments: z.object({ code: code.optional(), name, status: status.optional() }).strict(),
  programs: z.object({ departmentId: objectId, code, name, yearLevels: z.array(yearLevel).min(1), status: status.optional() }).strict(),
  sections: z.object({ programId: objectId, yearLevel, academicTermId: objectId, name, status: status.optional() }).strict(),
  subjects: z.object({ departmentId: objectId, code, name, description: z.string().trim().max(2000).optional(), units: z.number().min(0).max(30), status: status.optional() }).strict(),
  'academic-terms': z.object({
    academicYear: z.string().trim().min(4).max(30),
    termNumber: z.number().int().min(1).max(3),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    enrollmentStart: z.coerce.date(),
    enrollmentEnd: z.coerce.date(),
  }).strict(),
}
