-- Lovesathi subscription lifecycle.
-- A paid member keeps premium access for a 15-day grace period after renewal is due.
-- Payment webhooks can mark rows past_due; the app/admin lifecycle sync also moves
-- expired active rows into grace and finally expires them after the grace window.

ALTER TABLE public.user_entitlements
ADD COLUMN IF NOT EXISTS renewal_due_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS grace_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_payment_reminder_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

UPDATE public.user_entitlements
SET renewal_due_at = active_until
WHERE renewal_due_at IS NULL
  AND active_until IS NOT NULL
  AND status IN ('active', 'trialing', 'past_due');

CREATE INDEX IF NOT EXISTS idx_user_entitlements_grace_lookup
  ON public.user_entitlements(status, grace_until DESC)
  WHERE status = 'past_due';

CREATE OR REPLACE FUNCTION public.lovesathi_entitlement_has_access(
  p_status TEXT,
  p_active_until TIMESTAMP WITH TIME ZONE,
  p_renewal_due_at TIMESTAMP WITH TIME ZONE,
  p_grace_until TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE := TIMEZONE('utc', NOW());
  v_due_at TIMESTAMP WITH TIME ZONE := COALESCE(p_renewal_due_at, p_active_until);
BEGIN
  IF p_status IN ('active', 'trialing') THEN
    RETURN p_active_until IS NULL
      OR p_active_until > v_now
      OR p_active_until + INTERVAL '15 days' > v_now;
  END IF;

  IF p_status = 'past_due' THEN
    RETURN COALESCE(p_grace_until, v_due_at + INTERVAL '15 days') > v_now;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_lovesathi_entitlement_lifecycle(p_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
  v_changed INTEGER := 0;
  v_total INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  IF auth.role() = 'authenticated' AND auth.uid() IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Cannot sync another member subscription.';
  END IF;

  UPDATE public.user_entitlements
  SET
    status = 'past_due',
    renewal_due_at = COALESCE(renewal_due_at, active_until),
    grace_until = COALESCE(grace_until, active_until + INTERVAL '15 days'),
    payment_failed_at = COALESCE(payment_failed_at, active_until),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'lifecycle',
      jsonb_build_object(
        'state', 'past_due',
        'reason', 'renewal_due',
        'syncedAt', TIMEZONE('utc', NOW()),
        'graceDays', 15
      )
    )
  WHERE user_id = v_user_id
    AND status IN ('active', 'trialing')
    AND active_until IS NOT NULL
    AND active_until <= TIMEZONE('utc', NOW())
    AND active_until + INTERVAL '15 days' > TIMEZONE('utc', NOW());

  GET DIAGNOSTICS v_changed = ROW_COUNT;
  v_total := v_total + v_changed;

  UPDATE public.user_entitlements
  SET
    status = 'expired',
    renewal_due_at = COALESCE(renewal_due_at, active_until),
    grace_until = COALESCE(grace_until, active_until + INTERVAL '15 days'),
    canceled_at = COALESCE(canceled_at, TIMEZONE('utc', NOW())),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'lifecycle',
      jsonb_build_object(
        'state', 'expired',
        'reason', 'grace_period_ended',
        'syncedAt', TIMEZONE('utc', NOW()),
        'graceDays', 15
      )
    )
  WHERE user_id = v_user_id
    AND status IN ('active', 'trialing')
    AND active_until IS NOT NULL
    AND active_until + INTERVAL '15 days' <= TIMEZONE('utc', NOW());

  GET DIAGNOSTICS v_changed = ROW_COUNT;
  v_total := v_total + v_changed;

  UPDATE public.user_entitlements
  SET
    status = 'expired',
    canceled_at = COALESCE(canceled_at, TIMEZONE('utc', NOW())),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'lifecycle',
      jsonb_build_object(
        'state', 'expired',
        'reason', 'grace_period_ended',
        'syncedAt', TIMEZONE('utc', NOW()),
        'graceDays', 15
      )
    )
  WHERE user_id = v_user_id
    AND status = 'past_due'
    AND COALESCE(grace_until, renewal_due_at + INTERVAL '15 days', active_until + INTERVAL '15 days') <= TIMEZONE('utc', NOW());

  GET DIAGNOSTICS v_changed = ROW_COUNT;
  v_total := v_total + v_changed;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.expire_lovesathi_past_due_entitlements()
RETURNS JSONB AS $$
DECLARE
  v_past_due INTEGER := 0;
  v_expired_from_active INTEGER := 0;
  v_expired_from_past_due INTEGER := 0;
