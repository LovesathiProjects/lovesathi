CREATE OR REPLACE FUNCTION public.enforce_free_shortlist_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_lovesathi_premium(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.shortlists
    WHERE user_id = NEW.user_id
      AND shortlisted_user_id = NEW.shortlisted_user_id
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Shortlist is a premium feature. Choose a paid plan to save profiles and revisit them anytime.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_free_shortlist_limit_before_insert ON public.shortlists;
CREATE TRIGGER enforce_free_shortlist_limit_before_insert
  BEFORE INSERT ON public.shortlists
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_free_shortlist_limit();
