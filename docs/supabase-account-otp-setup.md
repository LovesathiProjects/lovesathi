# Lovesathi Account OTP Setup

Lovesathi uses two verification paths:

1. Email/password signup verifies email with a Supabase email OTP, then verifies phone with a Supabase phone OTP.
2. Google/Apple signup treats provider email as trusted, then verifies phone with a Supabase phone OTP.

Phone is collected on Create Account for email/password users. Social users can enter phone on the account verification screen. Phone verification is strongly encouraged, but users can skip it during onboarding and verify later from Edit Profile.

## Supabase Settings Required

1. Authentication > Providers > Email: enabled.
2. Authentication > Providers > Email: Confirm email enabled.
3. Authentication > Email Templates > Confirm signup: include `{{ .Token }}` so users receive a 6-digit code.
4. Authentication > Providers > Phone: enabled.
5. Configure Twilio/Twilio Verify as the Supabase phone SMS provider.
6. Authentication > URL Configuration: add the production site URL and callback URL.
7. Authentication > Auth Hooks: disable any old `Send SMS hook` that points to a Lovesathi Edge Function, otherwise Supabase will call that hook instead of Twilio.

## Twilio Values Needed In Supabase

These values live in the Supabase Dashboard phone provider settings, not in the app environment:

- Twilio Account SID
- Twilio Auth Token
- Twilio Verify Service SID if Supabase is set to Twilio Verify
- Twilio Messaging Service SID only if Supabase is set to Twilio SMS/Messaging Service

## Current App Behavior

- Email/password signup saves full name, email, phone, and password.
- `/auth/verify-email` verifies email first.
- After email is verified, the same page offers phone OTP verification.
- Google/Apple users skip email OTP and can verify phone from the account verification screen.
- Users can skip phone verification and continue onboarding.
- `phone_verified_at` is written to `user_profiles` after successful phone OTP verification.
