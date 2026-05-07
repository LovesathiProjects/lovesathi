-- Marks curated demo/seed profiles separately from real member profiles.
-- This lets early discovery feel populated without hiding seeded data from admin/tools.

ALTER TABLE public.matrimony_profile_full
ADD COLUMN IF NOT EXISTS is_seeded_profile BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profile_visibility_label TEXT;

CREATE INDEX IF NOT EXISTS idx_matrimony_profile_full_seeded
  ON public.matrimony_profile_full(is_seeded_profile)
  WHERE is_seeded_profile = TRUE;
