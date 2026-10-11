const schoolTimeZone = 'Asia/Manila'

function schoolDate(now) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: schoolTimeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${value.year}-${value.month}-${value.day}`
}

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10)
}

function displayDate(value) {
  const [year, month, day] = dateKey(value).split('-')
  return `${day}/${month}/${year}`
}

export function enrollmentWindow(term, now = new Date()) {
  if (!term || term.status !== 'active') return { open: false, message: 'The academic term is not active.' }
  const today = schoolDate(now)
  if (today < dateKey(term.enrollmentStart)) return { open: false, message: `Enrollment opens on ${displayDate(term.enrollmentStart)}.` }
  if (today > dateKey(term.enrollmentEnd)) return { open: false, message: `Enrollment closed on ${displayDate(term.enrollmentEnd)}.` }
  return { open: true, message: `Enrollment is open through ${displayDate(term.enrollmentEnd)}.` }
}
