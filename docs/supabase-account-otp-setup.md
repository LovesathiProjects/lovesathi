# Lovesathi Account OTP Setup

Lovesathi uses two verification paths:

1. Email/password signup verifies email with a Supabase email OTP, then verifies phone with a Supabase phone OTP.
2. Google/Apple signup treats provider email as trusted, then verifies phone with a Supabase phone OTP.

Phone is collected only on Create Account for email/password users. Social users enter phone once on the account verification screen.

## Supabase Settings Required

1. Authentication > Providers > Email: enabled.
2. Authentication > Providers > Email: Confirm email enabled.
3. Authentication > Email Templates > Confirm signup: include `{{ .Token }}` so users receive a 6-digit code.
4. Authentication > Providers > Phone: enabled.
5. Configure a Supabase-supported SMS provider, such as Twilio.
6. Authentication > URL Configuration: add the production site URL and callback URL.

## Twilio Values Needed

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=
```

Use a Messaging Service SID when possible so sender management, regional rules, and compliance live in Twilio instead of the app.

## Current App Behavior

- Email/password signup saves full name, email, phone, and password.
- `/auth/verify-email` verifies email first.
- After email is verified, the same page sends/verifies phone OTP.
- Google/Apple users skip email OTP and land on phone OTP.
- Onboarding starts only after phone verification.
- `phone_verified_at` is written to `user_profiles` during DOB save and is required before onboarding completion.
