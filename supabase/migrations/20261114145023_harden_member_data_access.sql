-- Stage 1: additive lookup. Apply before deploying clients that use the status RPC.
-- Applied to production on 2026-11-14 as migration 20261114145023.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION private.lovesathi_verification_statuses(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, verification_status varchar)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF cardinality(p_user_ids) > 1000 THEN RAISE EXCEPTION 'Too many profile IDs'; END IF;
  RETURN QUERY SELECT v.user_id, v.verification_status
    FROM public.id_verifications v WHERE v.user_id = ANY(p_user_ids);
END $$;
REVOKE ALL ON FUNCTION private.lovesathi_verification_statuses(uuid[]) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.lovesathi_verification_statuses(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_lovesathi_verification_statuses(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, verification_status varchar)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT * FROM private.lovesathi_verification_statuses(p_user_ids);
$$;
REVOKE ALL ON FUNCTION public.get_lovesathi_verification_statuses(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lovesathi_verification_statuses(uuid[]) TO authenticated;
