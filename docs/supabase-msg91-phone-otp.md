# Supabase + MSG91 Phone OTP

Lovesathi uses a Supabase Edge Function to generate, send, and verify phone OTPs. MSG91 is only the SMS delivery provider.

## Deployed Function

- Supabase project: `bysvtucftcclrdyfihsx`
- Edge Function: `send-sms`
- Hook URL: `https://bysvtucftcclrdyfihsx.supabase.co/functions/v1/send-sms`
- Edge Function: `phone-otp`
- Client URL: `https://bysvtucftcclrdyfihsx.supabase.co/functions/v1/phone-otp`

## Required Supabase Secrets

These secrets are configured in Supabase Edge Functions, not in the repository:

- `MSG91_AUTH_KEY`
- `SEND_SMS_HOOK_SECRET`
- `MSG91_OTP_EXPIRY_MINUTES`
- `MSG91_OTP_MESSAGE`
- `PHONE_OTP_PEPPER`
- `LOVESATHI_SUPABASE_URL`
- `LOVESATHI_SUPABASE_ANON_KEY`
- `LOVESATHI_SUPABASE_SERVICE_ROLE_KEY`

Optional production SMS template support:

- `MSG91_OTP_TEMPLATE_ID`
- `MSG91_SENDER_ID`

If MSG91 requires an approved OTP template, set `MSG91_OTP_TEMPLATE_ID` to the MSG91 OTP template ID. Without that value, the function uses MSG91's legacy SendOTP API with the provided message text.

Current production template:

- `MSG91_OTP_TEMPLATE_ID=global_otp`

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
2. Lovesathi calls the `phone-otp` Edge Function with the signed-in user's Supabase session.
3. The Edge Function creates the OTP, stores only a hash in `phone_verifications`, and sends the OTP through MSG91.
4. User enters the OTP.
5. The Edge Function verifies the OTP hash, marks the row verified, and marks the Supabase Auth phone as confirmed with the service role.

Do not verify OTPs through MSG91. Verification remains inside Supabase so Lovesathi can trust the Supabase database and Auth user state.

The `send-sms` Auth Hook remains deployed for compatibility, but Lovesathi's phone verification screen uses `phone-otp` directly. This avoids Supabase's `phone_change` Auth Hook payload issue for newly created email-first accounts.

## Delivery Debugging

Each phone OTP request now stores MSG91 delivery diagnostics in `phone_verifications`:

- `otp_provider`
- `otp_provider_request_id`
- `otp_provider_status`
- `otp_provider_response`
- `otp_provider_updated_at`

If the app says "code sent" but the user does not receive the SMS, check the latest row for that user and compare `otp_provider_request_id` with MSG91 OTP logs. If the request is accepted by MSG91 but not delivered, the issue is on the MSG91/template/DLT/carrier delivery side, not the Lovesathi verification UI.
