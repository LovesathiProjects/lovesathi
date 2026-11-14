-- Metadata-only inspection. No member rows, writes, or schema changes.
BEGIN TRANSACTION READ ONLY;

SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN (
  'user_profiles', 'id_verifications', 'verification_progress',
  'matrimony_profile_full', 'matrimony_matches', 'messages',
  'blocked_users', 'user_reports', 'user_entitlements',
  'lovesathi_events', 'lovesathi_event_registrations'
)) OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY schemaname, tablename, policyname;

SELECT table_schema, table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND table_name IN ('user_profiles', 'id_verifications', 'messages', 'user_entitlements')
ORDER BY table_name, grantee, privilege_type;

SELECT table_schema, table_name, column_name, grantee, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND table_name IN ('user_profiles', 'id_verifications', 'messages', 'user_entitlements')
ORDER BY table_name, column_name, grantee, privilege_type;

SELECT p.oid::regprocedure AS routine, p.prosecdef AS security_definer,
       p.proacl AS execution_grants, p.proconfig AS configuration,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('mark_message_delivered', 'mark_message_seen',
    'get_user_verification_status', 'create_lovesathi_premium_direct_match')
ORDER BY p.proname;

SELECT c.conrelid::regclass AS table_name, c.conname,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.conrelid IN (
  SELECT cl.oid FROM pg_class cl JOIN pg_namespace n ON n.oid = cl.relnamespace
  WHERE n.nspname = 'public' AND cl.relname IN ('user_profiles', 'id_verifications', 'messages', 'lovesathi_event_registrations')
)
ORDER BY table_name, c.conname;

SELECT t.tgrelid::regclass AS table_name, t.tgname,
       pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
WHERE NOT t.tgisinternal AND t.tgrelid IN (
  SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('user_profiles', 'id_verifications', 'messages', 'lovesathi_event_registrations')
)
ORDER BY table_name, t.tgname;

SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('verification-documents', 'face-scans', 'matrimony-photos');

SELECT pubname, schemaname, tablename
FROM pg_publication_tables
WHERE schemaname = 'public' AND tablename IN ('messages', 'matrimony_matches', 'lovesathi_chat_presence');

ROLLBACK;
