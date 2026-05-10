-- Phone OTP trust marker for Lovesathi.
-- Supabase Auth sends/verifies the SMS OTP; this app-level timestamp gates profile completion.

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

UPDATE public.user_profiles AS profile
SET phone_verified_at = COALESCE(profile.phone_verified_at, auth_user.phone_confirmed_at)
FROM auth.users AS auth_user
WHERE profile.user_id = auth_user.id
  AND auth_user.phone_confirmed_at IS NOT NULL
  AND regexp_replace(COALESCE(profile.phone, ''), '[^0-9]', '', 'g') = regexp_replace(COALESCE(auth_user.phone, ''), '[^0-9]', '', 'g')
  AND NULLIF(regexp_replace(COALESCE(profile.phone, ''), '[^0-9]', '', 'g'), '') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_verified_at
  ON public.user_profiles(phone_verified_at);

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
      RAISE EXCEPTION 'Please verify your phone number with OTP before completing onboarding.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
