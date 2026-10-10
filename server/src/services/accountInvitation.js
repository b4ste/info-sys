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

function createMailjetSender({ apiKey, secretKey, senderEmail, fetchImpl = fetch }) {
  const authorization = `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString('base64')}`

  return async function sendEmail({ email, subject, textContent, htmlContent }) {
    const response = await fetchImpl('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { Authorization: authorization, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        Messages: [{
          From: { Name: 'Student Information System', Email: senderEmail },
          To: [{ Email: email }],
          Subject: subject,
          TextPart: textContent,
          HTMLPart: htmlContent,
        }],
      }),
      signal: AbortSignal.timeout(15000),
    })

    const result = typeof response.json === 'function'
      ? await response.json().catch(() => null)
      : null
    if (!response.ok || result?.Messages?.[0]?.Status !== 'success') {
      const providerError = result?.Messages?.[0]?.Errors?.[0] ?? result
      const detail = [providerError?.ErrorCode ?? providerError?.ErrorIdentifier, providerError?.ErrorMessage ?? providerError?.message]
        .filter((value) => typeof value === 'string' || typeof value === 'number')
        .join(': ')
        .split(apiKey).join('[redacted]')
        .split(secretKey).join('[redacted]')
        .split(authorization).join('[redacted]')
        .slice(0, 300)
      throw new Error(`Mailjet returned status ${response.status}${detail ? `: ${detail}` : ''}.`)
    }
  }
}

export function createMailjetInvitationSender(options) {
  const sendEmail = createMailjetSender(options)
  const loginUrl = new URL('/login', options.appUrl).toString()

  return async function sendAccountInvitation({ email, name, password }) {
    await sendEmail({
      email,
      subject: 'Your Student Information System account',
      textContent: `Hello ${name},\n\nAn account has been created for you in the Student Information System.\n\nSign in: ${loginUrl}\nEmail: ${email}\nTemporary password: ${password}\n\nYou will be asked to change this password after signing in.\n`,
      htmlContent: `<p>Hello ${escapeHtml(name)},</p><p>An account has been created for you in the Student Information System.</p><p><a href="${escapeHtml(loginUrl)}">Sign in</a><br>Email: ${escapeHtml(email)}<br>Temporary password: <strong>${escapeHtml(password)}</strong></p><p>You will be asked to change this password after signing in.</p>`,
    })
  }
}

export function createMailjetOtpSender(options) {
  const sendEmail = createMailjetSender(options)

  return async function sendLoginOtp({ email, code }) {
    await sendEmail({
      email,
      subject: 'Your Student Information System sign-in code',
      textContent: `Your sign-in code is ${code}. It expires in 10 minutes. If you did not try to sign in, ignore this email.`,
      htmlContent: `<p>Your sign-in code is <strong>${escapeHtml(code)}</strong>.</p><p>It expires in 10 minutes. If you did not try to sign in, ignore this email.</p>`,
    })
  }
}
