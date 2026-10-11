import assert from 'node:assert/strict'
import { test } from 'node:test'
import { enrollmentWindowFromTerm } from '../../src/utils/enrollmentWindow.js'

const term = {
  status: 'active',
  enrollmentStart: '2026-10-01T00:00:00.000Z',
  enrollmentEnd: '2026-10-11T00:00:00.000Z',
}

test('browse classes keeps enrollment available through the final Manila date', () => {
  assert.equal(enrollmentWindowFromTerm(term, new Date('2026-10-11T15:59:59.000Z')).open, true)
  assert.equal(enrollmentWindowFromTerm(term, new Date('2026-10-11T16:00:00.000Z')).open, false)
})

test('browse classes does not disable a request solely because an older API omitted dates', () => {
  assert.equal(enrollmentWindowFromTerm(null).open, true)
})
