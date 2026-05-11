# Supabase + MSG91 Phone OTP

Lovesathi uses Supabase to generate and verify phone OTPs. MSG91 is only the SMS delivery provider.

## Deployed Function

- Supabase project: `bysvtucftcclrdyfihsx`
- Edge Function: `send-sms`
- Hook URL: `https://bysvtucftcclrdyfihsx.supabase.co/functions/v1/send-sms`

## Required Supabase Secrets

These secrets are configured in Supabase Edge Functions, not in the repository:

- `MSG91_AUTH_KEY`
- `SEND_SMS_HOOK_SECRET`
- `MSG91_OTP_EXPIRY_MINUTES`
- `MSG91_OTP_MESSAGE`

Optional production SMS template support:

- `MSG91_OTP_TEMPLATE_ID`
- `MSG91_SENDER_ID`

If MSG91 requires an approved OTP template, set `MSG91_OTP_TEMPLATE_ID` to the MSG91 OTP template ID. Without that value, the function uses MSG91's legacy SendOTP API with the provided message text.

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
2. Lovesathi asks Supabase to send a phone OTP.
3. Supabase creates the OTP and calls the `send-sms` Auth Hook.
4. The Edge Function verifies Supabase's webhook signature.
5. The Edge Function sends Supabase's OTP through MSG91.
6. User enters the OTP.
7. Supabase verifies the OTP and marks the phone as confirmed.

Do not verify OTPs through MSG91. Verification must remain in Supabase so the Supabase Auth session and phone confirmation stay correct.
