import { z } from 'zod'
import { objectId } from './academicSchemas.js'

const component = z.object({ name: z.string().trim().min(1).max(80), weight: z.number().min(0).max(100) }).strict()
const schedule = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  room: z.string().trim().max(80).optional(),
}).strict().refine((item) => item.startTime < item.endTime, 'End time must be after start time.')

export const offeringSchema = z.object({
  subjectId: objectId,
  academicTermId: objectId,
  programId: objectId,
  yearLevel: z.number().int().min(1).max(12),
  sectionId: objectId.optional(),
  facultyId: objectId,
  capacity: z.number().int().min(1),
  gradeComponents: z.array(component).optional(),
  schedule: z.array(schedule).optional(),
}).strict()

export const offeringStatusSchema = z.object({ status: z.enum(['open', 'closed', 'completed']) }).strict()
