const SCALE = [[96, 4], [90, 3.5], [84, 3], [78, 2.5], [72, 2], [66, 1.5], [60, 1]]

// Mirrors the NU grade-point table used by the server.
export function percentToGradePoint(percent) {
  return SCALE.find(([minimum]) => percent >= minimum)?.[1] ?? 0
}

export function formatGradePoint(value) {
  return value == null ? '—' : Number(value).toFixed(1)
}
