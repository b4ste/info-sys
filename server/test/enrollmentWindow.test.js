import assert from 'node:assert/strict'
import { test } from 'node:test'
import { enrollmentWindow } from '../src/services/enrollmentWindow.js'

const term = {
  status: 'active',
  enrollmentStart: new Date('2026-10-01T00:00:00.000Z'),
  enrollmentEnd: new Date('2026-10-11T00:00:00.000Z'),
}

test('enrollment remains open through the closing calendar day in Manila', () => {
  const result = enrollmentWindow(term, new Date('2026-10-11T15:59:59.000Z'))
  assert.equal(result.open, true)
  assert.match(result.message, /11\/10\/2026/)
})

test('enrollment closes after the closing calendar day in Manila', () => {
  const result = enrollmentWindow(term, new Date('2026-10-11T16:00:00.000Z'))
  assert.equal(result.open, false)
  assert.match(result.message, /closed on 11\/10\/2026/)
})

test('enrollment shows the opening date before the window starts', () => {
  const result = enrollmentWindow(term, new Date('2026-09-30T15:59:59.000Z'))
  assert.equal(result.open, false)
  assert.match(result.message, /opens on 01\/10\/2026/)
})
