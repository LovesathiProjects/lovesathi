-- Harden the admin module timestamp trigger flagged by Supabase advisors.
-- The function is used only by admin-managed operational tables.

CREATE OR REPLACE FUNCTION public.set_lovesathi_admin_module_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$;
