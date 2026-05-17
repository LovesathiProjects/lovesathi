-- Broaden chat safety from phone-number blocking to contact-detail blocking.
-- Premium members should reveal phone numbers through the controlled contact reveal flow, not chat.

CREATE OR REPLACE FUNCTION public.message_contains_shareable_contact(p_content TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_text TEXT := LOWER(COALESCE(p_content, ''));
BEGIN
  IF LENGTH(public.normalize_lovesathi_contact_digits(p_content)) >= 4 THEN
    RETURN TRUE;
  END IF;

  IF v_text ~* '[a-z0-9._%+\-]{2,}[[:space:]]*@[[:space:]]*[a-z0-9.\-]{2,}[[:space:]]*\.[[:space:]]*[a-z]{2,}' THEN
    RETURN TRUE;
  END IF;

  IF v_text ~* '(gmail|yahoo|icloud|outlook|hotmail|proton|rediffmail|mail)[^a-z0-9]{0,15}(dot|\.)[^a-z0-9]{0,15}(com|in|co|net|org)' THEN
    RETURN TRUE;
  END IF;

  IF v_text ~* '(wa\.me|whatsapp\.com|t\.me|telegram\.me|telegram\.org|instagram\.com|facebook\.com|fb\.com|snapchat\.com|signal\.me)' THEN
    RETURN TRUE;
  END IF;

  IF v_text ~* '(^|[^a-z0-9_])@[a-z0-9._]{3,}' THEN
    RETURN TRUE;
  END IF;

  IF v_text ~* '(message|msg|dm|ping|text|call|reach|contact)[^a-z0-9]{1,20}(me[^a-z0-9]{1,20})?(on|at|via)[^a-z0-9]{1,20}(whatsapp|watsapp|wa|instagram|insta|ig|telegram|tg|snapchat|snap|facebook|fb|signal)' THEN
    RETURN TRUE;
  END IF;

  IF v_text ~* '(send|share|give|drop|type)[^a-z0-9]{1,20}(me[^a-z0-9]{1,20})?(your|ur|u r)?[^a-z0-9]{0,20}(phone|mobile|number|digits|contact|whatsapp|wa)' THEN
    RETURN TRUE;
  END IF;

  IF v_text ~* '(^|[^a-z0-9])(my|mine|mera|meri)[^a-z0-9]{1,20}(telegram|tg|insta|instagram|ig|snap|snapchat|facebook|fb|signal)[^a-z0-9]{0,20}(id|handle|username|user)?[^a-z0-9]{0,20}(is|:|-)[^a-z0-9]{0,20}@?[a-z0-9._]{3,}' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.message_contains_contact_number(p_content TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.message_contains_shareable_contact(p_content);
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.message_context_contains_contact_number(
  p_match_id UUID,
  p_sender_id UUID,
  p_receiver_id UUID,
  p_content TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_digits TEXT;
  v_previous_content TEXT;
  v_context TEXT;
BEGIN
  IF public.message_contains_shareable_contact(p_content) THEN
    RETURN TRUE;
  END IF;

  v_current_digits := public.normalize_lovesathi_contact_digits(p_content);

  SELECT COALESCE(STRING_AGG(recent.content, ' ' ORDER BY recent.created_at), '')
    INTO v_previous_content
  FROM (
    SELECT content, created_at
    FROM public.messages
    WHERE match_id = p_match_id
      AND sender_id = p_sender_id
      AND receiver_id = p_receiver_id
    ORDER BY created_at DESC
    LIMIT 12
  ) AS recent;

  v_context := TRIM(COALESCE(v_previous_content, '') || ' ' || COALESCE(p_content, ''));

  IF v_context = '' THEN
    RETURN FALSE;
  END IF;

  IF v_current_digits <> '' AND LENGTH(public.normalize_lovesathi_contact_digits(v_context)) >= 4 THEN
    RETURN TRUE;
  END IF;

  RETURN public.message_contains_shareable_contact(v_context);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.message_contains_shareable_contact(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.message_contains_contact_number(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.message_context_contains_contact_number(UUID, UUID, UUID, TEXT) TO authenticated;

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
    RAISE EXCEPTION 'For safety, contact details cannot be shared in chat. Premium members can reveal phone numbers from the profile.';
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
