# Lovesathi bug audit and verification record

Date: November 14, 2026. Baseline: `origin/main` at `c8877b3e7e88c324971655c37bdc4bca88149861`. Local work branch: `codex/lovesathi-audit`.

## Scope and current boundary

This is an initial audit and local remediation pass, not a completed end-to-end certification. The user confirmed that only production is available. The audit initially made only local changes. The user subsequently authorized deployment: the additive Stage 1 lookup was applied to production on November 14 at 14:50 UTC; web release preparation is in progress. No production member records, accounts, photos or Play Store release were modified. Stage 2 access restrictions remain unapplied.

Inspected the application/package structure; build and deployment configuration; web and mobile authentication/onboarding entry points; age handling; chat, unread counts and deletion; storage/account deletion; plan/entitlement helpers; event registration; admin authorization; legacy SQL and incremental migrations; Android wrapper, manifest, signing guards, and toolchain scripts. This is not a claim that every component or every SQL definition has received a full review.

The repository contains a Next.js web app and admin APIs, a Capacitor Android wrapper, and a separate Expo/React Native migration. Release documentation identifies the wrapper as the current release path. The actual installed/published Android artifact has not been identified. The user does not know which implementation is in use; a Play Store link or APK is needed to confirm it.

There are no populated environment files or dedicated test accounts in the checkout. The Supabase connection is now available, and the active Lovesathi project (`bysvtucftcclrdyfihsx`) was inspected read-only. Live metadata checks below supersede the earlier source-only findings; source SQL alone is not treated as deployment evidence.

## Live backend findings and prepared remediation

Read-only inspection confirmed RLS is enabled on all 29 listed public tables. That does not eliminate the following confirmed configuration problems:

| Finding | Live evidence | Local preparation |
|---|---|---|
| Privileged anonymous RPC access | Advisor reports 37 public security-definer routines executable by anon. Inspected `get_complete_matrimony_profile_full` selects an arbitrary requested member row without an actor check. | Stage 2 revokes PUBLIC/anon definer execution and member execution of unused unsafe data getters. No member profile was fetched through the bypass. |
| Cross-member private profile/document reads | `user_profiles` and `id_verifications` have SELECT policies allowing any signed-in user to read rows, with whole-table SELECT grants. | Remove broad policies after client rollout; keep discovery badges through a status-only RPC. |
| Verification/moderation approval fields | Live member verification INSERT/UPDATE policies check only row ownership, with full write grants. The only verification trigger updates timestamps. Profile moderation's existing reset trigger does not prevent a member changing only moderation fields. | Private-schema guards protect approval/moderation fields, preserve ordinary edits and pending resubmission. |
| Receipt spoofing/message integrity | Both receipt routines are security-definer, anonymously executable, and compare receiver ID only to the supplied `p_user_id`. Message UPDATE policies grant participants whole-row updates. A second permissive INSERT policy checks only sender ID. | Bind receipts to the caller; check participants, active matches, blocks, replies and immutable fields; remove permissive INSERT overlap. |
| Photo write ownership | Live `Delete 1ywduga_0` and `Upload 1ywduga_0` check bucket ID alone, not the member folder. | Replace them with owner-folder writes. No real object was modified or removed. |
| Minimum age | Live `valid_age` allows 17-year-olds. | Prepared 18+ constraint for new writes without rewriting/deleting existing records. |
| Verification URL behavior | Live verification-documents and face-scans buckets are private; client upload helpers produce public URLs. | Confirmed configuration mismatch; authorized preview handling still needs work. |
| Server-only subscription mutations | Live `mark_lovesathi_subscription_past_due` accepts any user ID without actor validation; server-wide expiration also has member execution grants. | Stage 2 removes member execution; legitimate service-role maintenance remains authorized. |

The patches are in two migrations created with the Supabase CLI. **Both are locally tested. Stage 1 is now applied to production; Stage 2 remains pending Android compatibility verification.** See `docs/SECURITY_ROLLOUT.md` for the additive lookup → client deployment → access restriction sequence. Web/mobile badge queries are updated to use the new lookup.

