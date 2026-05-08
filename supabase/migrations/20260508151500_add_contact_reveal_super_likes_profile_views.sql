-- Contact safety, super likes, and profile-view telemetry for Lovesathi.

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

UPDATE public.user_profiles AS profile
SET phone = NULLIF(TRIM(COALESCE(profile.phone, auth_user.phone, auth_user.raw_user_meta_data->>'phone')), '')
FROM auth.users AS auth_user
WHERE profile.user_id = auth_user.id
  AND NULLIF(TRIM(COALESCE(profile.phone, '')), '') IS NULL;

CREATE OR REPLACE FUNCTION public.require_lovesathi_profile_phone()
RETURNS TRIGGER AS $$
DECLARE
  v_digits TEXT;
BEGIN
  NEW.phone = NULLIF(TRIM(COALESCE(NEW.phone, '')), '');
  v_digits := regexp_replace(COALESCE(NEW.phone, ''), '[^0-9]', '', 'g');

  IF NEW.phone IS NULL THEN
    RAISE EXCEPTION 'Phone number is required.';
  END IF;

  IF LENGTH(v_digits) < 8 OR LENGTH(v_digits) > 15 THEN
    RAISE EXCEPTION 'Please enter a valid phone number.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS require_lovesathi_profile_phone_before_write ON public.user_profiles;
CREATE TRIGGER require_lovesathi_profile_phone_before_write
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.require_lovesathi_profile_phone();

CREATE OR REPLACE FUNCTION public.mask_lovesathi_phone(p_phone TEXT)
RETURNS TEXT AS $$
DECLARE
  v_digits TEXT := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
