import AcademicTerm from '../models/AcademicTerm.js'
import ClassOffering from '../models/ClassOffering.js'
import Faculty from '../models/Faculty.js'
import Program from '../models/Program.js'
import Section from '../models/Section.js'
import Subject from '../models/Subject.js'
import Grade from '../models/Grade.js'
import Enrollment from '../models/Enrollment.js'

function invalid(message) {
  const error = new Error(message)
  error.status = 400
  throw error
}

export async function validateOffering(data, existing = null) {
  const [subject, term, program, faculty] = await Promise.all([
    Subject.findById(data.subjectId),
    AcademicTerm.findById(data.academicTermId),
    Program.findById(data.programId),
    Faculty.findById(data.facultyId),
  ])
  if (!subject || subject.status !== 'active') invalid('Subject must be active.')
  if (!term || term.status === 'completed') invalid('Term must be upcoming or active.')
  if (!program || program.status !== 'active' || !program.yearLevels.includes(data.yearLevel)) invalid('Program and year level must be valid.')
  if (!existing && String(subject.departmentId ?? '') !== String(program.departmentId)) invalid('Subject must belong to the selected program department.')
  if (!faculty || faculty.status !== 'active') invalid('Assigned faculty must be active.')
  if ((!existing || String(existing.facultyId) !== String(data.facultyId)) && String(faculty.departmentId) !== String(program.departmentId)) invalid('Assigned faculty must belong to the selected program department.')
  if (data.sectionId) {
    const section = await Section.findById(data.sectionId)
    if (!section || section.status !== 'active' || String(section.programId) !== String(data.programId) || section.yearLevel !== data.yearLevel || String(section.academicTermId) !== String(data.academicTermId)) invalid('Section must match the offering program, year level, and term.')
  }
  if (data.capacity < (existing?.enrollmentCount ?? 0)) invalid('Capacity cannot be below approved enrollment count.')
  if (data.gradeComponents?.length) {
    const names = data.gradeComponents.map((item) => item.name.toLowerCase())
    if (new Set(names).size !== names.length) invalid('Grade component names must be unique.')
    const total = data.gradeComponents.reduce((sum, item) => sum + item.weight, 0)
    if (Math.abs(total - 100) > 0.000001) invalid('Grade component weights must total 100%.')
  }
  if (existing) {
    const locked = ['subjectId', 'academicTermId', 'programId', 'yearLevel', 'sectionId']
    const changed = locked.some((field) => String(existing[field] ?? '') !== String(data[field] ?? ''))
    if (changed) invalid('Offering academic details cannot be changed. Create a new offering instead.')
    if (String(existing.facultyId) !== String(data.facultyId) && await Grade.exists({ enrollmentId: { $in: await Enrollment.find({ classOfferingId: existing.id }).distinct('_id') } })) invalid('Assigned faculty cannot change after grade entry begins.')
    if (data.gradeComponents && await Grade.exists({ enrollmentId: { $in: await Enrollment.find({ classOfferingId: existing.id }).distinct('_id') } })) invalid('Grade components cannot change after grade entry begins.')
  }
}

export async function facultyOwnsOffering(userId, offering) {
  const faculty = await Faculty.findOne({ userId })
  return faculty && String(faculty.id) === String(offering.facultyId)
}

export async function studentEligibleOfferings(userId) {
  const Student = (await import('../models/Student.js')).default
  const student = await Student.findOne({ userId, status: 'active' })
  if (!student) return []
  const active = await AcademicTerm.findOne({ status: 'active' })
  if (!active) return []
  return ClassOffering.find({ programId: student.programId, ...(student.yearLevel === 'irregular' ? {} : { yearLevel: student.yearLevel }), academicTermId: active.id, status: 'open' })
}
