# Prepared database security rollout

Prepared November 14, 2026 after read-only production metadata inspection. **Stage 1 was applied to production at 14:50 UTC (17:50 Riyadh) on November 14, following the user's deployment instruction.** Stage 2 remains unapplied. Web deployment is in progress; no Android binary has been released.

## Why the patch exists

The deployed definitions confirm that some security-definer RPCs accept arbitrary member identifiers and have anonymous execution grants. The database also has a bucket-wide authenticated photo-delete policy, broad SELECT policies over private profiles and verification rows, member-writable verification approvals, and message receipt routines that trust caller-supplied user IDs.

These observations establish vulnerable access rules. The audit did not exercise them against member records or establish that anyone has exploited them.

## Stage 1: additive compatibility change

`supabase/migrations/20261114145023_harden_member_data_access.sql` is applied. Production migration history records `20261114145023`. The new public lookup is security-invoker, authenticated execution is granted, anonymous execution is denied, and an authenticated empty-input lookup returned zero rows. No member rows were changed.

This creates a narrow, authenticated `get_lovesathi_verification_statuses(uuid[])` lookup. It returns only member IDs and verification statuses through a private-schema helper. It does not remove existing policies or change existing member rows.

Then deploy the web changes in this branch. Discovery, shortlist and profile views use the narrow lookup. If the distributed Android app is the Capacitor wrapper, the hosted web deployment supplies those UI changes. If the distributed app is the separate React Native app, it needs the updated native release before broad verification-row reads are removed.

## Stage 2: restrict existing access

After confirming the updated clients can retrieve badges and the existing release is identified, apply `supabase/migrations/20261114145101_enforce_member_data_boundaries.sql` through a separate reviewed production migration operation.

It performs these changes:

- Revokes anonymous/PUBLIC execution of public security-definer functions, and revokes member execution of unused legacy data-access helpers and server-only subscription mutation routines.
- Removes broad cross-member profile/verification SELECT policies while retaining owner access. Admin APIs continue to use the service-role client.
- Prevents member self-approval of ID verification and protects profile moderation fields. A new member verification submission is pending and clears the previous approval fields.
- Binds delivery/read receipt RPCs to the recipient's authenticated session.
- Checks message participants, active match, reverse-direction blocks and reply context, and protects immutable message fields and other members' deletion decisions.
- Replaces bucket-wide photo writes with owner-folder INSERT/UPDATE/DELETE checks.
- Changes the DOB constraint from 17 to 18 years. The replacement is `NOT VALID`, so existing records are not rewritten or deleted. New writes and updates must satisfy the new rule; existing underage profiles require a separate decision before constraint validation.

## Validation evidence and limits

`npm run test:db` creates a fresh temporary PostgreSQL cluster over a private Unix socket, loads synthetic fixtures based on the inspected production definitions, applies both migrations, and runs the assertions in `tests/database/member-access.sql`. It stops and removes the cluster afterward. It does not read project credentials or connect to Supabase. PostgreSQL 14.19 was used locally; production reports PostgreSQL 17.6.1.

The checks cover denied anonymous RPC grants; owner-only profile/document rows; safe status lookup; self-approval denial and valid resubmission; moderation protection; 18+ writes; cross-member photo writes; wrong/inactive/blocked message recipients; immutable content; visibility preservation; receipt spoofing denial; and valid recipient acknowledgments.

This is not a full Supabase clone, full production schema replay, or end-to-end client/account test. The fixtures do not reproduce every existing database function, trigger, constraint, PostgREST behavior, or storage service. Real member accounts were not used for mutation tests.

## Before production application

1. Confirm an existing database backup/PITR recovery point and capture the affected policy, function, constraint and grant definitions. Keep any data backup private.
2. Recheck migration history and affected metadata for drift from the November 14 inspection; apply only these reviewed migrations, not all historical setup scripts.
3. Confirm production rollout authorization, deployment access and the Android release path. Do not remove compatibility policies before the updated clients are in service.
4. Verify owner profile read/write, new pending verification submission, badges, matched chat, receipt updates, photo uploads and server/admin operations using dedicated test accounts.
5. Re-run security advisers and verify the specific changed grants/policies, rather than treating an advisor count as an application test.

If an unexpected compatibility failure occurs, pause further rollout and inspect it before restoring previous definitions. Restoring old grants/policies would reopen the identified weaknesses; a rollback must be scoped and explicitly reviewed. No member records need to be deleted for this patch.
