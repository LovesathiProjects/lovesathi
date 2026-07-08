ALTER TABLE public.matrimony_matches
  ADD COLUMN IF NOT EXISTS archived_by UUID[] NOT NULL DEFAULT '{}'::UUID[];

CREATE INDEX IF NOT EXISTS idx_matrimony_matches_archived_by
  ON public.matrimony_matches USING GIN (archived_by);

CREATE OR REPLACE FUNCTION public.archive_lovesathi_match_for_user(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user UUID := auth.uid();
  v_is_member BOOLEAN;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.matrimony_matches
    WHERE id = p_match_id
      AND (user1_id = v_user OR user2_id = v_user)
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Match not found.';
  END IF;

  UPDATE public.matrimony_matches
  SET archived_by = ARRAY(
    SELECT DISTINCT member_id
    FROM unnest(archived_by || ARRAY[v_user]::UUID[]) AS member_id
  )
  WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.unarchive_lovesathi_match_for_user(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user UUID := auth.uid();
  v_is_member BOOLEAN;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.matrimony_matches
    WHERE id = p_match_id
      AND (user1_id = v_user OR user2_id = v_user)
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Match not found.';
  END IF;

  UPDATE public.matrimony_matches
  SET archived_by = array_remove(archived_by, v_user)
  WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.archive_lovesathi_match_for_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unarchive_lovesathi_match_for_user(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.archive_lovesathi_match_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unarchive_lovesathi_match_for_user(UUID) TO authenticated;