Live advisors also report 30 mutable function search paths, 2 extensions in public, 1 disabled leaked-password-protection warning, 19 unindexed foreign keys, 53 RLS initplan warnings and 36 overlapping-permissive-policy performance findings. Five RLS/no-policy notices concern server-managed tables and do not justify adding public policies. Forty-four unused-index notices are informational and do not justify dropping indexes from this lightly used system. Health advisors returned no notices. Logs were inspected only as counts by source over the default previous-24-hour window; those aggregates do not establish a root cause or absence of runtime errors.

Remediation references: [privileged anonymous routines](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [mutable search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [foreign-key indexes](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [RLS performance](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan).

## Local fixes

| Finding | Result | Evidence |
|---|---|---|
| Date-only DOB values were parsed as UTC, while ages used local calendar components. | Web and React Native now validate and parse calendar dates consistently. Both save-DOB services reject invalid/future dates. | Regression tests cover birthday boundaries, malformed/impossible dates, leap days, and five time zones. Baseline reproduction: in Los Angeles a member born November 15, 2008 was calculated as 18 on November 14, 2026. |
| The 18-year cutoff converted local midnight back to UTC. | Cutoffs are formatted as local calendar dates and clamp leap days. | Baseline reproduction: Riyadh returned `2008-11-13` instead of `2008-11-14` for November 14, 2026. |
| Account deletion ignored storage failures and only listed the first 1000 immediate children. | Cleanup lists all pages and subfolders, deletes in bounded batches, and stops before auth deletion if cleanup fails. | Mocked storage and route tests cover 1001+ objects, nesting, failure handling, auth guard, and auth-deletion ordering. Real bucket cleanup remains untested. Partial cleanup can occur before an error; the account remains available for retry. |
| Clearing chat returned success even when individual message writes failed. | The helper returns false if any write fails. | Regression tests cover failed writes, successful writes, and already hidden messages. |
| Unread queries counted messages hidden by the member. | Both unread count queries exclude the member's `deleted_by` entries. | Query regression test; deployed database behavior still needs verification. The checked-in message schema declares `deleted_by` non-null. |
| Unread badge changes relied on old realtime fields that may not be present. | The hook reloads the canonical count on message changes and auth changes, and discards stale request results. | Typechecked and linted. Two-member realtime/device testing is still required. |
| Android scripts required Windows PowerShell, and the old toolchain accepted JDK 17 despite Java 21 source requirements. | npm commands now use a Node runner supporting macOS/Linux/Windows; prerequisites require JDK 21 and SDK 36. Direct legacy PowerShell checks also require JDK 21. Install rebuilds before using the APK. | Script syntax check, successful Capacitor Android sync, and doctor output correctly reporting this machine's missing prerequisites. No APK built. |
| Wrapper manifest omitted camera permission although the selfie flow calls `getUserMedia`. Capacitor's WebChromeClient requests `Manifest.permission.CAMERA` for video capture. | Added the camera declaration and made camera hardware optional. | Source/manifest review only; Android runtime permission and camera use remain untested. |
| Locked web dependencies included six affected production packages. | Upgraded Next.js and ESLint configuration to 16.4.6, Zod to 4.6.7, compatible form resolvers, and available transitive fixes. Updated Zod error configuration. | Production dependency audit reports zero advisories; form resolver regression tests and web production build pass. |
| Expo dependency compatibility check reported mismatched image picker/screens packages; gradient used an unbounded `latest`. | Aligned image picker and screens with Expo 56, bounded gradient to Expo 56, and applied compatible dependency remediation. | Expo compatibility check passes; Android Metro/Hermes export passes. Mobile advisories remain below. |
| Setup instructions referred to an absent environment example. | Added root/mobile environment templates, a root README, and repeatable test commands. | Templates contain no credentials; actual environment files remain ignored. |

Additional local remediation after Supabase connected:

- Private verification uploads now retain durable object references. A new admin-only endpoint resolves owner-scoped references, including legacy project storage URLs, into one-minute signed links. The admin queue now has a review dialog. Links are discarded on close/session change and expire from the UI; the buckets remain private. Path/signer and server authorization tests pass. Actual document review still needs a test admin account.
- Captured selfie images are decoded locally instead of fetching a `data:` URL that the app's connection policy can block. Late camera streams and detectors are stopped/disposed, cancelled inference loops cannot reschedule, and global TensorFlow variables are no longer disposed by one scanner. Model load errors/timeouts now expose retry. Capture still requires one detected face. Camera permission and real selfie capture remain unverified.
- The scanner now uses the MediaPipe runtime and model/WASM assets from exact-pinned `@mediapipe/face_detection@0.4.1646425229`, served by the same app. `predev`/`prebuild` copy the package assets with their license into a versioned public directory; generated files are ignored in Git. The existing CSP was not broadened. A local browser test initialized the packaged model, processed a blank synthetic canvas with zero faces, and closed the WebGL context successfully. The temporary test page was removed before the production build.
- Event registration rejects non-object JSON with 400 before database access, including `null`, which previously caused an unhandled property access.

## Registration and photo-upload follow-up

The user requested a focused repair of registration and photo uploads, then asked to inspect both platforms and fix findings throughout those flows. The traced story is account creation → email confirmation/session → verified account details → profile photos → profile persistence. The code changes are prepared for the authorized web release; see the scope and rollout status above.

- Web storage failures previously returned a temporary `blob:` preview and reported upload success. Uploads now fail explicitly, require an authenticated member and a completed storage response, use UUID filenames and explicit MIME types, and return the actual stored path's public URL. Profile saves reject temporary/inline URLs and require 2–6 durable photo URLs. Supported web photo formats and the 10 MB limit are shown in setup.
- Web setup and Expo setup retain each successfully uploaded photo when a subsequent photo fails. Web setup uses a mounted file input, resets its value for same-file retries, and prevents overlapping batches/removals during upload. Profile editing validates form values before uploading, retains successful uploads for retries after later failures, resets the picker, and revokes temporary previews. Upload cancellation/cleanup across a full page reload remains a separate concern.
- Both Step 1 services now stop when reading an existing profile fails, preventing a transient read error from causing an upsert with empty previous details.
- Email code entry no longer truncates at six digits; both clients accept configured 6–10 digit codes. Verification makes one supported `email` request and requires an established user/session before reporting success. Six-digit phone OTP behavior is unchanged. Actual production email OTP length/template content has not been inspected.
- Web signup honors an immediate confirmed session instead of always entering email confirmation. Both clients guard missing signup users and trim full names. Browser pending-contact storage has an in-memory fallback, including protection against restoring an older account after a failed write/removal; Expo pending-detail writes do not convert an already completed signup into a failure.
- Email-link redirects use the initiating browser origin, preserving the PKCE verifier on www/local/preview origins, provided those callback URLs are allowlisted in Supabase. The setup store now exposes stable callbacks so account hydration does not repeatedly refetch as the form saves state.
- Expo reads native local/content assets through the SDK 56 File API instead of native fetch, and uses Expo UUID generation. Picker permission/open failures are handled within the loading/error boundary, picker results are restricted to images, and known file sizes are passed through. SDK-compatible file-system/crypto packages are explicit dependencies. See [Expo FileSystem SDK 56](https://docs.expo.dev/versions/v56.0.0/sdk/filesystem/).
- The unused legacy Step 8 component now routes selfie/ID uploads to their private buckets with surfaced failures, rather than the public profile-photo uploader. It is not wired into the current onboarding flow and does not establish end-to-end identity submission.

Read-only production diagnostics inspected the signup trigger and profile constraints. The auth-users insert trigger creates an empty account profile and verification-progress row; no failing trigger was demonstrated. The available November 13–14 log window contained 24 info-level Auth entries and one info-level Storage entry, with no matching registration/upload failure to reproduce. Aggregate photo inspection found zero stored `blob:` photo references; all 120 profiles with inline image references were marked seeded. No member records, accounts or objects were modified. These observations do not establish that reported runtime failures are resolved in production.

## Verification performed

The compile/export runs used `audit-placeholder.supabase.co` and clearly labeled dummy keys. They do not prove Supabase connectivity or successful authentication. No real network operation was performed with these dummy credentials during the automated service tests; service/route tests use mocks.

| Check | Result |
|---|---|
| `npm test` | 42 tests passed, including 14 new registration/photo-upload regressions. |
| `npm run test:server` | 4 private-preview authorization tests passed, using the actual admin guard and mocked Supabase responses. |
| `npm run test:db` | Passed in an isolated PostgreSQL 14.19 cluster with synthetic fixtures; both prepared migrations and ten security assertion groups. This is not a production migration or full Supabase clone. |
| `npm run typecheck` | Passed after fixes. |
| `npm run lint` | Passed with zero errors; three internal-navigation warnings remain in existing TSX files. |
| Web production build | Passed on Next.js 16.4.6, including the new admin preview endpoint. React 18 deprecation warning remains. |
| Mobile `npm run typecheck` | Passed. |
| Mobile `expo install --check` | Dependencies are up to date for Expo 56. |
| Mobile `expo export --platform android` | Passed: 1018 modules, Hermes Android bundle and assets after file-system/crypto integration. This is not an APK or device test. |
| `cap sync android` | Passed. |
| Bundled face model browser check | Model initialization, synthetic-image inference and cleanup passed under the app's existing security headers. MediaPipe emitted WebGL diagnostics, with no model-load failure. This does not test a real camera or positive face detection. |
| Production-mode model asset delivery | Model and WASM returned 200 with versioned immutable caching; WASM used `application/wasm`. The removed temporary model-check page returned 404. |
| `native:doctor:android` | Correctly stopped: active JDK 17; no Android SDK Platform 36/platform-tools found. |
| Live public HTTP checks | 17 expected pages/assets returned 200; `/test-storage` and `/test-face-scanner` returned 404. |
| Live browser | Homepage, sign-in entry, email login, and password-recovery screens inspected. No console warnings/errors observed on those screens. Phone-width recovery/sign-in inspection performed; no account was created and no email sent. |
| Local production server/browser | `/auth` and registration UI loaded without observed console errors. Homepage, auth, recovery, countries API returned 200; removed diagnostic routes returned 404. CSP header present. |
| Registration follow-up browser | Local production `/auth/verify-email` retains a ten-digit synthetic code, enables verification, and reports no captured browser warnings/errors. No code submitted and no email sent. |
| `git diff --check` | Passed. |

Live HTTP paths checked: `/`, `/auth`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`, `/events`, `/success-stories`, `/terms`, `/privacy`, `/policies`, `/safety`, `/account-deletion`, `/contact-support`, `/favicon.ico`, `/manifest.json`, `/robots.txt`, `/sitemap.xml`, `/test-storage`, `/test-face-scanner`. Status checks do not establish authenticated functionality or content correctness.

## Open findings and next work

The live backend section above confirms and updates the applicable entries below. Remaining product/runtime checks are still open. The additive Stage 1 lookup is applied; the Stage 2 restrictions remain unapplied.

| Priority | Finding and source | Next action |
|---|---|---|
| High | Legacy ID verification policies allow members to insert/update their own verification rows without restricting `verification_status`, `verified_by`, or `verified_at` (`SQL/supabase-schema.sql`, `SQL/supabase-setup-clean.sql`). No corresponding column-level hardening was found in the inspected migrations. | Inspect deployed grants, policies and triggers. Restrict approval fields to server/admin operations and test member self-approval rejection in an isolated database. |
| High | Checked-in `mark_message_seen` and `mark_message_delivered` are security-definer routines that trust `p_user_id` without comparing it to `auth.uid()` (`SQL/messages-schema.sql`, `SQL/20251128_add_message_status_fields.sql`). | Inspect deployed definitions and execution grants; bind the actor to the authenticated caller and test cross-member rejection. |
| High | Message UPDATE policy permits participants to update the full row (`SQL/messages-schema.sql`). RLS checks participant identity, but does not itself stop editing another sender's content or sensitive message columns. | Inspect actual grants/triggers; constrain mutable fields and use actor-bound operations. |
| High | Mobile dependency audit improved from 28 advisories (including one critical) to 14: 3 high, 9 moderate, 2 low. Remaining high package entries are `@expo/cli`, `image-size`, and `zod`. Much of this is Expo tooling; these counts do not by themselves establish an exploitable Android application. | Plan and validate a coordinated Expo SDK upgrade. npm proposes Expo 58 for most remaining issues; no forced SDK-major upgrade was applied. |
| High | The original face detector depended on an external model URL blocked by CSP and returning 404 after redirecting. | Fixed locally using pinned, self-hosted MediaPipe assets. Initialization/inference/cleanup passed in a local browser using a synthetic image. Real selfie and Android camera testing remain pending. |
| Medium | The legacy user-profile age constraint allows 17-year-olds (`SQL/supabase-schema.sql`); the alternate clean setup has no age constraint. | Verify the deployed constraint, audit counts without exporting member data, and prepare a compatible server-side 18+ rule after reviewing existing rows. Client validation is not sufficient. |
| Medium | Private verification/face-scan uploads previously generated public URLs despite private buckets. | Fixed locally with durable references and an admin-only signed-preview flow. Actual file/UI verification remains pending deployment and dedicated accounts. |
| Medium | Event registration checks capacity in a separate read before inserting (`app/api/events/register/route.ts`). Concurrent registrations can overbook unless the deployed database supplies an independent guard. | Inspect database triggers/constraints and add a transactional registration operation with concurrency tests if absent. |
| Medium | Root development dependency audit still reports seven moderate entries associated with minimatch/typescript-eslint. Production audit is clean. | Update the affected compatible tooling chain or validate a targeted override; no blind major transitive override was applied. |
| Product gap | Web checkout is explicitly a placeholder for future provider integration (`components/premium/payment-screen.tsx`); no real checkout/webhook flow is present there. | Confirm whether payments are meant to be live, choose the intended provider/billing path, then implement and test separately. Do not invent a payment integration. |
| Product gap | React Native profile centre lacks full web parity (profile editing/settings/account deletion/premium purchase). Its offer text is hard-coded. Historic migration docs also lag the source: discovery/chat now contain backend service calls. | Identify the distributed Android app, then agree the parity/release scope. Do not present a successful JS export as native feature completeness. |
| Unverified | Hosted Android OAuth callbacks, password recovery, realtime chat, reporting/blocking, notifications, contacts/privacy, entitlements, admin actions, and account deletion. | Run dedicated-account scenarios after backend inspection and test-account access. Use staging/disposable fixtures for destructive and cross-member actions. |

## Access needed to finish

1. Supabase access is connected and the initial read-only review is complete. Follow the prepared rollout document for explicit production authorization, recovery readiness, deployment access and metadata drift checks before any production migration. The prepared `scripts/audit-supabase-readonly.sql` only reads metadata and does not select member records.
2. Provide the Play Store listing or an APK so the actual Android implementation/version can be identified.
3. Provide two dedicated member test accounts and an admin test account through a local ignored configuration file or a signed-in test session. Do not put production service secrets or real-member credentials into the chat. OTP delivery needs access to the test inbox/phone when that flow is tested.
4. For Android runtime QA, configure JDK 21 and SDK 36 and make an emulator or test device available. Existing release upload-key material is needed only if a signed release artifact is requested.

Only production currently exists. An isolated local synthetic database was used for policy regression checks. Dedicated test accounts and a separate test environment/disposable test workflow are still needed to finish full app flows, destructive account deletion and event-capacity concurrency testing without affecting real users.
