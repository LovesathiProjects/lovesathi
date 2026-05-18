-- Lovesathi Basic-only launch offer and free starter discovery allowances.
-- Free members can now save 3 profiles, send 3 Super Likes/month, and open
-- 3 starter direct chats with free profiles. Starter direct chats allow one
-- outgoing message per profile unless the member upgrades.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.lovesathi_free_direct_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matrimony_matches(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  CONSTRAINT lovesathi_free_direct_chats_no_self CHECK (initiator_id <> recipient_id),
  CONSTRAINT lovesathi_free_direct_chats_unique UNIQUE (initiator_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_lovesathi_free_direct_chats_initiator_created
  ON public.lovesathi_free_direct_chats(initiator_id, created_at DESC);

ALTER TABLE public.lovesathi_free_direct_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lovesathi_free_direct_chats_select_own ON public.lovesathi_free_direct_chats;
CREATE POLICY lovesathi_free_direct_chats_select_own
  ON public.lovesathi_free_direct_chats
  FOR SELECT
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS lovesathi_free_direct_chats_insert_own ON public.lovesathi_free_direct_chats;
CREATE POLICY lovesathi_free_direct_chats_insert_own
  ON public.lovesathi_free_direct_chats
  FOR INSERT
  WITH CHECK (auth.uid() = initiator_id);

DROP POLICY IF EXISTS lovesathi_free_direct_chats_update_own ON public.lovesathi_free_direct_chats;
CREATE POLICY lovesathi_free_direct_chats_update_own
  ON public.lovesathi_free_direct_chats
  FOR UPDATE
  USING (auth.uid() = initiator_id)
  WITH CHECK (auth.uid() = initiator_id);

GRANT SELECT, INSERT, UPDATE ON public.lovesathi_free_direct_chats TO authenticated;

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
    AND public.lovesathi_entitlement_has_access(status, active_until, renewal_due_at, grace_until)
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
    IF v_plan_id IS NULL THEN
      RAISE EXCEPTION 'Free plan shortlist limit reached. You can save 3 profiles. Upgrade for more shortlist space.';
    END IF;

    RAISE EXCEPTION '% shortlist limit reached. Your plan includes % shortlist saves.',
      INITCAP(public.lovesathi_normalized_plan_id(v_plan_id)),
      v_shortlist_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
      AND public.lovesathi_entitlement_has_access(status, active_until, renewal_due_at, grace_until)
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    v_super_like_limit := CASE
      WHEN v_plan_id IS NULL THEN 3
      ELSE public.lovesathi_plan_monthly_super_like_limit(v_plan_id)
    END;

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
      IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'Free plan Super Like limit reached. You can send 3 Super Likes each month. Upgrade for more standout interests.';
      END IF;

      RAISE EXCEPTION 'Monthly Super Like allowance reached. Your plan includes % Super Likes each month.',
        v_super_like_limit;
    END IF;

    RETURN NEW;
  END IF;

  IF public.is_lovesathi_premium(NEW.liker_id) THEN
    RETURN NEW;
  END IF;

  -- Direct chat has its own starter allowance, so it should not consume swipe quota.
  IF NEW.action = 'connect' THEN
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

CREATE OR REPLACE FUNCTION public.create_lovesathi_premium_direct_match(p_other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_request_user UUID := auth.uid();
  v_user1 UUID;
  v_user2 UUID;
  v_match_id UUID;
  v_request_is_premium BOOLEAN;
  v_target_is_premium BOOLEAN;
  v_existing_free_chat_id UUID;
  v_free_direct_count INTEGER;
BEGIN
  IF v_request_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_other_user_id IS NULL OR p_other_user_id = v_request_user THEN
    RAISE EXCEPTION 'A valid profile is required.';
  END IF;

  v_request_is_premium := public.is_lovesathi_premium(v_request_user);
  v_target_is_premium := public.is_lovesathi_premium(p_other_user_id);

  IF NOT v_request_is_premium THEN
    IF v_target_is_premium THEN
      RAISE EXCEPTION 'Free starter direct chat is available only with free profiles. Upgrade to chat directly with premium profiles.';
    END IF;

    SELECT id
      INTO v_existing_free_chat_id
    FROM public.lovesathi_free_direct_chats
    WHERE initiator_id = v_request_user
      AND recipient_id = p_other_user_id
    LIMIT 1;

    IF v_existing_free_chat_id IS NULL THEN
      SELECT COUNT(*)
        INTO v_free_direct_count
      FROM public.lovesathi_free_direct_chats
      WHERE initiator_id = v_request_user;

      IF v_free_direct_count >= 3 THEN
        RAISE EXCEPTION 'Free plan direct chat limit reached. You can open 3 starter chats with free profiles and send 1 message to each. Upgrade for unlimited chat.';
      END IF;
    END IF;
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

  IF NOT v_request_is_premium THEN
    INSERT INTO public.lovesathi_free_direct_chats (initiator_id, recipient_id, match_id)
    VALUES (v_request_user, p_other_user_id, v_match_id)
    ON CONFLICT (initiator_id, recipient_id) DO UPDATE
      SET match_id = EXCLUDED.match_id,
          updated_at = TIMEZONE('utc', NOW());
  END IF;

  RETURN v_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_lovesathi_premium_direct_match(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_free_message_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_same_person_count INTEGER;
  v_distinct_people_count INTEGER;
  v_has_messaged_receiver BOOLEAN;
  v_plan_id TEXT;
  v_entitlement_created_at TIMESTAMP WITH TIME ZONE;
  v_chat_profile_limit INTEGER;
  v_free_direct_created_at TIMESTAMP WITH TIME ZONE;
  v_free_direct_message_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE := TIMEZONE('utc', NOW()) - INTERVAL '12 hours';
BEGIN
  IF public.message_contains_contact_number(NEW.content)
    OR public.message_context_contains_contact_number(NEW.match_id, NEW.sender_id, NEW.receiver_id, NEW.content) THEN
    RAISE EXCEPTION 'For safety, contact details cannot be shared in chat. Premium members can reveal phone numbers from the profile.';
  END IF;

  SELECT plan_id, created_at
    INTO v_plan_id, v_entitlement_created_at
  FROM public.user_entitlements
  WHERE user_id = NEW.sender_id
    AND public.lovesathi_entitlement_has_access(status, active_until, renewal_due_at, grace_until)
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

  SELECT created_at
    INTO v_free_direct_created_at
  FROM public.lovesathi_free_direct_chats
  WHERE initiator_id = NEW.sender_id
    AND recipient_id = NEW.receiver_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_free_direct_created_at IS NOT NULL THEN
    SELECT COUNT(*)
      INTO v_free_direct_message_count
    FROM public.messages
    WHERE sender_id = NEW.sender_id
      AND receiver_id = NEW.receiver_id
      AND created_at >= v_free_direct_created_at;

    IF v_free_direct_message_count >= 1 THEN
      RAISE EXCEPTION 'Free starter direct chat includes one message per profile. Upgrade for unlimited chat.';
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
