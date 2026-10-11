import { formatDate } from './date.js'

function manilaDate(now) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function enrollmentWindowFromTerm(term, now = new Date()) {
  if (!term?.enrollmentStart || !term?.enrollmentEnd) {
    return { open: true, message: 'Enrollment dates are unavailable. Your request will be checked when submitted.' }
  }
  if (term.status && term.status !== 'active') return { open: false, message: 'The academic term is not active.' }
  const today = manilaDate(now)
  const start = term.enrollmentStart.slice(0, 10)
  const end = term.enrollmentEnd.slice(0, 10)
  if (today < start) return { open: false, message: `Enrollment opens on ${formatDate(start)}.` }
  if (today > end) return { open: false, message: `Enrollment closed on ${formatDate(end)}.` }
  return { open: true, message: `Enrollment is open through ${formatDate(end)}.` }
}
