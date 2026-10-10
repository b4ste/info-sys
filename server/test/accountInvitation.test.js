import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createResendInvitationSender, generateTemporaryPassword } from '../src/services/accountInvitation.js'

test('generated temporary passwords are random and meet the password policy', () => {
  const first = generateTemporaryPassword()
  const second = generateTemporaryPassword()
  assert.notEqual(first, second)
  assert.match(first, /[A-Z]/)
  assert.match(first, /[a-z]/)
  assert.match(first, /[^A-Za-z0-9\s]/)
})

test('invitation sender submits the recipient and temporary password to Resend', async () => {
  let sent
  const send = createResendInvitationSender({
    apiKey: 'test-api-key',
    senderEmail: 'school@example.edu',
    appUrl: 'https://school.vercel.app',
    fetchImpl: async (url, options) => {
      sent = { url, options }
      return { ok: true, status: 201 }
    },
  })
  await send({ email: 'student@example.edu', name: 'Test Student', password: 'RandomAa!' })
  assert.equal(sent.url, 'https://api.resend.com/emails')
  assert.equal(sent.options.headers.Authorization, 'Bearer test-api-key')
  const message = JSON.parse(sent.options.body)
  assert.equal(message.from, 'Student Information System <school@example.edu>')
  assert.equal(message.to[0], 'student@example.edu')
  assert.match(message.text, /https:\/\/school\.vercel\.app\/login/)
  assert.match(message.text, /RandomAa!/)
})

test('invitation sender rejects an unsuccessful provider response', async () => {
  const send = createResendInvitationSender({
    apiKey: 'test-api-key',
    senderEmail: 'school@example.edu',
    appUrl: 'https://school.vercel.app',
    fetchImpl: async () => ({ ok: false, status: 401 }),
  })
  await assert.rejects(send({ email: 'student@example.edu', name: 'Test Student', password: 'RandomAa!' }), /status 401/)
})
