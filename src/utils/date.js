export function parseDateInput(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const [, day, month, year] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() + 1 !== Number(month) || date.getUTCDate() !== Number(day)) return null
  return `${year}-${month}-${day}`
}

export function formatDate(value) {
  if (!value) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}
