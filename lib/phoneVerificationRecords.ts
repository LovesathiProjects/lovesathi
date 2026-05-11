import { supabase } from "@/lib/supabaseClient"
import { getUserPhoneVerifiedAt, normalizePhoneNumber, phonesMatch } from "@/lib/phone"

export interface PhoneVerificationRecord {
  phone: string
  verified_at: string
}

export async function getStoredPhoneVerification(userId: string, phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone)
  if (!userId || !normalizedPhone) return null

  const { data, error } = await supabase
    .from("phone_verifications")
    .select("phone, verified_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) return null
  return phonesMatch(data.phone, normalizedPhone) ? (data as PhoneVerificationRecord) : null
}

export async function getCurrentUserPhoneVerifiedAt(user: any, phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone)
  const authVerifiedAt = getUserPhoneVerifiedAt(user, normalizedPhone)
  if (authVerifiedAt) return authVerifiedAt

  const storedVerification = await getStoredPhoneVerification(user?.id, normalizedPhone)
  return storedVerification?.verified_at || null
}

export async function isCurrentUserPhoneVerified(user: any) {
  const phone = normalizePhoneNumber(String(user?.phone || user?.user_metadata?.phone || ""))
  if (!phone) return false
  return Boolean(await getCurrentUserPhoneVerifiedAt(user, phone))
}
