-- Lovesathi admin operations modules.
-- Payment and OTP delivery integrations remain separate; this migration adds
-- admin-managed content, settings, event registration/report data, and banner
-- storage needed by the admin CRM surface.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.lovesathi_events
ADD COLUMN IF NOT EXISTS banner_url TEXT CHECK (banner_url IS NULL OR banner_url ~ '^https?://');

CREATE TABLE IF NOT EXISTS public.lovesathi_event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.lovesathi_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attendee_name TEXT NOT NULL CHECK (char_length(trim(attendee_name)) BETWEEN 2 AND 120),
  attendee_email TEXT CHECK (attendee_email IS NULL OR attendee_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  attendee_phone TEXT CHECK (attendee_phone IS NULL OR char_length(trim(attendee_phone)) BETWEEN 7 AND 24),
  status TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'approved', 'rejected', 'canceled')),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 800),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_lovesathi_event_registrations_event
  ON public.lovesathi_event_registrations(event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lovesathi_event_registrations_user
  ON public.lovesathi_event_registrations(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.lovesathi_event_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.lovesathi_events(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) BETWEEN 3 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1200),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_lovesathi_event_reports_status
  ON public.lovesathi_event_reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.lovesathi_success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_names TEXT NOT NULL CHECK (char_length(trim(couple_names)) BETWEEN 3 AND 140),
  city TEXT CHECK (city IS NULL OR char_length(trim(city)) BETWEEN 2 AND 80),
  story TEXT NOT NULL CHECK (char_length(trim(story)) BETWEEN 20 AND 1600),
  image_url TEXT CHECK (image_url IS NULL OR image_url ~ '^https?://'),
  wedding_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_lovesathi_success_stories_public
  ON public.lovesathi_success_stories(status, display_order, created_at DESC)
  WHERE status = 'published';

CREATE TABLE IF NOT EXISTS public.lovesathi_site_settings (
  key TEXT PRIMARY KEY CHECK (key ~ '^[a-z0-9_.-]+$'),
  category TEXT NOT NULL DEFAULT 'general' CHECK (char_length(trim(category)) BETWEEN 2 AND 80),
  label TEXT NOT NULL CHECK (char_length(trim(label)) BETWEEN 2 AND 120),
  value TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_lovesathi_site_settings_category
  ON public.lovesathi_site_settings(category, key);

INSERT INTO public.lovesathi_site_settings (key, category, label, value)
VALUES
  ('contact.phone', 'contact', 'Contact phone', '+91 91755 54708'),
  ('contact.email', 'contact', 'Support email', ''),
  ('social.instagram', 'social', 'Instagram', ''),
  ('social.facebook', 'social', 'Facebook', ''),
  ('social.youtube', 'social', 'YouTube', '')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.lovesathi_notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('push', 'email', 'sms')),
  audience TEXT NOT NULL DEFAULT 'all' CHECK (char_length(trim(audience)) BETWEEN 2 AND 80),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 140),
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 2 AND 1200),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'archived')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_lovesathi_notification_campaigns_channel
  ON public.lovesathi_notification_campaigns(channel, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_lovesathi_admin_module_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_lovesathi_event_registration_timestamps ON public.lovesathi_event_registrations;
CREATE TRIGGER set_lovesathi_event_registration_timestamps
BEFORE UPDATE ON public.lovesathi_event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.set_lovesathi_admin_module_timestamps();

DROP TRIGGER IF EXISTS set_lovesathi_event_report_timestamps ON public.lovesathi_event_reports;
CREATE TRIGGER set_lovesathi_event_report_timestamps
BEFORE UPDATE ON public.lovesathi_event_reports
FOR EACH ROW
EXECUTE FUNCTION public.set_lovesathi_admin_module_timestamps();

DROP TRIGGER IF EXISTS set_lovesathi_success_story_timestamps ON public.lovesathi_success_stories;
CREATE TRIGGER set_lovesathi_success_story_timestamps
BEFORE UPDATE ON public.lovesathi_success_stories
FOR EACH ROW
EXECUTE FUNCTION public.set_lovesathi_admin_module_timestamps();

DROP TRIGGER IF EXISTS set_lovesathi_site_setting_timestamps ON public.lovesathi_site_settings;
CREATE TRIGGER set_lovesathi_site_setting_timestamps
BEFORE UPDATE ON public.lovesathi_site_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_lovesathi_admin_module_timestamps();

DROP TRIGGER IF EXISTS set_lovesathi_notification_campaign_timestamps ON public.lovesathi_notification_campaigns;
CREATE TRIGGER set_lovesathi_notification_campaign_timestamps
BEFORE UPDATE ON public.lovesathi_notification_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.set_lovesathi_admin_module_timestamps();

ALTER TABLE public.lovesathi_event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lovesathi_event_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lovesathi_success_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lovesathi_site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lovesathi_notification_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published success stories are publicly readable" ON public.lovesathi_success_stories;
CREATE POLICY "Published success stories are publicly readable"
ON public.lovesathi_success_stories
FOR SELECT
TO anon, authenticated
USING (status = 'published');

GRANT SELECT ON public.lovesathi_success_stories TO anon;
GRANT SELECT ON public.lovesathi_success_stories TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovesathi_event_registrations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovesathi_event_reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovesathi_success_stories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovesathi_site_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovesathi_notification_campaigns TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lovesathi-event-banners',
  'lovesathi-event-banners',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public event banners are readable" ON storage.objects;
CREATE POLICY "Public event banners are readable"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'lovesathi-event-banners');

COMMENT ON TABLE public.lovesathi_event_registrations IS
  'Admin-visible registrations for Lovesathi events. Public registration UI can be added later through guarded API routes.';

COMMENT ON TABLE public.lovesathi_success_stories IS
  'Admin-managed success stories; only published rows are publicly readable.';
