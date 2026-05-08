-- Harden chat contact-sharing detection across obfuscated and multi-message attempts.

CREATE OR REPLACE FUNCTION public.normalize_lovesathi_contact_digits(p_content TEXT)
RETURNS TEXT AS $$
DECLARE
  v_text TEXT := LOWER(COALESCE(p_content, ''));
  v_zero INTEGER;
  v_index INTEGER;
  v_word TEXT;
  v_digit TEXT;
BEGIN
  -- Normalize common Unicode digit scripts into ASCII digits.
  FOREACH v_zero IN ARRAY ARRAY[
    48,    -- ASCII / NFKC full-width fallback
    1632,  -- Arabic-Indic
    1776,  -- Eastern Arabic-Indic
    2406,  -- Devanagari
    2534,  -- Bengali
    2662,  -- Gurmukhi
    2790,  -- Gujarati
    2918,  -- Odia
    3046,  -- Tamil
    3174,  -- Telugu
    3302,  -- Kannada
    3430,  -- Malayalam
    3664,  -- Thai
    3792,  -- Lao
    4160,  -- Myanmar
    6112,  -- Khmer
    65296  -- Fullwidth
  ] LOOP
    FOR v_index IN 0..9 LOOP
      v_text := REPLACE(v_text, CHR(v_zero + v_index), v_index::TEXT);
    END LOOP;
  END LOOP;

  FOR v_word, v_digit IN
    SELECT word, digit
    FROM (VALUES
      ('zero', '0'), ('oh', '0'), ('o', '0'), ('nil', '0'), ('nought', '0'), ('shunya', '0'), ('sunya', '0'), ('sifr', '0'),
      ('صفر', '0'), ('शून्य', '0'), ('শুন্য', '0'), ('শূন্য', '0'), ('பூஜ்யம்', '0'), ('సున్నా', '0'), ('ಸೊನ್ನೆ', '0'), ('പൂജ്യം', '0'),
      ('one', '1'), ('ek', '1'), ('aik', '1'), ('एक', '1'), ('ایک', '1'), ('واحد', '1'), ('এক', '1'), ('ஒன்று', '1'), ('ఒకటి', '1'), ('ಒಂದು', '1'), ('ഒന്ന്', '1'),
      ('two', '2'), ('dou', '2'), ('दो', '2'), ('دون', '2'), ('دو', '2'), ('اثنين', '2'), ('اثنان', '2'), ('اثنتين', '2'), ('দুই', '2'), ('இரண்டு', '2'), ('రెండు', '2'), ('ಎರಡು', '2'), ('രണ്ട്', '2'),
      ('three', '3'), ('teen', '3'), ('tin', '3'), ('तीन', '3'), ('تین', '3'), ('ثلاثة', '3'), ('ثلاثه', '3'), ('তিন', '3'), ('மூன்று', '3'), ('మూడు', '3'), ('ಮೂರು', '3'), ('മൂന്ന്', '3'),
      ('four', '4'), ('char', '4'), ('chaar', '4'), ('चार', '4'), ('چار', '4'), ('اربعة', '4'), ('أربعة', '4'), ('اربع', '4'), ('চার', '4'), ('நான்கு', '4'), ('నాలుగు', '4'), ('ನಾಲ್ಕು', '4'), ('നാല്', '4'),
      ('five', '5'), ('paanch', '5'), ('panch', '5'), ('पांच', '5'), ('पाँच', '5'), ('پانچ', '5'), ('خمسة', '5'), ('خمسه', '5'), ('পাঁচ', '5'), ('ஐந்து', '5'), ('ఐదు', '5'), ('ಐದು', '5'), ('അഞ്ച്', '5'),
      ('six', '6'), ('che', '6'), ('chhe', '6'), ('छे', '6'), ('छह', '6'), ('چھ', '6'), ('ستة', '6'), ('سته', '6'), ('ست', '6'), ('ছয়', '6'), ('ஆறு', '6'), ('ఆరు', '6'), ('ಆರು', '6'), ('ആറ്', '6'),
      ('seven', '7'), ('saat', '7'), ('sat', '7'), ('सात', '7'), ('سات', '7'), ('سبعة', '7'), ('سبعه', '7'), ('সাত', '7'), ('ஏழு', '7'), ('ఏడు', '7'), ('ಏಳು', '7'), ('ഏഴ്', '7'),
      ('eight', '8'), ('aath', '8'), ('ath', '8'), ('आठ', '8'), ('آٹھ', '8'), ('ثمانية', '8'), ('ثمانيه', '8'), ('আট', '8'), ('எட்டு', '8'), ('ఎనిమిది', '8'), ('ಎಂಟು', '8'), ('എട്ട്', '8'),
      ('nine', '9'), ('nain', '9'), ('nau', '9'), ('नौ', '9'), ('نو', '9'), ('تسعة', '9'), ('تسعه', '9'), ('নয়', '9'), ('ஒன்பது', '9'), ('తొమ్మిది', '9'), ('ಒಂಬತ್ತು', '9'), ('ഒൻപത്', '9')
    ) AS digit_words(word, digit)
  LOOP
    v_text := REGEXP_REPLACE(
      v_text,
      '(^|[^[:alnum:]_])(double|twice|dbl)[[:space:]]+' || v_word || '($|[^[:alnum:]_])',
      '\1' || v_digit || v_digit || '\3',
      'gi'
    );
    v_text := REGEXP_REPLACE(
      v_text,
      '(^|[^[:alnum:]_])(triple|thrice)[[:space:]]+' || v_word || '($|[^[:alnum:]_])',
      '\1' || v_digit || v_digit || v_digit || '\3',
      'gi'
    );
    v_text := REGEXP_REPLACE(
      v_text,
      '(^|[^[:alnum:]_])' || v_word || '($|[^[:alnum:]_])',
      '\1' || v_digit || '\2',
      'gi'
    );
  END LOOP;

  RETURN REGEXP_REPLACE(v_text, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.message_contains_contact_number(p_content TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN LENGTH(public.normalize_lovesathi_contact_digits(p_content)) >= 5;
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
BEGIN
  v_current_digits := public.normalize_lovesathi_contact_digits(p_content);

  IF LENGTH(v_current_digits) = 0 THEN
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

  RETURN LENGTH(public.normalize_lovesathi_contact_digits(v_previous_content || ' ' || p_content)) >= 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_free_message_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_same_person_count INTEGER;
  v_distinct_people_count INTEGER;
  v_has_messaged_receiver BOOLEAN;
  v_window_start TIMESTAMP WITH TIME ZONE := TIMEZONE('utc', NOW()) - INTERVAL '12 hours';
BEGIN
  IF public.message_contains_contact_number(NEW.content)
    OR public.message_context_contains_contact_number(NEW.match_id, NEW.sender_id, NEW.receiver_id, NEW.content) THEN
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

GRANT EXECUTE ON FUNCTION public.normalize_lovesathi_contact_digits(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.message_contains_contact_number(TEXT) TO authenticated;
