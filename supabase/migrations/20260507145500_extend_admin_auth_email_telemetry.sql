-- Extend Lovesathi admin auth telemetry with lifetime and last-30-day counters.
-- Categories intentionally use both known Supabase Auth audit actions and resilient
-- text matching so future OTP/magic-link audit payloads still surface in admin.

CREATE OR REPLACE FUNCTION public.get_lovesathi_auth_email_events(
  p_since TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) - INTERVAL '7 days',
  p_limit INTEGER DEFAULT 25
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_since TIMESTAMP WITH TIME ZONE := COALESCE(p_since, TIMEZONE('utc', NOW()) - INTERVAL '7 days');
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_30_days_ago TIMESTAMP WITH TIME ZONE := TIMEZONE('utc', NOW()) - INTERVAL '30 days';
  v_result JSONB;
BEGIN
  WITH normalized AS (
    SELECT
      entries.id,
      entries.created_at,
      entries.payload,
      entries.payload::TEXT AS payload_text,
      COALESCE(entries.payload->>'action', 'unknown') AS action,
      COALESCE(
        entries.payload->>'actor_username',
        entries.payload->>'actor_email',
        entries.payload->'traits'->>'email',
        entries.payload->'metadata'->>'email',
        entries.payload->>'email'
      ) AS email,
      COALESCE(
        entries.payload->>'actor_id',
        entries.payload->>'user_id'
      ) AS user_id,
      COALESCE(
        entries.payload->>'ip_address',
        entries.payload->'metadata'->>'ip_address'
      ) AS ip_address,
      COALESCE(
        entries.payload->>'user_agent',
        entries.payload->'metadata'->>'user_agent'
      ) AS user_agent
    FROM auth.audit_log_entries AS entries
  ),
  categorized AS (
    SELECT
      *,
      (
        action IN (
          'user_confirmation_requested',
          'user_recovery_requested',
          'user_repeated_signup',
          'user_invited',
          'user_reauthenticate_requested'
        )
        OR action ILIKE '%email%'
        OR action ILIKE '%confirmation%'
        OR action ILIKE '%recovery%'
        OR action ILIKE '%invite%'
        OR payload_text ILIKE '%confirmationurl%'
        OR payload_text ILIKE '%email_otp%'
      ) AS is_email_event,
      (
        action ILIKE '%otp%'
        OR payload_text ILIKE '%email_otp%'
        OR payload_text ILIKE '%one-time%'
        OR payload_text ILIKE '%one time%'
        OR payload_text ILIKE '%otp%'
      ) AS is_otp_event,
      (
        action ILIKE '%magic%'
        OR payload_text ILIKE '%magiclink%'
        OR payload_text ILIKE '%magic_link%'
        OR payload_text ILIKE '%magic link%'
      ) AS is_magic_link_event
    FROM normalized
  ),
  category_rows AS (
    SELECT
      'email' AS category,
      'Overall email' AS label,
      'All Supabase Auth email-send requests, including verification, resend, recovery, invite, and email-change style events.' AS description,
      COUNT(*) FILTER (WHERE is_email_event)::INTEGER AS overall,
      COUNT(*) FILTER (WHERE is_email_event AND created_at >= v_30_days_ago)::INTEGER AS last_30_days,
      MAX(created_at) FILTER (WHERE is_email_event) AS last_seen
    FROM categorized
    UNION ALL
    SELECT
      'otp' AS category,
      'Overall OTP' AS label,
      'Supabase Auth one-time-password requests detected from audit action names or payload markers.' AS description,
      COUNT(*) FILTER (WHERE is_otp_event)::INTEGER AS overall,
      COUNT(*) FILTER (WHERE is_otp_event AND created_at >= v_30_days_ago)::INTEGER AS last_30_days,
      MAX(created_at) FILTER (WHERE is_otp_event) AS last_seen
    FROM categorized
    UNION ALL
    SELECT
      'magic_link' AS category,
      'Overall magic link' AS label,
      'Supabase Auth magic-link requests detected from audit action names or payload markers.' AS description,
      COUNT(*) FILTER (WHERE is_magic_link_event)::INTEGER AS overall,
      COUNT(*) FILTER (WHERE is_magic_link_event AND created_at >= v_30_days_ago)::INTEGER AS last_30_days,
      MAX(created_at) FILTER (WHERE is_magic_link_event) AS last_seen
    FROM categorized
  ),
  filtered AS (
    SELECT *
    FROM categorized
    WHERE created_at >= v_since
      AND (is_email_event OR is_otp_event OR is_magic_link_event)
  ),
  counts AS (
    SELECT
      action,
      COUNT(*)::INTEGER AS total,
      COUNT(*) FILTER (WHERE created_at >= v_30_days_ago)::INTEGER AS last_30_days,
      MAX(created_at) AS last_seen
    FROM categorized
    WHERE is_email_event OR is_otp_event OR is_magic_link_event
    GROUP BY action
  ),
  recent AS (
    SELECT *
    FROM filtered
    ORDER BY created_at DESC
    LIMIT v_limit
  )
  SELECT jsonb_build_object(
    'since', v_since,
    'last30Since', v_30_days_ago,
    'until', TIMEZONE('utc', NOW()),
    'summary', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'category', category,
            'label', label,
            'description', description,
            'overall', overall,
            'last30Days', last_30_days,
            'lastSeen', last_seen
          )
          ORDER BY CASE category WHEN 'email' THEN 1 WHEN 'otp' THEN 2 ELSE 3 END
        )
        FROM category_rows
      ),
      '[]'::JSONB
    ),
    'counts', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'action', action,
            'total', total,
            'last30Days', last_30_days,
            'lastSeen', last_seen
          )
          ORDER BY total DESC, action ASC
        )
        FROM counts
      ),
      '[]'::JSONB
    ),
    'events', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', id,
            'createdAt', created_at,
            'action', action,
            'email', email,
            'userId', user_id,
            'ipAddress', ip_address,
            'userAgent', user_agent
          )
          ORDER BY created_at DESC
        )
        FROM recent
      ),
      '[]'::JSONB
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_lovesathi_auth_email_events(TIMESTAMP WITH TIME ZONE, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lovesathi_auth_email_events(TIMESTAMP WITH TIME ZONE, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.get_lovesathi_auth_email_events(TIMESTAMP WITH TIME ZONE, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_lovesathi_auth_email_events(TIMESTAMP WITH TIME ZONE, INTEGER) TO service_role;
