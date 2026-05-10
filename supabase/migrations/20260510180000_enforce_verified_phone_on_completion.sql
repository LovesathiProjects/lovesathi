-- Phone verification now happens at the account gate, before onboarding.
-- Once onboarding completion is being written, the verified timestamp must exist.

CREATE OR REPLACE FUNCTION public.require_lovesathi_profile_phone()
RETURNS TRIGGER AS $$
DECLARE
  v_digits TEXT;
  v_old_digits TEXT;
  v_new_digits TEXT;
BEGIN
  NEW.phone = NULLIF(TRIM(COALESCE(NEW.phone, '')), '');
  v_digits := regexp_replace(COALESCE(NEW.phone, ''), '[^0-9]', '', 'g');

  IF TG_OP = 'UPDATE' THEN
    v_old_digits := regexp_replace(COALESCE(OLD.phone, ''), '[^0-9]', '', 'g');
    v_new_digits := regexp_replace(COALESCE(NEW.phone, ''), '[^0-9]', '', 'g');

    IF v_old_digits IS DISTINCT FROM v_new_digits
      AND NEW.phone_verified_at IS NOT DISTINCT FROM OLD.phone_verified_at THEN
      NEW.phone_verified_at = NULL;
    END IF;
  END IF;

  IF NEW.phone IS NULL THEN
    RAISE EXCEPTION 'Phone number is required.';
  END IF;

  IF length(v_digits) < 8 OR length(v_digits) > 15 THEN
    RAISE EXCEPTION 'Please enter a valid phone number.';
  END IF;

  IF COALESCE(NEW.onboarding_matrimony, FALSE) = TRUE
    OR COALESCE(NEW.onboarding_completed, FALSE) = TRUE THEN
    IF NEW.phone_verified_at IS NULL THEN
      RAISE EXCEPTION 'Please verify your phone number before completing onboarding.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
