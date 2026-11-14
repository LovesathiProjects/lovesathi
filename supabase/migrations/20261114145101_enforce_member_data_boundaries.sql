-- Prepared from read-only inspection of production on 2026-11-14.
-- Stage 2. NOT applied to production. Apply AFTER the status-lookup migration and client rollout.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;

-- PUBLIC grants also apply to anon; revoking only the explicit anon grant is insufficient.
DO $$
DECLARE fn RECORD;
BEGIN
  FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn.signature);
  END LOOP;

  -- Unused legacy helpers bypass table policies and accept arbitrary member identifiers.
  FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'get_user_id_by_email', 'get_complete_matrimony_profile_full', 'get_complete_matrimony_profile',
      'get_complete_dating_profile_full', 'get_complete_dating_profile',
      'get_dating_discovery_profiles', 'get_matrimony_discovery_profiles', 'get_discoverable_profiles',
      'get_messages_with_media', 'update_profile_photos_full', 'add_profile_photo_full', 'update_user_location',
      'mark_lovesathi_subscription_past_due', 'expire_lovesathi_past_due_entitlements'
    )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn.signature);
  END LOOP;
END $$;

-- Discovery must not grant access to every column of basic profiles or ID documents.
DROP POLICY IF EXISTS "Users can view user profiles for discovery" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view verification status for discovery" ON public.id_verifications;

-- This existing helper only needs the caller's own verification data.
ALTER FUNCTION public.get_user_verification_status(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_user_verification_status(uuid) SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION private.guard_lovesathi_verification_write()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid()
      OR NEW.verification_status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'Only an administrator can approve verification' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Verification identity cannot be changed' USING ERRCODE = '42501';
    END IF;
    -- A fresh submission invalidates any earlier decision; the server/admin must review it.
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
    NEW.verification_notes := NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_lovesathi_verification_write() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_lovesathi_verification_write ON public.id_verifications;
CREATE TRIGGER guard_lovesathi_verification_write BEFORE INSERT OR UPDATE ON public.id_verifications
FOR EACH ROW EXECUTE FUNCTION private.guard_lovesathi_verification_write();

CREATE OR REPLACE FUNCTION private.guard_lovesathi_moderation_write()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.admin_review_status IS DISTINCT FROM 'pending' OR NEW.admin_reviewed_at IS NOT NULL
        OR NEW.admin_reviewed_by IS NOT NULL OR NEW.admin_review_notes IS NOT NULL OR NEW.is_seeded_profile THEN
        RAISE EXCEPTION 'Only administrators can set moderation fields' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.admin_review_status IS DISTINCT FROM OLD.admin_review_status
      OR NEW.admin_reviewed_at IS DISTINCT FROM OLD.admin_reviewed_at
      OR NEW.admin_reviewed_by IS DISTINCT FROM OLD.admin_reviewed_by
      OR NEW.admin_review_notes IS DISTINCT FROM OLD.admin_review_notes
      OR NEW.is_seeded_profile IS DISTINCT FROM OLD.is_seeded_profile THEN
      RAISE EXCEPTION 'Only administrators can set moderation fields' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_lovesathi_moderation_write() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_lovesathi_moderation_write ON public.matrimony_profile_full;
CREATE TRIGGER guard_lovesathi_moderation_write BEFORE INSERT OR UPDATE ON public.matrimony_profile_full
FOR EACH ROW EXECUTE FUNCTION private.guard_lovesathi_moderation_write();

-- Tighten the existing age rule without deleting or rewriting existing member records.
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS valid_age;
ALTER TABLE public.user_profiles ADD CONSTRAINT valid_age
  CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years') NOT VALID;

-- Replace overlapping permissive INSERT policies with a single participant check.
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their matches" ON public.messages;
CREATE POLICY "Users can send messages in their matches" ON public.messages FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = sender_id AND match_type = 'matrimony' AND EXISTS (
  SELECT 1 FROM public.matrimony_matches m WHERE m.id = match_id AND m.is_active
    AND ((m.user1_id = sender_id AND m.user2_id = receiver_id)
      OR (m.user2_id = sender_id AND m.user1_id = receiver_id))
));

