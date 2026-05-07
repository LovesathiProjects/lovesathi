-- Summarize Supabase Auth email-related audit events for the Lovesathi admin portal.
-- This function is callable only by the service role through the guarded admin API.

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
  v_result JSONB;
BEGIN
  WITH filtered AS (
    SELECT
      entries.id,
      entries.created_at,
      entries.payload,
      entries.payload->>'action' AS action,
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
    WHERE entries.created_at >= v_since
      AND entries.payload->>'action' IN (
        'user_confirmation_requested',
        'user_recovery_requested',
        'user_repeated_signup',
        'user_invited',
        'user_signedup'
      )
  ),
  counts AS (
    SELECT
      action,
      COUNT(*)::INTEGER AS total,
      MAX(created_at) AS last_seen
    FROM filtered
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
    'until', TIMEZONE('utc', NOW()),
    'counts', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'action', action,
            'total', total,
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
