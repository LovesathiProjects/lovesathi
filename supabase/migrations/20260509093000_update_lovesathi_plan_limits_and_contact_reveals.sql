-- Lovesathi tiered plan limits, contact reveal accounting, and launch discount support.

CREATE TABLE IF NOT EXISTS public.lovesathi_contact_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revealed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  CONSTRAINT lovesathi_contact_reveals_unique UNIQUE (viewer_id, viewed_user_id),
  CONSTRAINT lovesathi_contact_reveals_no_self CHECK (viewer_id <> viewed_user_id)
);

CREATE INDEX IF NOT EXISTS idx_lovesathi_contact_reveals_viewer_created
  ON public.lovesathi_contact_reveals(viewer_id, created_at DESC);

ALTER TABLE public.lovesathi_contact_reveals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own contact reveals" ON public.lovesathi_contact_reveals;
CREATE POLICY "Users can view own contact reveals"
  ON public.lovesathi_contact_reveals FOR SELECT
  USING (auth.uid() = viewer_id);

CREATE OR REPLACE FUNCTION public.lovesathi_normalized_plan_id(p_plan_id TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE COALESCE(p_plan_id, 'essential')
    WHEN 'monthly' THEN 'essential'
    WHEN 'quarterly' THEN 'signature'
    WHEN 'yearly' THEN 'heritage'
    WHEN 'premium' THEN 'essential'
    ELSE COALESCE(p_plan_id, 'essential')
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.lovesathi_plan_shortlist_limit(p_plan_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE public.lovesathi_normalized_plan_id(p_plan_id)
    WHEN 'basic' THEN 30
    WHEN 'essential' THEN 70
    WHEN 'signature' THEN 400
    WHEN 'heritage' THEN NULL
    ELSE 70
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.lovesathi_plan_monthly_super_like_limit(p_plan_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE public.lovesathi_normalized_plan_id(p_plan_id)
    WHEN 'basic' THEN 5
    WHEN 'essential' THEN 15
    WHEN 'signature' THEN 30
    WHEN 'heritage' THEN NULL
    ELSE 15
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.lovesathi_plan_contact_view_limit(p_plan_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE public.lovesathi_normalized_plan_id(p_plan_id)
    WHEN 'basic' THEN 15
    WHEN 'essential' THEN 70
    WHEN 'signature' THEN 700
    WHEN 'heritage' THEN NULL
    ELSE 70
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.lovesathi_plan_chat_profile_limit(p_plan_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE public.lovesathi_normalized_plan_id(p_plan_id)
    WHEN 'basic' THEN 50
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

DROP FUNCTION IF EXISTS public.get_lovesathi_profile_contacts(UUID[]);
CREATE FUNCTION public.get_lovesathi_profile_contacts(p_user_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  phone_masked TEXT,
  phone_revealed TEXT,
  can_reveal BOOLEAN,
  remaining_contact_views INTEGER
) AS $$
DECLARE
  v_request_user UUID := auth.uid();
  v_plan_id TEXT;
  v_entitlement_created_at TIMESTAMP WITH TIME ZONE;
  v_limit INTEGER;
  v_used INTEGER := 0;
BEGIN
  SELECT plan_id, created_at
    INTO v_plan_id, v_entitlement_created_at
  FROM public.user_entitlements
  WHERE user_id = v_request_user
    AND status IN ('active', 'trialing')
    AND (active_until IS NULL OR active_until > TIMEZONE('utc', NOW()))
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_plan_id IS NOT NULL THEN
    v_limit := public.lovesathi_plan_contact_view_limit(v_plan_id);
    IF v_limit IS NOT NULL THEN
      SELECT COUNT(DISTINCT viewed_user_id)
        INTO v_used
      FROM public.lovesathi_contact_reveals
      WHERE viewer_id = v_request_user
        AND created_at >= COALESCE(v_entitlement_created_at, '1970-01-01'::timestamptz);
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    profile.user_id,
    public.mask_lovesathi_phone(contact.phone_raw) AS phone_masked,
    CASE
      WHEN profile.user_id = v_request_user OR reveal.id IS NOT NULL THEN contact.phone_raw
      ELSE NULL
    END AS phone_revealed,
    CASE
      WHEN profile.user_id = v_request_user THEN TRUE
      WHEN v_plan_id IS NULL THEN FALSE
      WHEN reveal.id IS NOT NULL THEN TRUE
      WHEN v_limit IS NULL THEN TRUE
      ELSE v_used < v_limit
    END AS can_reveal,
    CASE
      WHEN v_plan_id IS NULL OR v_limit IS NULL THEN NULL
      ELSE GREATEST(v_limit - v_used, 0)
    END AS remaining_contact_views
  FROM public.user_profiles AS profile
  LEFT JOIN auth.users AS auth_user
    ON auth_user.id = profile.user_id
  LEFT JOIN public.lovesathi_contact_reveals AS reveal
    ON reveal.viewer_id = v_request_user
   AND reveal.viewed_user_id = profile.user_id
  CROSS JOIN LATERAL (
    SELECT NULLIF(TRIM(COALESCE(profile.phone, auth_user.phone, auth_user.raw_user_meta_data->>'phone')), '') AS phone_raw
  ) AS contact
  WHERE profile.user_id = ANY(COALESCE(p_user_ids, ARRAY[]::UUID[]));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.reveal_lovesathi_profile_contact(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  phone_masked TEXT,
  phone_revealed TEXT,
  can_reveal BOOLEAN,
  remaining_contact_views INTEGER
) AS $$
DECLARE
  v_request_user UUID := auth.uid();
  v_phone TEXT;
  v_plan_id TEXT;
  v_entitlement_created_at TIMESTAMP WITH TIME ZONE;
  v_limit INTEGER;
  v_used INTEGER := 0;
  v_already_revealed BOOLEAN := FALSE;
BEGIN
  IF v_request_user IS NULL THEN
    RAISE EXCEPTION 'Please sign in to reveal contact details.';
  END IF;

  SELECT NULLIF(TRIM(COALESCE(profile.phone, auth_user.phone, auth_user.raw_user_meta_data->>'phone')), '')
    INTO v_phone
  FROM public.user_profiles AS profile
  LEFT JOIN auth.users AS auth_user
    ON auth_user.id = profile.user_id
  WHERE profile.user_id = p_user_id;

  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'This profile does not have a contact number available.';
  END IF;

  IF p_user_id = v_request_user THEN
    RETURN QUERY SELECT p_user_id, public.mask_lovesathi_phone(v_phone), v_phone, TRUE, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.lovesathi_contact_reveals
    WHERE viewer_id = v_request_user
      AND viewed_user_id = p_user_id
  ) INTO v_already_revealed;

  SELECT plan_id, created_at
    INTO v_plan_id, v_entitlement_created_at
  FROM public.user_entitlements
  WHERE user_id = v_request_user
    AND status IN ('active', 'trialing')
    AND (active_until IS NULL OR active_until > TIMEZONE('utc', NOW()))
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Subscribe to reveal masked phone numbers safely inside Lovesathi.';
  END IF;

  v_limit := public.lovesathi_plan_contact_view_limit(v_plan_id);

  IF v_limit IS NOT NULL THEN
    SELECT COUNT(DISTINCT viewed_user_id)
      INTO v_used
    FROM public.lovesathi_contact_reveals
    WHERE viewer_id = v_request_user
      AND created_at >= COALESCE(v_entitlement_created_at, '1970-01-01'::timestamptz);

    IF NOT v_already_revealed AND v_used >= v_limit THEN
      RAISE EXCEPTION '% contact reveal limit reached. Upgrade for more contact views.', INITCAP(public.lovesathi_normalized_plan_id(v_plan_id));
    END IF;
  END IF;

  INSERT INTO public.lovesathi_contact_reveals (viewer_id, viewed_user_id)
  VALUES (v_request_user, p_user_id)
  ON CONFLICT (viewer_id, viewed_user_id)
  DO UPDATE SET revealed_at = TIMEZONE('utc', NOW());

  IF v_limit IS NOT NULL AND NOT v_already_revealed THEN
    v_used := v_used + 1;
  END IF;

  RETURN QUERY
  SELECT
    p_user_id,
    public.mask_lovesathi_phone(v_phone),
    v_phone,
    TRUE,
    CASE WHEN v_limit IS NULL THEN NULL ELSE GREATEST(v_limit - v_used, 0) END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_lovesathi_profile_contacts(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_lovesathi_profile_contact(UUID) TO authenticated;

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
    SELECT plan_id
      INTO v_plan_id
    FROM public.user_entitlements
    WHERE user_id = NEW.liker_id
      AND status IN ('active', 'trialing')
      AND (active_until IS NULL OR active_until > TIMEZONE('utc', NOW()))
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF v_plan_id IS NULL THEN
      RAISE EXCEPTION 'Super Likes are a premium feature. Choose a paid plan to send standout interest.';
    END IF;

    v_super_like_limit := public.lovesathi_plan_monthly_super_like_limit(v_plan_id);
    IF v_super_like_limit IS NULL THEN
      RETURN NEW;
    END IF;

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

CREATE OR REPLACE FUNCTION public.enforce_free_shortlist_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_shortlist_count INTEGER;
  v_plan_id TEXT;
  v_shortlist_limit INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.shortlists
    WHERE user_id = NEW.user_id
      AND shortlisted_user_id = NEW.shortlisted_user_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT plan_id
    INTO v_plan_id
  FROM public.user_entitlements
  WHERE user_id = NEW.user_id
    AND status IN ('active', 'trialing')
    AND (active_until IS NULL OR active_until > TIMEZONE('utc', NOW()))
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  v_shortlist_limit := CASE
    WHEN v_plan_id IS NULL THEN 3
    ELSE public.lovesathi_plan_shortlist_limit(v_plan_id)
  END;

  IF v_shortlist_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO v_shortlist_count
  FROM public.shortlists
  WHERE user_id = NEW.user_id;

  IF v_shortlist_count >= v_shortlist_limit THEN
    RAISE EXCEPTION 'Shortlist limit reached. Your plan includes % shortlist saves.', v_shortlist_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_free_message_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_same_person_count INTEGER;
  v_distinct_people_count INTEGER;
  v_has_messaged_receiver BOOLEAN;
  v_plan_id TEXT;
  v_entitlement_created_at TIMESTAMP WITH TIME ZONE;
  v_chat_profile_limit INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE := TIMEZONE('utc', NOW()) - INTERVAL '12 hours';
BEGIN
  IF public.message_contains_contact_number(NEW.content)
    OR public.message_context_contains_contact_number(NEW.match_id, NEW.sender_id, NEW.receiver_id, NEW.content) THEN
    RAISE EXCEPTION 'For safety, phone numbers cannot be shared in chat. Use premium contact reveal instead.';
  END IF;

  SELECT plan_id, created_at
    INTO v_plan_id, v_entitlement_created_at
  FROM public.user_entitlements
  WHERE user_id = NEW.sender_id
    AND status IN ('active', 'trialing')
    AND (active_until IS NULL OR active_until > TIMEZONE('utc', NOW()))
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_plan_id IS NOT NULL THEN
    v_chat_profile_limit := public.lovesathi_plan_chat_profile_limit(v_plan_id);
    IF v_chat_profile_limit IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT COUNT(DISTINCT receiver_id)
      INTO v_distinct_people_count
    FROM public.messages
    WHERE sender_id = NEW.sender_id
      AND created_at >= COALESCE(v_entitlement_created_at, '1970-01-01'::timestamptz);

    SELECT EXISTS (
      SELECT 1
      FROM public.messages
      WHERE sender_id = NEW.sender_id
        AND receiver_id = NEW.receiver_id
        AND created_at >= COALESCE(v_entitlement_created_at, '1970-01-01'::timestamptz)
    ) INTO v_has_messaged_receiver;

    IF v_distinct_people_count >= v_chat_profile_limit AND NOT v_has_messaged_receiver THEN
      RAISE EXCEPTION '% plan chat limit reached. Upgrade for unlimited chat.', INITCAP(public.lovesathi_normalized_plan_id(v_plan_id));
    END IF;

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
