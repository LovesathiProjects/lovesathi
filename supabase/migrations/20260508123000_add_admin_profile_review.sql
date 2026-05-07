-- Lovesathi profile moderation state.
-- Keeps admin review decisions separate from user-entered profile data.

ALTER TABLE public.matrimony_profile_full
ADD COLUMN IF NOT EXISTS admin_review_status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS admin_review_notes TEXT,
ADD COLUMN IF NOT EXISTS admin_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matrimony_profile_full_admin_review_status_check'
  ) THEN
    ALTER TABLE public.matrimony_profile_full
      ADD CONSTRAINT matrimony_profile_full_admin_review_status_check
      CHECK (admin_review_status IN ('pending', 'in_review', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matrimony_profile_full_admin_review
  ON public.matrimony_profile_full(admin_review_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_matrimony_profile_full_admin_reviewed_by
  ON public.matrimony_profile_full(admin_reviewed_by, admin_reviewed_at DESC);

CREATE OR REPLACE FUNCTION public.reset_matrimony_profile_admin_review_on_member_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.age IS DISTINCT FROM NEW.age OR
    OLD.gender IS DISTINCT FROM NEW.gender OR
    OLD.created_by IS DISTINCT FROM NEW.created_by OR
    OLD.photos IS DISTINCT FROM NEW.photos OR
    OLD.personal IS DISTINCT FROM NEW.personal OR
    OLD.career IS DISTINCT FROM NEW.career OR
    OLD.family IS DISTINCT FROM NEW.family OR
    OLD.cultural IS DISTINCT FROM NEW.cultural OR
    OLD.bio IS DISTINCT FROM NEW.bio OR
    OLD.partner_preferences IS DISTINCT FROM NEW.partner_preferences OR
    OLD.profile_completed IS DISTINCT FROM NEW.profile_completed
  ) THEN
    NEW.admin_review_status = 'pending';
    NEW.admin_review_notes = NULL;
    NEW.admin_reviewed_at = NULL;
    NEW.admin_reviewed_by = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS reset_matrimony_profile_admin_review_on_member_edit
  ON public.matrimony_profile_full;

CREATE TRIGGER reset_matrimony_profile_admin_review_on_member_edit
  BEFORE UPDATE ON public.matrimony_profile_full
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_matrimony_profile_admin_review_on_member_edit();