BEGIN
  IF NULLIF(TRIM(COALESCE(p_phone, '')), '') IS NULL THEN
    RETURN NULL;
  END IF;

  IF LENGTH(v_digits) <= 4 THEN
    RETURN '****';
  END IF;

  RETURN '+** ******' || RIGHT(v_digits, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_lovesathi_profile_contacts(p_user_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  phone_masked TEXT,
  phone_revealed TEXT,
  can_reveal BOOLEAN
) AS $$
DECLARE
  v_request_user UUID := auth.uid();
  v_can_reveal BOOLEAN := public.is_lovesathi_premium(auth.uid());
BEGIN
  RETURN QUERY
  SELECT
    profile.user_id,
    public.mask_lovesathi_phone(contact.phone_raw) AS phone_masked,
    CASE
      WHEN profile.user_id = v_request_user OR v_can_reveal THEN contact.phone_raw
      ELSE NULL
    END AS phone_revealed,
    (profile.user_id = v_request_user OR v_can_reveal) AS can_reveal
  FROM public.user_profiles AS profile
  LEFT JOIN auth.users AS auth_user
    ON auth_user.id = profile.user_id
  CROSS JOIN LATERAL (
    SELECT NULLIF(TRIM(COALESCE(profile.phone, auth_user.phone, auth_user.raw_user_meta_data->>'phone')), '') AS phone_raw
  ) AS contact
  WHERE profile.user_id = ANY(COALESCE(p_user_ids, ARRAY[]::UUID[]));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_lovesathi_profile_contacts(UUID[]) TO authenticated;

ALTER TABLE public.matrimony_likes
DROP CONSTRAINT IF EXISTS matrimony_likes_action_check;

ALTER TABLE public.matrimony_likes
ADD CONSTRAINT matrimony_likes_action_check
CHECK (action IN ('like', 'pass', 'connect', 'super_like'));

ALTER TABLE public.matrimony_swipe_usage
DROP CONSTRAINT IF EXISTS matrimony_swipe_usage_action_check;

ALTER TABLE public.matrimony_swipe_usage
ADD CONSTRAINT matrimony_swipe_usage_action_check
CHECK (action IN ('like', 'pass', 'connect', 'super_like'));

CREATE OR REPLACE FUNCTION public.create_matrimony_match()
RETURNS TRIGGER AS $$
DECLARE
  mutual_like_exists BOOLEAN;
BEGIN
  IF NEW.action IN ('like', 'connect', 'super_like') THEN
    SELECT EXISTS(
      SELECT 1
      FROM public.matrimony_likes
      WHERE liker_id = NEW.liked_id
        AND liked_id = NEW.liker_id
        AND action IN ('like', 'connect', 'super_like')
    ) INTO mutual_like_exists;

    IF mutual_like_exists THEN
      INSERT INTO public.matrimony_matches (user1_id, user2_id)
      VALUES (
        LEAST(NEW.liker_id, NEW.liked_id),
        GREATEST(NEW.liker_id, NEW.liked_id)
      )
      ON CONFLICT (user1_id, user2_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_matrimony_match ON public.matrimony_likes;
CREATE TRIGGER trigger_matrimony_match
  AFTER INSERT ON public.matrimony_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_matrimony_match();

DROP TRIGGER IF EXISTS trigger_matrimony_match_update ON public.matrimony_likes;
CREATE TRIGGER trigger_matrimony_match_update
  AFTER UPDATE ON public.matrimony_likes
  FOR EACH ROW
  WHEN (OLD.action != NEW.action AND NEW.action IN ('like', 'connect', 'super_like'))
  EXECUTE FUNCTION public.create_matrimony_match();

CREATE OR REPLACE FUNCTION public.enforce_matrimony_swipe_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_swipe_count INTEGER;
  v_super_like_count INTEGER;
  v_plan_id TEXT;
  v_super_like_limit INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE := TIMEZONE('utc', NOW()) - INTERVAL '12 hours';
  v_month_start TIMESTAMP WITH TIME ZONE := DATE_TRUNC('month', TIMEZONE('utc', NOW()));
BEGIN
  IF NEW.action = 'super_like' THEN
    IF NOT public.is_lovesathi_premium(NEW.liker_id) THEN
      RAISE EXCEPTION 'Super Likes are a premium feature. Choose a paid plan to send standout interest.';
    END IF;

    SELECT plan_id
      INTO v_plan_id
    FROM public.user_entitlements
    WHERE user_id = NEW.liker_id
      AND status IN ('active', 'trialing')
      AND (active_until IS NULL OR active_until > TIMEZONE('utc', NOW()))
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    v_super_like_limit := CASE v_plan_id
      WHEN 'yearly' THEN 100
      WHEN 'quarterly' THEN 25
      WHEN 'monthly' THEN 10
      ELSE 10
    END;

    SELECT COUNT(*)
      INTO v_super_like_count
    FROM public.matrimony_likes
    WHERE liker_id = NEW.liker_id
      AND action = 'super_like'
      AND created_at >= v_month_start
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF v_super_like_count >= v_super_like_limit THEN
      RAISE EXCEPTION 'Monthly Super Like allowance reached. Your plan includes % Super Likes each month.', v_super_like_limit;
    END IF;

    RETURN NEW;
  END IF;

  IF public.is_lovesathi_premium(NEW.liker_id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO v_swipe_count
  FROM public.matrimony_swipe_usage
  WHERE user_id = NEW.liker_id
    AND created_at >= v_window_start;

  IF v_swipe_count >= 15 THEN
    RAISE EXCEPTION 'Free plan swipe limit reached. You can review 15 profiles every 12 hours. Upgrade for unlimited discovery.';
  END IF;

  INSERT INTO public.matrimony_swipe_usage (user_id, target_user_id, action)
  VALUES (NEW.liker_id, NEW.liked_id, NEW.action);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_matrimony_swipe_limit_before_insert ON public.matrimony_likes;
CREATE TRIGGER enforce_matrimony_swipe_limit_before_insert
  BEFORE INSERT ON public.matrimony_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_matrimony_swipe_limit();

DROP TRIGGER IF EXISTS enforce_matrimony_swipe_limit_before_update ON public.matrimony_likes;
CREATE TRIGGER enforce_matrimony_swipe_limit_before_update
  BEFORE UPDATE OF action ON public.matrimony_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_matrimony_swipe_limit();

CREATE TABLE IF NOT EXISTS public.matrimony_profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  CONSTRAINT unique_matrimony_profile_view UNIQUE (viewer_id, viewed_user_id),
  CONSTRAINT no_self_matrimony_profile_view CHECK (viewer_id <> viewed_user_id)
);

CREATE INDEX IF NOT EXISTS idx_matrimony_profile_views_viewed_at
  ON public.matrimony_profile_views(viewed_user_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_matrimony_profile_views_viewer_at
  ON public.matrimony_profile_views(viewer_id, viewed_at DESC);

ALTER TABLE public.matrimony_profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can record profile views" ON public.matrimony_profile_views;
CREATE POLICY "Users can record profile views"
  ON public.matrimony_profile_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "Users can refresh profile views" ON public.matrimony_profile_views;
CREATE POLICY "Users can refresh profile views"
  ON public.matrimony_profile_views FOR UPDATE
  USING (auth.uid() = viewer_id)
  WITH CHECK (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "Users can read relevant profile views" ON public.matrimony_profile_views;
CREATE POLICY "Users can read relevant profile views"
  ON public.matrimony_profile_views FOR SELECT
  USING (auth.uid() = viewer_id OR auth.uid() = viewed_user_id);

CREATE OR REPLACE FUNCTION public.message_contains_contact_number(p_content TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_content TEXT := LOWER(COALESCE(p_content, ''));
  v_digits TEXT := regexp_replace(COALESCE(p_content, ''), '[^0-9]', '', 'g');
  v_digit_words TEXT := '(zero|one|two|three|four|five|six|seven|eight|nine|oh|o)';
BEGIN
  IF LENGTH(v_digits) >= 5 THEN
    RETURN TRUE;
  END IF;

  IF v_content ~ (v_digit_words || '([[:space:].,_-]+)' || v_digit_words || '([[:space:].,_-]+)' || v_digit_words || '([[:space:].,_-]+)' || v_digit_words) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_free_message_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_same_person_count INTEGER;
  v_distinct_people_count INTEGER;
  v_has_messaged_receiver BOOLEAN;
  v_window_start TIMESTAMP WITH TIME ZONE := TIMEZONE('utc', NOW()) - INTERVAL '12 hours';
BEGIN
  IF public.message_contains_contact_number(NEW.content) THEN
    RAISE EXCEPTION 'For safety, phone numbers cannot be shared in chat. Use premium contact reveal instead.';
  END IF;

  IF public.is_lovesathi_premium(NEW.sender_id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO v_same_person_count
  FROM public.messages
  WHERE sender_id = NEW.sender_id
    AND receiver_id = NEW.receiver_id
    AND created_at >= v_window_start;

  IF v_same_person_count >= 5 THEN
    RAISE EXCEPTION 'Free plan conversation limit reached. You can send 5 messages to each person every 12 hours. Upgrade for unlimited conversations.';
  END IF;

  SELECT COUNT(DISTINCT receiver_id)
    INTO v_distinct_people_count
  FROM public.messages
  WHERE sender_id = NEW.sender_id
    AND created_at >= v_window_start;

  SELECT EXISTS (
    SELECT 1
    FROM public.messages
    WHERE sender_id = NEW.sender_id
      AND receiver_id = NEW.receiver_id
      AND created_at >= v_window_start
  ) INTO v_has_messaged_receiver;

  IF v_distinct_people_count >= 5 AND NOT v_has_messaged_receiver THEN
    RAISE EXCEPTION 'Free plan message limit reached. You can text 5 people every 12 hours. Upgrade for unlimited conversations.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_free_message_limits_before_insert ON public.messages;
CREATE TRIGGER enforce_free_message_limits_before_insert
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_free_message_limits();
