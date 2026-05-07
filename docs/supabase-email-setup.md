# Lovesathi Supabase Email Setup

Lovesathi uses Supabase Auth for both email confirmation and password recovery.

## Required Environment Variables

Set these in Render and `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://lovesathi.com
```

No third-party email provider variables are required.

## Supabase Dashboard Checklist

In Supabase, open **Authentication > URL Configuration**:

- Site URL: `https://lovesathi.com`
- Redirect URL: `https://lovesathi.com/auth/callback`
- Redirect URL: `https://www.lovesathi.com/auth/callback`
- Redirect URL: `http://localhost:3000/auth/callback`

In **Authentication > Email Templates**, keep the Supabase confirmation and recovery emails enabled. The recovery email should send users to the configured callback URL.

## Password Recovery Flow

1. User opens `/auth/forgot-password`.
2. The browser calls `supabase.auth.resetPasswordForEmail`.
3. Supabase sends the recovery email.
4. The recovery link lands on `/auth/callback`.
5. The callback exchanges the code for a temporary Supabase session.
6. The user is redirected to `/auth/forgot-password?mode=reset`.
7. The browser calls `supabase.auth.updateUser({ password })`.
8. The app signs the user out and sends them back to login.
