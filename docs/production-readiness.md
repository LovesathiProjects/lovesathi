# Lovesathi Production Readiness

This file keeps the launch checklist inside the repo so the app, admin portal, DNS, and third-party services stay aligned.

## Required Render environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL=https://lovesathi.com`
- `NEXT_PUBLIC_SOCKET_URL=https://socket.lovesathi.com`
- `ADMIN_EMAILS` as a comma-separated allowlist for `/admin`

## Required domains

- `lovesathi.com` should point to the main Render web service.
- `www.lovesathi.com` should redirect to `lovesathi.com`.
- `admin.lovesathi.com` should be added as a custom domain on the same main Render web service. `proxy.ts` rewrites that host to `/admin`.
- `socket.lovesathi.com` should point to the Render socket service and must pass `/health`.

## Supabase auth URLs

- Site URL: `https://lovesathi.com`
- Redirect URLs:
- `https://lovesathi.com/auth/callback`
- `https://www.lovesathi.com/auth/callback`
- `http://localhost:3000/auth/callback`

## Launch checks

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `node --check server.js`
- Confirm local `.env.local` and `supabase/.temp/project-ref` point to the Lovesathi Supabase project, not the old Affinity project.
- Confirm `/favicon.ico`, `/manifest.json`, `/robots.txt`, and `/sitemap.xml` return `200`.
- Confirm `/test-storage` and `/test-face-scanner` return `404`.
- Confirm `/auth/callback` never redirects to localhost in production.
- Confirm admin users outside `ADMIN_EMAILS` receive `403`.
- Confirm `https://admin.lovesathi.com` opens the admin portal after Render custom domain SSL is active.
- Confirm admin verification/report status actions work only for users inside `ADMIN_EMAILS`.
- Confirm Supabase Auth sends both signup confirmation and forgot-password recovery emails.
