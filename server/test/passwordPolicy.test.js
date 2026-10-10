import assert from 'node:assert/strict'
import { test } from 'node:test'
import { passwordSchema } from '../src/validators/passwordSchema.js'

test('short passwords are allowed when they contain all three required character types', () => {
  assert.equal(passwordSchema.safeParse('Aa!').success, true)
})

test('each required character type is enforced', () => {
  for (const value of ['aa!', 'AA!', 'Aa1']) {
    assert.equal(passwordSchema.safeParse(value).success, false)
  }
})
