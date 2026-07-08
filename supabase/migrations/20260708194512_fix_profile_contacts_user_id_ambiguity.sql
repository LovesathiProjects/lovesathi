CREATE OR REPLACE FUNCTION public.get_lovesathi_profile_contacts(p_user_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  phone_masked TEXT,
  phone_revealed TEXT,
  can_reveal BOOLEAN,
  remaining_contact_views INTEGER
) AS $$
DECLARE
  v_request_user UUID := auth.uid();
  v_plan_id TEXT;
  v_entitlement_created_at TIMESTAMP WITH TIME ZONE;
  v_limit INTEGER;
  v_used INTEGER := 0;
BEGIN
  SELECT entitlement.plan_id, entitlement.created_at
    INTO v_plan_id, v_entitlement_created_at
  FROM public.user_entitlements AS entitlement
  WHERE entitlement.user_id = v_request_user
    AND entitlement.status IN ('active', 'trialing')
    AND (entitlement.active_until IS NULL OR entitlement.active_until > TIMEZONE('utc', NOW()))
  ORDER BY entitlement.updated_at DESC NULLS LAST, entitlement.created_at DESC
  LIMIT 1;

  IF v_plan_id IS NOT NULL THEN
    v_limit := public.lovesathi_plan_contact_view_limit(v_plan_id);
    IF v_limit IS NOT NULL THEN
      SELECT COUNT(DISTINCT contact_reveal.viewed_user_id)::INTEGER
        INTO v_used
      FROM public.lovesathi_contact_reveals AS contact_reveal
      WHERE contact_reveal.viewer_id = v_request_user
        AND contact_reveal.created_at >= COALESCE(v_entitlement_created_at, '1970-01-01'::timestamptz);
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    profile.user_id,
    public.mask_lovesathi_phone(contact.phone_raw) AS phone_masked,
    CASE
      WHEN profile.user_id = v_request_user OR reveal.id IS NOT NULL THEN contact.phone_raw
      ELSE NULL
    END AS phone_revealed,
    CASE
      WHEN profile.user_id = v_request_user THEN TRUE
      WHEN v_plan_id IS NULL THEN FALSE
      WHEN reveal.id IS NOT NULL THEN TRUE
      WHEN v_limit IS NULL THEN TRUE
      ELSE v_used < v_limit
    END AS can_reveal,
    CASE
      WHEN v_plan_id IS NULL OR v_limit IS NULL THEN NULL
      ELSE GREATEST(v_limit - v_used, 0)
    END AS remaining_contact_views
  FROM public.user_profiles AS profile
  LEFT JOIN auth.users AS auth_user
    ON auth_user.id = profile.user_id
  LEFT JOIN public.lovesathi_contact_reveals AS reveal
    ON reveal.viewer_id = v_request_user
   AND reveal.viewed_user_id = profile.user_id
  CROSS JOIN LATERAL (
    SELECT NULLIF(TRIM(COALESCE(profile.phone, auth_user.phone, auth_user.raw_user_meta_data->>'phone')), '') AS phone_raw
  ) AS contact
  WHERE profile.user_id = ANY(COALESCE(p_user_ids, ARRAY[]::UUID[]));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.reveal_lovesathi_profile_contact(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  phone_masked TEXT,
  phone_revealed TEXT,
  can_reveal BOOLEAN,
  remaining_contact_views INTEGER
) AS $$
DECLARE
  v_request_user UUID := auth.uid();
  v_phone TEXT;
  v_plan_id TEXT;
  v_entitlement_created_at TIMESTAMP WITH TIME ZONE;
  v_limit INTEGER;
  v_used INTEGER := 0;
  v_already_revealed BOOLEAN := FALSE;
BEGIN
  IF v_request_user IS NULL THEN
    RAISE EXCEPTION 'Please sign in to reveal contact details.';
  END IF;

  SELECT NULLIF(TRIM(COALESCE(profile.phone, auth_user.phone, auth_user.raw_user_meta_data->>'phone')), '')
    INTO v_phone
  FROM public.user_profiles AS profile
  LEFT JOIN auth.users AS auth_user
    ON auth_user.id = profile.user_id
  WHERE profile.user_id = p_user_id;

  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'This profile does not have a contact number available.';
  END IF;

  IF p_user_id = v_request_user THEN
    RETURN QUERY SELECT p_user_id, public.mask_lovesathi_phone(v_phone), v_phone, TRUE, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.lovesathi_contact_reveals AS existing_reveal
    WHERE existing_reveal.viewer_id = v_request_user
      AND existing_reveal.viewed_user_id = p_user_id
  ) INTO v_already_revealed;

  SELECT entitlement.plan_id, entitlement.created_at
    INTO v_plan_id, v_entitlement_created_at
  FROM public.user_entitlements AS entitlement
  WHERE entitlement.user_id = v_request_user
    AND entitlement.status IN ('active', 'trialing')
    AND (entitlement.active_until IS NULL OR entitlement.active_until > TIMEZONE('utc', NOW()))
  ORDER BY entitlement.updated_at DESC NULLS LAST, entitlement.created_at DESC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Subscribe to reveal masked phone numbers safely inside Lovesathi.';
  END IF;

  v_limit := public.lovesathi_plan_contact_view_limit(v_plan_id);

  IF v_limit IS NOT NULL THEN
    SELECT COUNT(DISTINCT contact_reveal.viewed_user_id)::INTEGER
      INTO v_used
    FROM public.lovesathi_contact_reveals AS contact_reveal
    WHERE contact_reveal.viewer_id = v_request_user
      AND contact_reveal.created_at >= COALESCE(v_entitlement_created_at, '1970-01-01'::timestamptz);

    IF NOT v_already_revealed AND v_used >= v_limit THEN
      RAISE EXCEPTION '% contact reveal limit reached. Upgrade for more contact views.', INITCAP(public.lovesathi_normalized_plan_id(v_plan_id));
    END IF;
  END IF;

  INSERT INTO public.lovesathi_contact_reveals (viewer_id, viewed_user_id)
  VALUES (v_request_user, p_user_id)
  ON CONFLICT (viewer_id, viewed_user_id)
  DO UPDATE SET revealed_at = TIMEZONE('utc', NOW());

  IF v_limit IS NOT NULL AND NOT v_already_revealed THEN
    v_used := v_used + 1;
  END IF;

  RETURN QUERY
  SELECT
    p_user_id,
    public.mask_lovesathi_phone(v_phone),
    v_phone,
    TRUE,
    CASE WHEN v_limit IS NULL THEN NULL ELSE GREATEST(v_limit - v_used, 0) END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_lovesathi_profile_contacts(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_lovesathi_profile_contact(UUID) TO authenticated;
