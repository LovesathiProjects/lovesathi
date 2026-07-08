-- Admin-managed premium pricing, discount banners, and per-user discount grants.
-- Payment and OTP providers remain intentionally untouched.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.lovesathi_plan_pricing (
  plan_id TEXT PRIMARY KEY CHECK (plan_id IN ('basic', 'essential', 'signature', 'heritage')),
  plan_name TEXT NOT NULL CHECK (char_length(trim(plan_name)) BETWEEN 2 AND 80),
  duration_label TEXT NOT NULL CHECK (char_length(trim(duration_label)) BETWEEN 2 AND 80),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  price_label TEXT NOT NULL CHECK (char_length(trim(price_label)) BETWEEN 2 AND 40),
  price_amount INTEGER NOT NULL CHECK (price_amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency ~ '^[A-Z]{3}$'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

INSERT INTO public.lovesathi_plan_pricing (
  plan_id,
  plan_name,
  duration_label,
  duration_days,
  price_label,
  price_amount,
  currency,
  is_active,
  display_order
)
VALUES
  ('basic', 'Basic', '3 months', 90, 'INR 2,329', 2329, 'INR', TRUE, 10),
  ('essential', 'Essential', '6 months', 180, 'INR 4,997', 4997, 'INR', TRUE, 20),
  ('signature', 'Signature', '12 months', 365, 'INR 8,329', 8329, 'INR', TRUE, 30),
  ('heritage', 'Heritage', 'Lifetime concierge', 3650, 'INR 19,997', 19997, 'INR', TRUE, 40)
ON CONFLICT (plan_id) DO UPDATE
SET
  plan_name = EXCLUDED.plan_name,
  duration_label = EXCLUDED.duration_label,
  duration_days = EXCLUDED.duration_days,
  price_label = EXCLUDED.price_label,
  price_amount = EXCLUDED.price_amount,
  currency = EXCLUDED.currency,
  display_order = EXCLUDED.display_order;

CREATE TABLE IF NOT EXISTS public.lovesathi_discount_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 120),
  banner_text TEXT NOT NULL CHECK (char_length(trim(banner_text)) BETWEEN 2 AND 600),
  banner_image_url TEXT CHECK (banner_image_url IS NULL OR banner_image_url ~ '^https?://'),
  discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  plan_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_lovesathi_discount_banners_public
  ON public.lovesathi_discount_banners(status, starts_at, ends_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.lovesathi_user_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT CHECK (plan_id IS NULL OR plan_id IN ('basic', 'essential', 'signature', 'heritage')),
  title TEXT NOT NULL DEFAULT 'Private discount' CHECK (char_length(trim(title)) BETWEEN 2 AND 120),
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 800),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_lovesathi_user_discounts_user
  ON public.lovesathi_user_discounts(user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lovesathi_user_discounts_plan
  ON public.lovesathi_user_discounts(plan_id, status, updated_at DESC)
  WHERE plan_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_lovesathi_pricing_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_lovesathi_plan_pricing_timestamps ON public.lovesathi_plan_pricing;
CREATE TRIGGER set_lovesathi_plan_pricing_timestamps
BEFORE UPDATE ON public.lovesathi_plan_pricing
FOR EACH ROW
EXECUTE FUNCTION public.set_lovesathi_pricing_timestamps();

DROP TRIGGER IF EXISTS set_lovesathi_discount_banner_timestamps ON public.lovesathi_discount_banners;
CREATE TRIGGER set_lovesathi_discount_banner_timestamps
BEFORE UPDATE ON public.lovesathi_discount_banners
FOR EACH ROW
EXECUTE FUNCTION public.set_lovesathi_pricing_timestamps();

DROP TRIGGER IF EXISTS set_lovesathi_user_discount_timestamps ON public.lovesathi_user_discounts;
CREATE TRIGGER set_lovesathi_user_discount_timestamps
BEFORE UPDATE ON public.lovesathi_user_discounts
FOR EACH ROW
EXECUTE FUNCTION public.set_lovesathi_pricing_timestamps();

ALTER TABLE public.lovesathi_plan_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lovesathi_discount_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lovesathi_user_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active plan pricing is publicly readable" ON public.lovesathi_plan_pricing;
CREATE POLICY "Active plan pricing is publicly readable"
ON public.lovesathi_plan_pricing
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Published discount banners are publicly readable" ON public.lovesathi_discount_banners;
CREATE POLICY "Published discount banners are publicly readable"
ON public.lovesathi_discount_banners
FOR SELECT
TO anon, authenticated
USING (
  status = 'published'
  AND (starts_at IS NULL OR starts_at <= TIMEZONE('utc', NOW()))
  AND (ends_at IS NULL OR ends_at > TIMEZONE('utc', NOW()))
);

DROP POLICY IF EXISTS "Users can read own active discounts" ON public.lovesathi_user_discounts;
CREATE POLICY "Users can read own active discounts"
ON public.lovesathi_user_discounts
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND status = 'active'
  AND (starts_at IS NULL OR starts_at <= TIMEZONE('utc', NOW()))
  AND (ends_at IS NULL OR ends_at > TIMEZONE('utc', NOW()))
);

GRANT SELECT ON public.lovesathi_plan_pricing TO anon;
GRANT SELECT ON public.lovesathi_plan_pricing TO authenticated;
GRANT SELECT ON public.lovesathi_discount_banners TO anon;
GRANT SELECT ON public.lovesathi_discount_banners TO authenticated;
GRANT SELECT ON public.lovesathi_user_discounts TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovesathi_plan_pricing TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovesathi_discount_banners TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovesathi_user_discounts TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lovesathi-discount-banners',
  'lovesathi-discount-banners',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public discount banners are readable" ON storage.objects;
CREATE POLICY "Public discount banners are readable"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'lovesathi-discount-banners');

COMMENT ON TABLE public.lovesathi_plan_pricing IS
  'Admin-managed display pricing for Lovesathi premium plans. Payment provider integration remains separate.';

COMMENT ON TABLE public.lovesathi_discount_banners IS
  'Admin-managed public offer banners. No default discount is shown unless a row is published.';

COMMENT ON TABLE public.lovesathi_user_discounts IS
  'Admin-granted per-user discount percentages for future payment checkout workflows.';
