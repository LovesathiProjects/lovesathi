-- Chat activity is intentionally private: it is only readable by a member and
-- their active matrimony matches, and it is only rendered inside chat screens.

CREATE TABLE IF NOT EXISTS public.lovesathi_chat_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lovesathi_chat_presence_last_seen
  ON public.lovesathi_chat_presence(last_seen_at DESC);

ALTER TABLE public.lovesathi_chat_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matched_members_can_read_lovesathi_chat_presence ON public.lovesathi_chat_presence;
CREATE POLICY matched_members_can_read_lovesathi_chat_presence
  ON public.lovesathi_chat_presence
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.matrimony_matches AS match
      WHERE match.is_active = TRUE
        AND (
          (match.user1_id = auth.uid() AND match.user2_id = lovesathi_chat_presence.user_id)
          OR (match.user2_id = auth.uid() AND match.user1_id = lovesathi_chat_presence.user_id)
        )
    )
  );

CREATE OR REPLACE FUNCTION public.touch_lovesathi_chat_presence()
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_last_seen_at TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  INSERT INTO public.lovesathi_chat_presence (user_id, last_seen_at, updated_at)
  VALUES (v_user_id, v_last_seen_at, v_last_seen_at)
  ON CONFLICT (user_id) DO UPDATE
    SET last_seen_at = EXCLUDED.last_seen_at,
        updated_at = EXCLUDED.updated_at;

  RETURN v_last_seen_at;
END;
$$;

REVOKE ALL ON TABLE public.lovesathi_chat_presence FROM anon, authenticated;
GRANT SELECT ON TABLE public.lovesathi_chat_presence TO authenticated;

REVOKE ALL ON FUNCTION public.touch_lovesathi_chat_presence() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_lovesathi_chat_presence() TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lovesathi_chat_presence;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