BEGIN
  UPDATE public.user_entitlements
  SET
    status = 'past_due',
    renewal_due_at = COALESCE(renewal_due_at, active_until),
    grace_until = COALESCE(grace_until, active_until + INTERVAL '15 days'),
    payment_failed_at = COALESCE(payment_failed_at, active_until),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'lifecycle',
      jsonb_build_object(
        'state', 'past_due',
        'reason', 'renewal_due',
        'syncedAt', TIMEZONE('utc', NOW()),
        'graceDays', 15
      )
    )
  WHERE status IN ('active', 'trialing')
    AND active_until IS NOT NULL
    AND active_until <= TIMEZONE('utc', NOW())
    AND active_until + INTERVAL '15 days' > TIMEZONE('utc', NOW());

  GET DIAGNOSTICS v_past_due = ROW_COUNT;

  UPDATE public.user_entitlements
  SET
    status = 'expired',
    renewal_due_at = COALESCE(renewal_due_at, active_until),
    grace_until = COALESCE(grace_until, active_until + INTERVAL '15 days'),
    canceled_at = COALESCE(canceled_at, TIMEZONE('utc', NOW())),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'lifecycle',
      jsonb_build_object(
        'state', 'expired',
        'reason', 'grace_period_ended',
        'syncedAt', TIMEZONE('utc', NOW()),
        'graceDays', 15
      )
    )
  WHERE status IN ('active', 'trialing')
    AND active_until IS NOT NULL
    AND active_until + INTERVAL '15 days' <= TIMEZONE('utc', NOW());

  GET DIAGNOSTICS v_expired_from_active = ROW_COUNT;

  UPDATE public.user_entitlements
  SET
    status = 'expired',
    canceled_at = COALESCE(canceled_at, TIMEZONE('utc', NOW())),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'lifecycle',
      jsonb_build_object(
        'state', 'expired',
        'reason', 'grace_period_ended',
        'syncedAt', TIMEZONE('utc', NOW()),
        'graceDays', 15
      )
    )
  WHERE status = 'past_due'
    AND COALESCE(grace_until, renewal_due_at + INTERVAL '15 days', active_until + INTERVAL '15 days') <= TIMEZONE('utc', NOW());

  GET DIAGNOSTICS v_expired_from_past_due = ROW_COUNT;

  RETURN jsonb_build_object(
    'movedToPastDue', v_past_due,
    'expiredFromActive', v_expired_from_active,
    'expiredFromPastDue', v_expired_from_past_due
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.mark_lovesathi_subscription_past_due(
  p_user_id UUID,
  p_failure_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
)
RETURNS UUID AS $$
DECLARE
  v_entitlement_id UUID;
BEGIN
  UPDATE public.user_entitlements
  SET
    status = 'past_due',
    renewal_due_at = COALESCE(renewal_due_at, active_until, p_failure_at),
    grace_until = COALESCE(grace_until, COALESCE(active_until, p_failure_at) + INTERVAL '15 days'),
    payment_failed_at = COALESCE(payment_failed_at, p_failure_at),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'lifecycle',
      jsonb_build_object(
        'state', 'past_due',
        'reason', 'payment_failed',
        'syncedAt', TIMEZONE('utc', NOW()),
        'graceDays', 15
      )
    )
  WHERE id = (
    SELECT id
    FROM public.user_entitlements
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing')
    ORDER BY updated_at DESC
    LIMIT 1
  )
  RETURNING id INTO v_entitlement_id;

  RETURN v_entitlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_lovesathi_premium(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_entitlements
    WHERE user_id = p_user_id
      AND public.lovesathi_entitlement_has_access(status, active_until, renewal_due_at, grace_until)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_lovesathi_premium_profile_ids(p_user_ids UUID[])
RETURNS UUID[] AS $$
DECLARE
  v_result UUID[];
BEGIN
  SELECT COALESCE(ARRAY_AGG(DISTINCT user_id), ARRAY[]::UUID[])
    INTO v_result
  FROM public.user_entitlements
  WHERE user_id = ANY(COALESCE(p_user_ids, ARRAY[]::UUID[]))
    AND public.lovesathi_entitlement_has_access(status, active_until, renewal_due_at, grace_until);

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.lovesathi_entitlement_has_access(TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_lovesathi_entitlement_lifecycle(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_lovesathi_past_due_entitlements() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_lovesathi_subscription_past_due(UUID, TIMESTAMP WITH TIME ZONE) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_lovesathi_premium(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lovesathi_premium_profile_ids(UUID[]) TO authenticated;
