# Account invitation email

The Accounts page asks for a person's name, email address, and role. The server generates a random temporary password and submits an invitation email. The account becomes active only after the email service accepts the message. New users must change their temporary password after signing in.

The API uses [Brevo's transactional email API](https://developers.brevo.com/reference/send-transac-email) over HTTPS. On the Render web service, set these environment variables:

| Key | Value |
| --- | --- |
| `BREVO_API_KEY` | API key from your Brevo account (not an SMTP key) |
| `BREVO_FROM_EMAIL` | Sender email address registered and verified in Brevo |
| `CLIENT_ORIGIN` | Exact production Vercel origin, such as `https://your-site.vercel.app`, without a trailing slash |

In Brevo, go to **Settings → Senders, Domains, IPs → Senders**, add the sender email, and enter the verification code Brevo emails to that address. [Brevo's sender setup guide](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email) explains the steps. Brevo may replace a free or unauthenticated sender address with one of its own addresses, and inbox delivery may be less reliable without an authenticated domain. [Brevo explains this behavior](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders).

Keep the API key on Render only, never in Vercel or Git. For local development, put these values in the ignored `.env` file. The existing `RESEND_API_KEY` and `RESEND_FROM_EMAIL` Render variables are no longer used after this code is deployed; remove them after Brevo is working.

To check the setup, create a test account with an email address you control. Confirm the message arrives, use its temporary password to sign in, and change the password when prompted. If Brevo rejects the request, the account is not created. An accepted API request does not guarantee inbox delivery; the recipient's mail provider may still filter or reject it.
