export const resourceConfig = {
  departments: { title: 'Departments', fields: [{ name: 'name', label: 'Name' }] },
  programs: { title: 'Programs and year levels', fields: [{ name: 'departmentId', label: 'Department', source: 'departments' }, { name: 'code', label: 'Code' }, { name: 'name', label: 'Name' }, { name: 'yearLevels', label: 'Year levels (comma separated)', type: 'yearLevels' }] },
  sections: { title: 'Sections', fields: [{ name: 'programId', label: 'Program', source: 'programs' }, { name: 'yearLevel', label: 'Year level', type: 'programYearLevel' }, { name: 'academicTermId', label: 'Term', source: 'academic-terms' }, { name: 'name', label: 'Name' }, { name: 'capacity', label: 'Capacity', type: 'number', optional: true }] },
  subjects: { title: 'Subject catalog', fields: [{ name: 'code', label: 'Code' }, { name: 'name', label: 'Name' }, { name: 'description', label: 'Description', optional: true }, { name: 'units', label: 'Units', type: 'number' }] },
  'academic-terms': { title: 'Academic terms', fields: [{ name: 'academicYear', label: 'Academic year' }, { name: 'termNumber', label: 'Term number', type: 'term' }, { name: 'startDate', label: 'Start date', type: 'date' }, { name: 'endDate', label: 'End date', type: 'date' }, { name: 'enrollmentStart', label: 'Enrollment opens', type: 'date' }, { name: 'enrollmentEnd', label: 'Enrollment closes', type: 'date' }] },
}

export function referenceLabel(source, item) {
  if (!item) return '—'
  if (source === 'academic-terms') return `${item.academicYear} · Term ${item.termNumber}`
  if (source === 'faculty') return `${item.firstName} ${item.lastName} (${item.employeeNumber})`
  if (source === 'users') return `${item.email} (${item.role})`
  if (source === 'departments') return item.name
  return `${item.code ? `${item.code} · ` : ''}${item.name ?? ''}`
}
