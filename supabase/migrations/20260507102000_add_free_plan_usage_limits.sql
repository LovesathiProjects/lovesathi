-- Lovesathi free-plan usage limits.
-- Free members:
-- * 15 swipe actions every 12 hours.
-- * Message up to 5 people every 12 hours.
-- * Send up to 5 messages to each person every 12 hours.
-- * Shortlist up to 3 profiles until they have an active entitlement.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'premium',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  active_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON public.user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_status ON public.user_entitlements(status);

CREATE OR REPLACE FUNCTION public.update_user_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_entitlements_timestamp ON public.user_entitlements;
CREATE TRIGGER trigger_update_user_entitlements_timestamp
  BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_entitlements_updated_at();

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own entitlements" ON public.user_entitlements;
CREATE POLICY "Users can view own entitlements"
  ON public.user_entitlements FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_lovesathi_premium(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_entitlements
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing')
      AND (active_until IS NULL OR active_until > TIMEZONE('utc', NOW()))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_lovesathi_premium(UUID) TO authenticated;

CREATE TABLE IF NOT EXISTS public.matrimony_swipe_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('like', 'pass', 'connect')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_matrimony_swipe_usage_user_created
  ON public.matrimony_swipe_usage(user_id, created_at DESC);

ALTER TABLE public.matrimony_swipe_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own swipe usage" ON public.matrimony_swipe_usage;
CREATE POLICY "Users can view own swipe usage"
  ON public.matrimony_swipe_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_matrimony_swipe_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_swipe_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE := TIMEZONE('utc', NOW()) - INTERVAL '12 hours';
BEGIN
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

CREATE OR REPLACE FUNCTION public.enforce_free_message_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_same_person_count INTEGER;
  v_distinct_people_count INTEGER;
  v_has_messaged_receiver BOOLEAN;
  v_window_start TIMESTAMP WITH TIME ZONE := TIMEZONE('utc', NOW()) - INTERVAL '12 hours';
BEGIN
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

CREATE OR REPLACE FUNCTION public.enforce_free_shortlist_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_shortlist_count INTEGER;
BEGIN
  IF public.is_lovesathi_premium(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.shortlists
    WHERE user_id = NEW.user_id
      AND shortlisted_user_id = NEW.shortlisted_user_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO v_shortlist_count
  FROM public.shortlists
  WHERE user_id = NEW.user_id;

  IF v_shortlist_count >= 3 THEN
    RAISE EXCEPTION 'Free plan shortlist limit reached. You can save 3 profiles. Upgrade for unlimited shortlists.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_free_shortlist_limit_before_insert ON public.shortlists;
CREATE TRIGGER enforce_free_shortlist_limit_before_insert
  BEFORE INSERT ON public.shortlists
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_free_shortlist_limit();

DROP POLICY IF EXISTS "Users can update their shortlist entries" ON public.shortlists;
CREATE POLICY "Users can update their shortlist entries"
  ON public.shortlists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
