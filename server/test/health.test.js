import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createApp } from '../src/app.js'

let server
let baseUrl

before(async () => {
  server = createApp({ jwtSecret: 'a-test-secret-that-is-long-enough-for-tests' }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

test('health endpoint returns the API and database state', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.data.api, 'online')
  assert.equal(body.data.database, 'disconnected')
})

test('unknown routes use the consistent error format', async () => {
  const response = await fetch(`${baseUrl}/api/missing`)
  const body = await response.json()

  assert.equal(response.status, 404)
  assert.deepEqual(body, {
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found: GET /api/missing' },
  })
})
