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
- Redirect URL: `https://lovesathi.com/auth/reset-password`
- Redirect URL: `https://www.lovesathi.com/auth/callback`
- Redirect URL: `https://www.lovesathi.com/auth/reset-password`
- Redirect URL: `http://localhost:3000/auth/callback`
- Redirect URL: `http://localhost:3000/auth/reset-password`

In **Authentication > Email Templates**, keep the Supabase confirmation and recovery emails enabled. The recovery email should use Supabase's default recovery link token and can redirect users to `/auth/reset-password`.

## Password Recovery Flow

1. User opens `/auth/forgot-password`.
2. The browser calls `supabase.auth.resetPasswordForEmail`.
3. Supabase sends the recovery email.
4. The recovery link lands on `/auth/reset-password`.
5. The reset page accepts either a Supabase `code` query or an existing recovery session.
6. The browser calls `supabase.auth.updateUser({ password })`.
7. The app signs the user out and sends them back to login.
