-- Lovesathi subscription entitlement foundation.
-- Keeps payment-gateway wiring separate while giving admins safe entitlement controls.

ALTER TABLE public.user_entitlements
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_user_entitlements_active_lookup
  ON public.user_entitlements(user_id, status, active_until DESC);

CREATE INDEX IF NOT EXISTS idx_user_entitlements_provider_subscription
  ON public.user_entitlements(provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_lovesathi_premium_profile_ids(p_user_ids UUID[])
RETURNS UUID[] AS $$
DECLARE
  v_result UUID[];
BEGIN
  SELECT COALESCE(ARRAY_AGG(DISTINCT user_id), ARRAY[]::UUID[])
    INTO v_result
  FROM public.user_entitlements
  WHERE user_id = ANY(COALESCE(p_user_ids, ARRAY[]::UUID[]))
    AND status IN ('active', 'trialing')
    AND (active_until IS NULL OR active_until > TIMEZONE('utc', NOW()));

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_lovesathi_premium_profile_ids(UUID[]) TO authenticated;
