# Account invitation email

The Accounts page asks for a person's name, email address, and role. The server generates a six-character temporary password and submits an invitation email. The account becomes active only after Mailjet accepts the message. New users must change the temporary password after signing in.

The server uses [Mailjet's Send API v3.1](https://dev.mailjet.com/docs/email-api/send-api-v31/send-basic-email) over HTTPS. Set these environment variables on the **Render web service**:

| Key | Value |
| --- | --- |
| `MAILJET_API_KEY` | Mailjet API key (the public key, used as the API username) |
| `MAILJET_SECRET_KEY` | Secret key paired with that API key |
| `MAILJET_FROM_EMAIL` | Sender email address validated in Mailjet |
| `CLIENT_ORIGIN` | Exact production Vercel origin, such as `https://info-sys.vercel.app` |

In Mailjet, open **Account Settings → Senders & Domains**, add a sender address that you own, and click the confirmation link sent to it. Wait until the address shows **Active**. A domain is optional when validating one sender address, though a Gmail or other free email address can have poor delivery. See [Mailjet's sender guide](https://documentation.mailjet.com/hc/en-us/articles/360042759253-How-to-add-a-sender-address).

Find the API key and its paired secret key in Mailjet's API key management. Copy the secret when it is shown. Keep both keys on Render only; do not put them in Vercel, screenshots, or Git. For local development, use the ignored `.env` file.

After saving the Render variables, deploy the code. The old `BREVO_API_KEY` and `BREVO_FROM_EMAIL` variables are unused by the Mailjet code and can be removed from Render. You do not need an SMTP key or SMTP port.

To check the setup, create a test account with an email address you control. Check the inbox and spam folder, use the temporary password to sign in, and change it when prompted. If Mailjet rejects the API request, the account is deleted. Mailjet accepting a request does not guarantee final inbox delivery.
