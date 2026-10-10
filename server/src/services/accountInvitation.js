import { randomInt } from 'node:crypto'

const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const lowercase = 'abcdefghijkmnopqrstuvwxyz'
const digits = '23456789'
const special = '!@#$%&*?'
const allCharacters = uppercase + lowercase + digits + special

function pick(characters) {
  return characters[randomInt(characters.length)]
}

export function generateTemporaryPassword() {
  const characters = [pick(uppercase), pick(lowercase), pick(special)]
  while (characters.length < 6) characters.push(pick(allCharacters))
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    const character = characters[index]
    characters[index] = characters[swapIndex]
    characters[swapIndex] = character
  }
  return characters.join('')
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

    if (!response.ok) {
      const providerError = typeof response.json === 'function'
        ? await response.json().catch(() => null)
        : null
      const detail = [providerError?.code, providerError?.message]
        .filter((value) => typeof value === 'string')
        .join(': ')
        .replaceAll(apiKey, '[redacted]')
        .replace(/xkeysib-[A-Za-z0-9-]+/g, '[redacted]')
        .slice(0, 300)
      throw new Error(`Email provider returned status ${response.status}${detail ? `: ${detail}` : ''}.`)
    }
  }
}
