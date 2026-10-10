import { randomBytes } from 'node:crypto'

export function generateTemporaryPassword() {
  return `${randomBytes(18).toString('base64url')}Aa!`
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

export function createBrevoInvitationSender({ apiKey, senderEmail, appUrl, fetchImpl = fetch }) {
  const loginUrl = new URL('/login', appUrl).toString()

  return async function sendAccountInvitation({ email, name, password }) {
    const textContent = `Hello ${name},\n\nAn account has been created for you in the Student Information System.\n\nSign in: ${loginUrl}\nEmail: ${email}\nTemporary password: ${password}\n\nYou will be asked to change this password after signing in.\n`
    const response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Student Information System', email: senderEmail },
        to: [{ email }],
        subject: 'Your Student Information System account',
        textContent,
        htmlContent: `<p>Hello ${escapeHtml(name)},</p><p>An account has been created for you in the Student Information System.</p><p><a href="${escapeHtml(loginUrl)}">Sign in</a><br>Email: ${escapeHtml(email)}<br>Temporary password: <strong>${escapeHtml(password)}</strong></p><p>You will be asked to change this password after signing in.</p>`,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) throw new Error(`Email provider returned status ${response.status}.`)
  }
}
