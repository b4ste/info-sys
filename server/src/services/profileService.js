import Department from '../models/Department.js'
import Program from '../models/Program.js'
import Section from '../models/Section.js'
import User from '../models/User.js'

function invalid(message) {
  const error = new Error(message)
  error.status = 400
  throw error
}

export async function validateProfile(kind, data) {
  const account = await User.findById(data.userId)
  if (!account || account.role !== kind) invalid(`A ${kind} account is required.`)

  if (kind === 'student') {
    const program = await Program.findById(data.programId)
    if (!program || program.status !== 'active' || (data.yearLevel !== 'irregular' && !program.yearLevels.includes(data.yearLevel))) invalid('Program and year level must be valid and active.')
    if (data.sectionId) {
      const section = await Section.findById(data.sectionId)
      if (!section || section.status !== 'active' || String(section.programId) !== String(data.programId) || section.yearLevel !== data.yearLevel) invalid('Section must match the student program and year level.')
    }
  } else {
    const department = await Department.findById(data.departmentId)
    if (!department || department.status !== 'active') invalid('Department must be active.')
  }
}
