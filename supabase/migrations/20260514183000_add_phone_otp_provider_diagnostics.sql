ALTER TABLE public.phone_verifications
  ADD COLUMN IF NOT EXISTS otp_provider TEXT,
  ADD COLUMN IF NOT EXISTS otp_provider_request_id TEXT,
  ADD COLUMN IF NOT EXISTS otp_provider_status TEXT,
  ADD COLUMN IF NOT EXISTS otp_provider_response TEXT,
  ADD COLUMN IF NOT EXISTS otp_provider_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_phone_verifications_otp_provider_request_id
  ON public.phone_verifications(otp_provider_request_id);
