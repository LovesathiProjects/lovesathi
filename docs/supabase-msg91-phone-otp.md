# Supabase + MSG91 Phone OTP

Lovesathi uses MSG91 Widget custom UI for phone OTP delivery and code verification, while the final trusted verification still happens through a Supabase Edge Function. This keeps the Lovesathi screen fully custom, avoids the MSG91 popup UI, and lets Supabase Auth/database store the verified phone state.

## Deployed Function

- Supabase project: `bysvtucftcclrdyfihsx`
- Edge Function: `send-sms`
- Hook URL: `https://bysvtucftcclrdyfihsx.supabase.co/functions/v1/send-sms`
- Edge Function: `phone-otp`
- Client URL: `https://bysvtucftcclrdyfihsx.supabase.co/functions/v1/phone-otp`

## Required Supabase Secrets

These secrets are configured in Supabase Edge Functions, not in the repository:

- `MSG91_AUTH_KEY`
- `MSG91_WIDGET_ID`
- `MSG91_WIDGET_TOKEN_AUTH`
- `SEND_SMS_HOOK_SECRET`
- `MSG91_OTP_EXPIRY_MINUTES`
- `MSG91_OTP_MESSAGE`
- `PHONE_OTP_PEPPER`
- `LOVESATHI_SUPABASE_URL`
- `LOVESATHI_SUPABASE_ANON_KEY`
- `LOVESATHI_SUPABASE_SERVICE_ROLE_KEY`

Fallback production SMS template support:

- `MSG91_OTP_TEMPLATE_ID`
- `MSG91_SENDER_ID`

The primary production path is the MSG91 Widget. If the widget config is unavailable, the app falls back to the older Supabase-generated OTP path using `MSG91_OTP_TEMPLATE_ID`.

Current production template:

- `MSG91_OTP_TEMPLATE_ID=6a0703233a692bdafc0a9b24`

Optional no-SMS testing:

- `PHONE_OTP_TEST_NUMBERS` may be set temporarily in staging only, using comma-separated `phone=otp` pairs.
- Do not keep real user phone numbers in `PHONE_OTP_TEST_NUMBERS` for production.

## Dashboard Wiring

1. Open Supabase Dashboard for `bysvtucftcclrdyfihsx`.
2. Go to `Authentication` -> `Hooks`.
3. Enable `Send SMS`.
4. Select `HTTP Endpoint`.
5. Use the Hook URL above.
6. Use the same Standard Webhooks secret stored in `SEND_SMS_HOOK_SECRET`.
7. Save the hook.

If the dashboard generates a new hook secret instead of letting you paste the existing one, copy that generated value and update the Edge Function secret:

```powershell
supabase secrets set --project-ref bysvtucftcclrdyfihsx SEND_SMS_HOOK_SECRET="PASTE_DASHBOARD_SECRET_HERE"
```

## How The Flow Works

1. User enters phone number in Lovesathi signup.
2. Lovesathi asks the `phone-otp` Edge Function for the MSG91 widget config.
3. The Lovesathi screen loads MSG91's OTP provider script in custom UI mode.
4. Lovesathi calls MSG91's exposed `sendOtp` method from our own button.
5. User enters the OTP in Lovesathi's own input.
6. Lovesathi calls MSG91's exposed `verifyOtp` method.
7. MSG91 returns a verification access token.
8. Lovesathi sends that token to the `phone-otp` Edge Function.
9. The Edge Function verifies the token with MSG91's server API, then marks the Supabase Auth phone and `user_profiles.phone_verified_at` as verified.

The `send-sms` Auth Hook remains deployed for compatibility, but Lovesathi's phone verification screen uses `phone-otp` directly. This avoids Supabase's native phone-provider/Twilio/test-number mismatch for newly created email-first accounts. Twilio does not need to be used for Lovesathi phone verification while this custom MSG91 function is active.

## Delivery Debugging

Each verified phone flow stores MSG91 diagnostics in `phone_verifications`:

- `otp_provider`
- `otp_provider_request_id`
- `otp_provider_status`
- `otp_provider_response`
- `otp_provider_updated_at`

If the app says "code sent" but the user does not receive the SMS, check MSG91 Widget logs first. The primary send now happens through MSG91's browser widget script, so SMS delivery failures usually mean widget token/template/DLT/route/credit issues rather than a Lovesathi UI issue. If the app falls back to the older Edge Function send path, compare `otp_provider_request_id` with MSG91 OTP logs.
