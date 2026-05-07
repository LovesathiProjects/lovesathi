-- Supabase Auth now owns password recovery email, so the legacy custom OTP table is no longer used.
drop table if exists public.otp_codes;