CREATE OR REPLACE FUNCTION private.guard_lovesathi_message_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  -- Preserve trusted backend maintenance; browser roles cannot choose their signed JWT role.
  IF auth.role() = 'service_role' OR (auth.role() IS NULL AND current_setting('role', true) NOT IN ('anon','authenticated')) THEN
    RETURN NEW;
  END IF;
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'sent' OR NEW.delivered_at IS NOT NULL OR NEW.seen_at IS NOT NULL
      OR cardinality(NEW.delivered_to) > 0 OR cardinality(NEW.seen_by) > 0 OR cardinality(NEW.deleted_by) > 0 THEN
      RAISE EXCEPTION 'New messages cannot contain delivery acknowledgments' USING ERRCODE = '42501';
    END IF;
    IF NEW.sender_id IS DISTINCT FROM actor OR NOT EXISTS (
      SELECT 1 FROM public.matrimony_matches m WHERE m.id = NEW.match_id AND m.is_active
        AND ((m.user1_id = NEW.sender_id AND m.user2_id = NEW.receiver_id)
          OR (m.user2_id = NEW.sender_id AND m.user1_id = NEW.receiver_id))
    ) OR EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = NEW.sender_id AND b.blocked_id = NEW.receiver_id)
         OR (b.blocker_id = NEW.receiver_id AND b.blocked_id = NEW.sender_id)
    ) THEN RAISE EXCEPTION 'An active, unblocked conversation is required' USING ERRCODE = '42501'; END IF;
    IF NEW.reply_to_message_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.messages r WHERE r.id = NEW.reply_to_message_id AND r.match_id = NEW.match_id
    ) THEN RAISE EXCEPTION 'Reply must belong to this conversation' USING ERRCODE = '42501'; END IF;
  ELSE
    IF actor NOT IN (OLD.sender_id, OLD.receiver_id) THEN
      RAISE EXCEPTION 'Conversation membership required' USING ERRCODE = '42501';
    END IF;
    IF (to_jsonb(NEW) - ARRAY['deleted_by','status','delivered_at','seen_at','delivered_to','seen_by'])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['deleted_by','status','delivered_at','seen_at','delivered_to','seen_by']) THEN
      RAISE EXCEPTION 'Message content and participants cannot be changed' USING ERRCODE = '42501';
    END IF;
    IF NOT (NEW.deleted_by @> OLD.deleted_by) OR EXISTS (
      SELECT 1 FROM unnest(NEW.deleted_by) d WHERE d <> actor::text AND NOT d = ANY(OLD.deleted_by)
    ) THEN RAISE EXCEPTION 'Only your own message visibility can be changed' USING ERRCODE = '42501'; END IF;
    IF actor <> OLD.receiver_id AND
      (to_jsonb(NEW) - 'deleted_by') IS DISTINCT FROM (to_jsonb(OLD) - 'deleted_by') THEN
      RAISE EXCEPTION 'Only the recipient can acknowledge messages' USING ERRCODE = '42501';
    END IF;
    IF actor = OLD.receiver_id AND (
      NOT (NEW.delivered_to <@ ARRAY[actor]) OR NOT (NEW.seen_by <@ ARRAY[actor])
      OR (OLD.seen_at IS NOT NULL AND NEW.seen_at IS DISTINCT FROM OLD.seen_at)
      OR (OLD.delivered_at IS NOT NULL AND NEW.delivered_at IS DISTINCT FROM OLD.delivered_at)
      OR (OLD.status='seen' AND NEW.status<>'seen') OR (OLD.status='delivered' AND NEW.status='sent')
      OR (NEW.status='seen' AND NEW.seen_at IS NULL)
      OR (NEW.status IN ('delivered','seen') AND NEW.delivered_at IS NULL)
    ) THEN RAISE EXCEPTION 'Invalid recipient acknowledgment' USING ERRCODE = '42501'; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_lovesathi_message_write() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_lovesathi_message_write ON public.messages;
CREATE TRIGGER guard_lovesathi_message_write BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION private.guard_lovesathi_message_write();

CREATE OR REPLACE FUNCTION public.mark_message_delivered(p_message_id uuid, p_user_id uuid)
RETURNS public.messages LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE result public.messages;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Recipient session required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.messages SET delivered_at = coalesce(delivered_at, now()),
    delivered_to = ARRAY(SELECT DISTINCT unnest(delivered_to || ARRAY[p_user_id])),
    status = CASE WHEN status = 'sent' THEN 'delivered' ELSE status END
  WHERE id = p_message_id AND receiver_id = p_user_id RETURNING * INTO result;
  RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.mark_message_seen(p_message_id uuid, p_user_id uuid)
RETURNS public.messages LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE result public.messages;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Recipient session required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.messages SET seen_at = coalesce(seen_at, now()), delivered_at = coalesce(delivered_at, now()),
    seen_by = ARRAY(SELECT DISTINCT unnest(seen_by || ARRAY[p_user_id])),
    delivered_to = ARRAY(SELECT DISTINCT unnest(delivered_to || ARRAY[p_user_id])), status = 'seen'
  WHERE id = p_message_id AND receiver_id = p_user_id RETURNING * INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.mark_message_delivered(uuid,uuid), public.mark_message_seen(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_message_delivered(uuid,uuid), public.mark_message_seen(uuid,uuid) TO authenticated;

-- Replace the live bucket-wide write policies with owner-folder checks.
DROP POLICY IF EXISTS "Delete 1ywduga_0" ON storage.objects;
DROP POLICY IF EXISTS "Upload 1ywduga_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own matrimony photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own matrimony photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own matrimony photos" ON storage.objects;
CREATE POLICY "Users can upload own matrimony photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='matrimony-photos' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY "Users can update own matrimony photos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='matrimony-photos' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text)
WITH CHECK (bucket_id='matrimony-photos' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY "Users can delete own matrimony photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='matrimony-photos' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
