-- Tighten Lovesathi event trigger security posture and FK performance.

CREATE INDEX IF NOT EXISTS idx_lovesathi_events_created_by
  ON public.lovesathi_events(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lovesathi_events_updated_by
  ON public.lovesathi_events(updated_by)
  WHERE updated_by IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_lovesathi_event_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
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
