-- Public Lovesathi event publishing.
-- Admin writes go through guarded service-role API routes; clients only read published rows.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.lovesathi_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 4 AND 120),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary TEXT NOT NULL CHECK (char_length(trim(summary)) BETWEEN 20 AND 240),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 2400),
  event_type TEXT NOT NULL DEFAULT 'meetup'
    CHECK (event_type IN ('meetup', 'webinar', 'workshop', 'consultation', 'community')),
  city TEXT NOT NULL CHECK (char_length(trim(city)) BETWEEN 2 AND 80),
  venue TEXT CHECK (venue IS NULL OR char_length(trim(venue)) BETWEEN 2 AND 180),
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  rsvp_url TEXT CHECK (rsvp_url IS NULL OR rsvp_url ~ '^https?://'),
  whatsapp_url TEXT CHECK (whatsapp_url IS NULL OR whatsapp_url ~ '^https?://'),
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  CONSTRAINT lovesathi_events_time_order_check
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_lovesathi_events_public
  ON public.lovesathi_events(status, starts_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_lovesathi_events_featured
  ON public.lovesathi_events(is_featured, starts_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_lovesathi_events_admin_status
  ON public.lovesathi_events(status, updated_at DESC);

CREATE OR REPLACE FUNCTION public.set_lovesathi_event_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.title = trim(NEW.title);
  NEW.slug = lower(trim(NEW.slug));
  NEW.summary = trim(NEW.summary);
  NEW.city = trim(NEW.city);
  NEW.venue = NULLIF(trim(COALESCE(NEW.venue, '')), '');
  NEW.rsvp_url = NULLIF(trim(COALESCE(NEW.rsvp_url, '')), '');
  NEW.whatsapp_url = NULLIF(trim(COALESCE(NEW.whatsapp_url, '')), '');
  NEW.updated_at = TIMEZONE('utc', NOW());

  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = TIMEZONE('utc', NOW());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_lovesathi_event_timestamps ON public.lovesathi_events;

CREATE TRIGGER set_lovesathi_event_timestamps
BEFORE INSERT OR UPDATE ON public.lovesathi_events
FOR EACH ROW
EXECUTE FUNCTION public.set_lovesathi_event_timestamps();

ALTER TABLE public.lovesathi_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published events are publicly readable" ON public.lovesathi_events;

CREATE POLICY "Published events are publicly readable"
ON public.lovesathi_events
FOR SELECT
TO anon, authenticated
USING (status = 'published');

GRANT SELECT ON public.lovesathi_events TO anon;
GRANT SELECT ON public.lovesathi_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovesathi_events TO service_role;

COMMENT ON TABLE public.lovesathi_events IS
  'Public event listings created through the Lovesathi admin portal. Only published rows are readable by app clients.';
