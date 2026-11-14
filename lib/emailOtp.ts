import type { SupabaseClient } from "@supabase/supabase-js"

// Supabase email OTP length is configurable; phone OTP length is separate.
export const MAX_EMAIL_OTP_LENGTH = 10

export function normalizeEmailOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, MAX_EMAIL_OTP_LENGTH)
}

export function isCompleteEmailOtp(value: string) {
  return /^\d{6,10}$/.test(value)
}
export async function verifyEmailCode(client: SupabaseClient, email: string, code: string) {
  const token = normalizeEmailOtp(code)
  if (!isCompleteEmailOtp(token)) throw new Error("Enter the complete email code (6 to 10 digits).")
  const { data, error } = await client.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" })
  if (error) throw error
  if (!data.session || !data.user) throw new Error("Your session could not be established. Please request a fresh email code.")
  return data
}
