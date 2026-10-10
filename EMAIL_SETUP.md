# Account invitation email

The Accounts page asks for a person's name, email address, and role. The server generates a random temporary password and submits an invitation email. The account becomes active only after the email service accepts the message. New users must change their temporary password after signing in.

The deployed API uses [Resend's email API](https://resend.com/docs/api-reference/emails/send-email) over HTTPS. On the Render web service, set these environment variables:

| Key | Value |
| --- | --- |
| `RESEND_API_KEY` | API key from your Resend account |
| `RESEND_FROM_EMAIL` | Sender address on a domain you verified in Resend, such as `accounts@yourdomain.com` |
| `CLIENT_ORIGIN` | Exact production Vercel origin, such as `https://your-site.vercel.app`, without a trailing slash |

Add and verify a domain you own in [Resend Domains](https://resend.com/docs/dashboard/domains/introduction), then use an address on that domain as `RESEND_FROM_EMAIL`. Resend's shared testing domain is for tests and cannot send invitations to arbitrary users. These values belong on Render only, not Vercel or in Git. For local development, put them in the ignored `.env` file.

To check the setup, create a test account with an email address you control. Confirm the message arrives, use its temporary password to sign in, and change the password when prompted. If the email service is unconfigured or rejects the message, the account is not created. Resend accepting a message does not guarantee inbox delivery; the recipient's mail provider may still filter or reject it.
