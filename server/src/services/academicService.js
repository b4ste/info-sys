import AcademicTerm from '../models/AcademicTerm.js'
import CurriculumRule from '../models/CurriculumRule.js'
import Department from '../models/Department.js'
import Program from '../models/Program.js'
import Section from '../models/Section.js'
import Subject from '../models/Subject.js'
import AuditEvent from '../models/AuditEvent.js'

export const academicModels = {
  departments: Department,
  programs: Program,
  sections: Section,
  subjects: Subject,
  'curriculum-rules': CurriculumRule,
  'academic-terms': AcademicTerm,
}

function invalid(message) {
  const error = new Error(message)
  error.status = 400
  throw error
}

async function requireActive(Model, id, label) {
  const record = await Model.findById(id)
  if (!record || record.status === 'inactive') invalid(`${label} must exist and be active.`)
  return record
}

export async function validateAcademicRelationship(resource, data) {
  if (resource === 'programs') await requireActive(Department, data.departmentId, 'Department')
  if (resource === 'sections' || resource === 'curriculum-rules') {
    const program = await requireActive(Program, data.programId, 'Program')
    if (!program.yearLevels.includes(data.yearLevel)) invalid('Year level is not offered by this program.')
  }
  if (resource === 'sections') {
    const term = await AcademicTerm.findById(data.academicTermId)
    if (!term || term.status === 'completed') invalid('Section requires a current or upcoming term.')
  }
  if (resource === 'curriculum-rules') {
    await requireActive(Subject, data.subjectId, 'Subject')
    if (data.effectiveFromTermId && !await AcademicTerm.exists({ _id: data.effectiveFromTermId })) invalid('Effective term does not exist.')
  }
}

export async function audit(actorId, action, entityType, entityId, details = {}) {
  await AuditEvent.create({ actorId, action, entityType, entityId, details })
}

export async function activateTerm(term, actorId) {
  if (term.status === 'completed') invalid('A completed term cannot be activated.')
  if (term.status === 'active') return term
  const active = await AcademicTerm.exists({ status: 'active' })
  if (active) invalid('Complete the active term before activating another.')
  term.status = 'active'
  await term.save()
  await audit(actorId, 'term.activated', 'AcademicTerm', term.id)
  return term
}

export async function completeTerm(term, actorId) {
  if (term.status !== 'active') invalid('Only an active term can be completed.')
  term.status = 'completed'
  await term.save()
  await audit(actorId, 'term.completed', 'AcademicTerm', term.id)
  return term
}
