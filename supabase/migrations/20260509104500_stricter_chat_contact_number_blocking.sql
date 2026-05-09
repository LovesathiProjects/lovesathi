-- Tighten chat contact-sharing detection for typed, worded, and multi-message phone attempts.

CREATE OR REPLACE FUNCTION public.normalize_lovesathi_contact_digits(p_content TEXT)
RETURNS TEXT AS $$
DECLARE
  v_text TEXT := LOWER(COALESCE(p_content, ''));
  v_zero INTEGER;
  v_index INTEGER;
  v_word TEXT;
  v_digit TEXT;
BEGIN
  v_text := TRANSLATE(v_text, '|!$@', '1150');

  FOREACH v_zero IN ARRAY ARRAY[
    48,
    1632,
    1776,
    2406,
    2534,
    2662,
    2790,
    2918,
    3046,
    3174,
    3302,
    3430,
    3664,
    3792,
    4160,
    6112,
    65296
  ] LOOP
    FOR v_index IN 0..9 LOOP
      v_text := REPLACE(v_text, CHR(v_zero + v_index), v_index::TEXT);
    END LOOP;
  END LOOP;

  FOR v_word, v_digit IN
    SELECT word, digit
    FROM (VALUES
      ('zero', '0'), ('oh', '0'), ('o', '0'), ('nil', '0'), ('nought', '0'), ('shunya', '0'), ('sunya', '0'), ('sifr', '0'), ('poojyam', '0'), ('sunnah', '0'),
      ('one', '1'), ('won', '1'), ('ek', '1'), ('aik', '1'), ('ondru', '1'), ('okati', '1'), ('ondu', '1'),
      ('two', '2'), ('too', '2'), ('do', '2'), ('dou', '2'), ('rendu', '2'), ('eradu', '2'), ('irandu', '2'),
      ('three', '3'), ('tree', '3'), ('teen', '3'), ('tin', '3'), ('moonu', '3'), ('mudu', '3'), ('mooru', '3'),
      ('four', '4'), ('fore', '4'), ('char', '4'), ('chaar', '4'), ('naalu', '4'), ('nalku', '4'),
      ('five', '5'), ('paanch', '5'), ('panch', '5'), ('aindhu', '5'), ('aidu', '5'),
      ('six', '6'), ('che', '6'), ('chhe', '6'), ('chhah', '6'), ('aaru', '6'),
      ('seven', '7'), ('saat', '7'), ('sat', '7'), ('elu', '7'),
      ('eight', '8'), ('aath', '8'), ('ath', '8'), ('ettu', '8'), ('enimidi', '8'),
      ('nine', '9'), ('nain', '9'), ('nau', '9'), ('onpathu', '9'), ('tommidi', '9')
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
  RETURN LENGTH(public.normalize_lovesathi_contact_digits(p_content)) >= 4;
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

  RETURN LENGTH(public.normalize_lovesathi_contact_digits(v_previous_content || ' ' || p_content)) >= 4;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
