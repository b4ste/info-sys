import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMailjetInvitationSender, generateTemporaryPassword } from '../src/services/accountInvitation.js'

test('generated temporary passwords are random and meet the password policy', () => {
  const first = generateTemporaryPassword()
  const second = generateTemporaryPassword()
  assert.notEqual(first, second)
  assert.equal(first.length, 6)
  assert.equal(second.length, 6)
  assert.match(first, /[A-Z]/)
  assert.match(first, /[a-z]/)
  assert.match(first, /[^A-Za-z0-9\s]/)
})

test('invitation sender submits the recipient and temporary password to Mailjet', async () => {
  let sent
  const send = createMailjetInvitationSender({
    apiKey: 'test-api-key',
    secretKey: 'test-secret-key',
    senderEmail: 'school@example.edu',
    appUrl: 'https://school.vercel.app',
    fetchImpl: async (url, options) => {
      sent = { url, options }
      return { ok: true, status: 200, json: async () => ({ Messages: [{ Status: 'success' }] }) }
    },
  })
  await send({ email: 'student@example.edu', name: 'Test Student', password: 'RandomAa!' })
  assert.equal(sent.url, 'https://api.mailjet.com/v3.1/send')
  assert.equal(sent.options.headers.Authorization, `Basic ${Buffer.from('test-api-key:test-secret-key').toString('base64')}`)
  const message = JSON.parse(sent.options.body).Messages[0]
  assert.deepEqual(message.From, { Name: 'Student Information System', Email: 'school@example.edu' })
  assert.equal(message.To[0].Email, 'student@example.edu')
  assert.match(message.TextPart, /https:\/\/school\.vercel\.app\/login/)
  assert.match(message.TextPart, /RandomAa!/)
  assert.match(message.HTMLPart, /RandomAa!/)
})

test('invitation sender rejects an unsuccessful provider response', async () => {
  const send = createMailjetInvitationSender({
    apiKey: 'test-api-key',
    secretKey: 'test-secret-key',
    senderEmail: 'school@example.edu',
    appUrl: 'https://school.vercel.app',
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ Messages: [{ Status: 'error', Errors: [{ ErrorCode: 'unauthorized', ErrorMessage: 'Key not found: test-secret-key' }] }] }),
    }),
  })
  await assert.rejects(
    send({ email: 'student@example.edu', name: 'Test Student', password: 'RandomAa!' }),
    (error) => error.message.includes('status 401: unauthorized: Key not found') && !error.message.includes('test-secret-key'),
  )
})

test('invitation sender rejects a Mailjet message error even with an HTTP success', async () => {
  const send = createMailjetInvitationSender({
    apiKey: 'test-api-key',
    secretKey: 'test-secret-key',
    senderEmail: 'school@example.edu',
    appUrl: 'https://school.vercel.app',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ Messages: [{ Status: 'error', Errors: [{ ErrorCode: 'mj-0001', ErrorMessage: 'Sender not validated' }] }] }),
    }),
  })
  await assert.rejects(
    send({ email: 'student@example.edu', name: 'Test Student', password: 'RandomAa!' }),
    /mj-0001: Sender not validated/,
  )
})
