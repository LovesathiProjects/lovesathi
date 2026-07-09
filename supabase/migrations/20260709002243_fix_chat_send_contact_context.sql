CREATE OR REPLACE FUNCTION public.message_context_contains_contact_number(
  p_match_id UUID,
  p_sender_id UUID,
  p_receiver_id UUID,
  p_content TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_digits TEXT;
  v_current_text TEXT := LOWER(COALESCE(p_content, ''));
  v_current_has_contact_context BOOLEAN;
  v_previous_content TEXT;
  v_context TEXT;
BEGIN
  IF public.message_contains_shareable_contact(p_content) THEN
    RETURN TRUE;
  END IF;

  v_current_digits := public.normalize_lovesathi_contact_digits(p_content);
  v_current_has_contact_context :=
    v_current_text ~ '[0-9]'
    OR LENGTH(v_current_digits) >= 2
    OR v_current_text ~* '(phone|mobile|number|digits|contact|whatsapp|watsapp|wa|instagram|insta|ig|telegram|tg|snapchat|snap|facebook|fb|signal|email|gmail|yahoo|icloud|outlook|hotmail|dm|message|msg|text|call|reach|handle|username)';

  IF NOT v_current_has_contact_context THEN
    RETURN FALSE;
  END IF;

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

  IF v_current_has_contact_context THEN
    RETURN public.message_contains_shareable_contact(v_context);
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.message_context_contains_contact_number(UUID, UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.message_context_contains_contact_number(UUID, UUID, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.message_context_contains_contact_number(UUID, UUID, UUID, TEXT) FROM authenticated;
