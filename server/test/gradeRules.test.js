import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateGrade } from '../src/services/gradeService.js'

const configured = [{ name: 'Quizzes', weight: 20 }, { name: 'Activities', weight: 30 }, { name: 'Exams', weight: 50 }]

test('missing component scores remain incomplete instead of becoming zero', () => {
  const result = calculateGrade([{ name: 'Quizzes', earnedScore: 85, maxScore: 100 }], configured, 2)
  assert.equal(result.calculatedGrade, null)
})

test('scores above their maximum and unknown components are rejected', () => {
  assert.throws(() => calculateGrade([{ name: 'Quizzes', earnedScore: 101, maxScore: 100 }], configured, 2), /Scores must be valid/)
  assert.throws(() => calculateGrade([{ name: 'Other', earnedScore: 50, maxScore: 100 }], configured, 2), /must match/)
})
