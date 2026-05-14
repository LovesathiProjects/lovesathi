-- Real account settings, public profile IDs, profile hiding, and premium direct-chat support.

ALTER TABLE public.matrimony_profile_full
ADD COLUMN IF NOT EXISTS public_profile_id TEXT,
ADD COLUMN IF NOT EXISTS profile_hidden BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profile_hidden_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS matrimony_profile_full_public_profile_id_key
  ON public.matrimony_profile_full(public_profile_id)
  WHERE public_profile_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_lovesathi_public_profile_id(p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN 'LS' || UPPER(SUBSTR(MD5(COALESCE(p_user_id::TEXT, 'lovesathi')), 1, 10));
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

UPDATE public.matrimony_profile_full
SET public_profile_id = public.generate_lovesathi_public_profile_id(user_id)
WHERE public_profile_id IS NULL OR BTRIM(public_profile_id) = '';

CREATE OR REPLACE FUNCTION public.set_lovesathi_public_profile_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_profile_id IS NULL OR BTRIM(NEW.public_profile_id) = '' THEN
    NEW.public_profile_id := public.generate_lovesathi_public_profile_id(NEW.user_id);
  END IF;

  IF NEW.profile_hidden IS FALSE THEN
    NEW.profile_hidden_at := NULL;
  ELSIF NEW.profile_hidden IS TRUE AND NEW.profile_hidden_at IS NULL THEN
    NEW.profile_hidden_at := TIMEZONE('utc', NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_lovesathi_public_profile_id_before_write ON public.matrimony_profile_full;
CREATE TRIGGER set_lovesathi_public_profile_id_before_write
  BEFORE INSERT OR UPDATE OF user_id, public_profile_id, profile_hidden ON public.matrimony_profile_full
  FOR EACH ROW
  EXECUTE FUNCTION public.set_lovesathi_public_profile_id();

CREATE TABLE IF NOT EXISTS public.user_app_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  privacy_settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  notification_settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  profile_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.user_app_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_lovesathi_user_app_settings()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS touch_lovesathi_user_app_settings_before_update ON public.user_app_settings;
CREATE TRIGGER touch_lovesathi_user_app_settings_before_update
  BEFORE UPDATE ON public.user_app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_lovesathi_user_app_settings();

DROP POLICY IF EXISTS user_app_settings_select_own ON public.user_app_settings;
CREATE POLICY user_app_settings_select_own
  ON public.user_app_settings
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_app_settings_insert_own ON public.user_app_settings;
CREATE POLICY user_app_settings_insert_own
  ON public.user_app_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_app_settings_update_own ON public.user_app_settings;
CREATE POLICY user_app_settings_update_own
  ON public.user_app_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_app_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.create_lovesathi_premium_direct_match(p_other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_request_user UUID := auth.uid();
  v_user1 UUID;
  v_user2 UUID;
  v_match_id UUID;
BEGIN
  IF v_request_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_other_user_id IS NULL OR p_other_user_id = v_request_user THEN
    RAISE EXCEPTION 'A valid profile is required.';
  END IF;

  IF NOT public.is_lovesathi_premium(v_request_user) THEN
    RAISE EXCEPTION 'Premium membership is required for direct chat.';
  END IF;

  v_user1 := LEAST(v_request_user, p_other_user_id);
  v_user2 := GREATEST(v_request_user, p_other_user_id);

  INSERT INTO public.matrimony_likes (liker_id, liked_id, action)
  VALUES (v_request_user, p_other_user_id, 'connect')
  ON CONFLICT (liker_id, liked_id) DO UPDATE
    SET action = 'connect';

  INSERT INTO public.matrimony_matches (user1_id, user2_id, is_active)
  VALUES (v_user1, v_user2, TRUE)
  ON CONFLICT (user1_id, user2_id) DO UPDATE
    SET is_active = TRUE
  RETURNING id INTO v_match_id;

  RETURN v_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_lovesathi_premium_direct_match(UUID) TO authenticated;
