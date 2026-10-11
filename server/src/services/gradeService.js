import ClassOffering from '../models/ClassOffering.js'
import Enrollment from '../models/Enrollment.js'
import Faculty from '../models/Faculty.js'

function invalid(message) {
  const error = new Error(message)
  error.status = 400
  throw error
}

export function validateOfficialGrade(value, policy) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < policy.min || value > policy.max) invalid(`Official grade must be between ${policy.min} and ${policy.max}.`)
}

const GRADE_SCALE = [[96, 4], [90, 3.5], [84, 3], [78, 2.5], [72, 2], [66, 1.5], [60, 1]]

export function percentToGradePoint(percent) {
  return GRADE_SCALE.find(([minimum]) => percent >= minimum)?.[1] ?? 0
}

export function calculateGrade(entered, configured, decimals) {
  const expected = new Map(configured.map((item) => [item.name.toLowerCase(), item]))
  const names = new Set()
  const components = entered.map((item) => {
    const key = item.name.toLowerCase()
    if (names.has(key) || !expected.has(key)) invalid('Grade components must match the offering configuration.')
    names.add(key)
    if (item.maxScore <= 0 || item.earnedScore < 0 || item.earnedScore > item.maxScore) invalid('Scores must be valid and earned score cannot exceed maximum score.')
    const definition = expected.get(key)
    return { name: definition.name, weight: definition.weight, earnedScore: item.earnedScore, maxScore: item.maxScore }
  })
  const totalWeight = configured.reduce((sum, item) => sum + item.weight, 0)
  const complete = configured.length > 0 && components.length === configured.length && Math.abs(totalWeight - 100) < 0.000001
  const calculatedGrade = complete
    ? Number(components.reduce((sum, item) => sum + (item.earnedScore / item.maxScore) * item.weight, 0).toFixed(decimals))
    : null
  return { components, calculatedGrade }
}

export async function facultyGradeContext(userId, enrollmentId) {
  const faculty = await Faculty.findOne({ userId, status: 'active' })
  const enrollment = await Enrollment.findById(enrollmentId)
  if (!faculty || !enrollment || enrollment.status !== 'approved') return null
  const offering = await ClassOffering.findById(enrollment.classOfferingId)
  if (!offering || String(offering.facultyId) !== faculty.id) return null
  return { enrollment, offering }
}

export async function gradeContext(enrollmentId) {
  const enrollment = await Enrollment.findById(enrollmentId)
  if (!enrollment) return null
  const offering = await ClassOffering.findById(enrollment.classOfferingId)
  return { enrollment, offering }
}
