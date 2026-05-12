ALTER TABLE public.phone_verifications
  ALTER COLUMN verified_at DROP NOT NULL;

ALTER TABLE public.phone_verifications
  ADD COLUMN IF NOT EXISTS otp_hash TEXT,
  ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS otp_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS otp_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_send_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_send_window_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_phone_verifications_otp_expires_at
  ON public.phone_verifications(otp_expires_at);
