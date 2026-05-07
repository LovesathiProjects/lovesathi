# Lovesathi Email Setup

Lovesathi uses MSG91 Email for the forgot-password OTP flow.

## Required Environment Variables

Set these in Render and in `.env.local` for local testing:

```env
MSG91_API_KEY=
MSG91_FORGOT_PASSWORD_TEMPLATE_ID=
MSG91_EMAIL_DOMAIN=no-reply.lovesathi.com
MSG91_EMAIL_FROM=dev@no-reply.lovesathi.com
MSG91_EMAIL_FROM_NAME=LoveSathi
```

`MSG91_EMAIL_TEMPLATE_ID` is still supported as a fallback, but `MSG91_FORGOT_PASSWORD_TEMPLATE_ID` is clearer for this flow.

## DNS Requirement

MSG91 will reject email until `no-reply.lovesathi.com` is verified. Complete the SPF, DKIM, and MX records exactly as MSG91 shows them.

Expected failure before verification:

```text
The domain no-reply.lovesathi.com is not verified.
```

After DNS verification, the forgot-password OTP flow should work without code changes.

## Flow

1. User requests OTP from `/auth/forgot-password`.
2. The server checks the account privately and rate-limits OTP requests.
3. The OTP is saved for 5 minutes.
4. MSG91 sends the OTP email.
5. If MSG91 fails, the saved OTP is removed.
6. Password reset is allowed only after a verified, unexpired OTP.
