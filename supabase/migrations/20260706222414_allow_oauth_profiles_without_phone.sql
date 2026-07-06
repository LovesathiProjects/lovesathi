-- Google OAuth accounts do not provide a phone number.
-- Phone can be added and verified later from profile/edit profile, so account
-- creation must not fail when the auth.users trigger inserts an empty profile.

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
    NEW.phone_verified_at = NULL;
    RETURN NEW;
  END IF;

  IF length(v_digits) < 8 OR length(v_digits) > 15 THEN
    RAISE EXCEPTION 'Please enter a valid phone number.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
