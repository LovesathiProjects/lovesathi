-- Seeded profiles should behave like normal discovery profiles in the product UI.
-- Keep the internal seed marker, but remove customer-facing preview labels.

UPDATE public.matrimony_profile_full
SET profile_visibility_label = NULL
WHERE profile_visibility_label IS NOT NULL;
