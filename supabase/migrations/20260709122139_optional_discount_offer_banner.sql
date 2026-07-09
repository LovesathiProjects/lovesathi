ALTER TABLE public.lovesathi_discount_banners
  ALTER COLUMN banner_text DROP NOT NULL;

ALTER TABLE public.lovesathi_discount_banners
  DROP CONSTRAINT IF EXISTS lovesathi_discount_banners_banner_text_check;

ALTER TABLE public.lovesathi_discount_banners
  ADD CONSTRAINT lovesathi_discount_banners_banner_text_check
  CHECK (
    banner_text IS NULL
    OR trim(banner_text) = ''
    OR char_length(trim(banner_text)) BETWEEN 2 AND 600
  );

COMMENT ON COLUMN public.lovesathi_discount_banners.banner_text IS
  'Optional public-facing banner copy. Discounts can be published without showing a promotional banner.';
