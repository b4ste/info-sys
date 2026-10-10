import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBrevoInvitationSender, generateTemporaryPassword } from '../src/services/accountInvitation.js'

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

test('invitation sender submits the recipient and temporary password to Brevo', async () => {
  let sent
  const send = createBrevoInvitationSender({
    apiKey: 'test-api-key',
    senderEmail: 'school@example.edu',
    appUrl: 'https://school.vercel.app',
    fetchImpl: async (url, options) => {
      sent = { url, options }
      return { ok: true, status: 201 }
    },
  })
  await send({ email: 'student@example.edu', name: 'Test Student', password: 'RandomAa!' })
  assert.equal(sent.url, 'https://api.brevo.com/v3/smtp/email')
  assert.equal(sent.options.headers['api-key'], 'test-api-key')
  const message = JSON.parse(sent.options.body)
  assert.deepEqual(message.sender, { name: 'Student Information System', email: 'school@example.edu' })
  assert.equal(message.to[0].email, 'student@example.edu')
  assert.match(message.textContent, /https:\/\/school\.vercel\.app\/login/)
  assert.match(message.textContent, /RandomAa!/)
  assert.match(message.htmlContent, /RandomAa!/)
})

test('invitation sender rejects an unsuccessful provider response', async () => {
  const send = createBrevoInvitationSender({
    apiKey: 'test-api-key',
    senderEmail: 'school@example.edu',
    appUrl: 'https://school.vercel.app',
    fetchImpl: async () => ({ ok: false, status: 401 }),
  })
  await assert.rejects(send({ email: 'student@example.edu', name: 'Test Student', password: 'RandomAa!' }), /status 401/)
})
