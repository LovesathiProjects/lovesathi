# Lovesathi Admin Portal

The admin portal lives in the main Lovesathi Next.js app and is served from `/admin`.
The production subdomain `admin.lovesathi.com` is handled by `proxy.ts`, which rewrites admin-subdomain visits to the same `/admin` route while leaving `/api/*` and Next assets untouched.

## Required Render environment variables

Set these on the Lovesathi Render web service:

```bash
ADMIN_EMAILS=owner@example.com,ops@example.com
NEXT_PUBLIC_SUPABASE_URL=https://bysvtucftcclrdyfihsx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`ADMIN_EMAILS` is a comma-separated allowlist. Each email must also exist as a Supabase Auth user and sign in with email/password.

## DNS setup for `admin.lovesathi.com`

1. Open the same Render web service that serves `lovesathi.com`.
2. Add `admin.lovesathi.com` as an additional custom domain.
3. Copy Render's DNS target for that custom domain.
4. In the domain DNS provider, add:

```txt
Type: CNAME
Name: admin
Value: Render-provided target
Proxy: DNS only, if using Cloudflare
```

5. Wait for DNS and Render SSL to finish.
6. Verify `https://admin.lovesathi.com` loads the admin sign-in screen.

## Current admin capabilities

- Executive metrics for users, completed profiles, drafts, verifications, reports, matches, messages, shortlists, and new profiles.
- Recent matrimony profile quality queue.
- Identity verification queue with approve, in-review, and reject actions.
- Safety report queue with resolve, reviewed, and dismiss actions.
- Readiness warnings for subdomain, Supabase email configuration, and socket domain.

## Intentionally not included yet

Account deletion, bulk edits, refunds, subscription mutations, and role management should wait until the app has audit logs, role-based permissions, and stronger confirmation flows.
