import { randomBytes } from 'node:crypto'

export function generateTemporaryPassword() {
  return `${randomBytes(18).toString('base64url')}Aa!`
}

export function createResendInvitationSender({ apiKey, senderEmail, appUrl, fetchImpl = fetch }) {
  const loginUrl = new URL('/login', appUrl).toString()

  return async function sendAccountInvitation({ email, name, password }) {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Student Information System <${senderEmail}>`,
        to: [email],
        subject: 'Your Student Information System account',
        text: `Hello ${name},\n\nAn account has been created for you in the Student Information System.\n\nSign in: ${loginUrl}\nEmail: ${email}\nTemporary password: ${password}\n\nYou will be asked to change this password after signing in.\n`,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) throw new Error(`Email provider returned status ${response.status}.`)
  }
}
