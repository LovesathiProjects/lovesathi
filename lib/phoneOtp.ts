import { supabase } from "@/lib/supabaseClient"
import {
  getAuthUserPhone,
  getPhoneValidationMessage,
  getUserPhoneVerifiedAt,
  normalizePhoneNumber,
} from "@/lib/phone"

export const PHONE_OTP_LENGTH = 6

export function normalizePhoneOtpCode(value: string) {
  return value.replace(/\D/g, "").slice(0, PHONE_OTP_LENGTH)
}

async function getSignedInUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) throw new Error("Please finish email verification before phone verification.")
  return user
}

async function updateProfilePhone(phone: string, verifiedAt?: string | null) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const updateData: Record<string, string | null> = {
    phone,
    updated_at: new Date().toISOString(),
  }

  if (verifiedAt !== undefined) {
    updateData.phone_verified_at = verifiedAt
  }

  const { error } = await supabase.from("user_profiles").update(updateData).eq("user_id", user.id)
  if (error) throw error
}

async function refreshVerifiedPhoneSession(phone: string) {
  let refreshedUser = null

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.refreshSession()

    if (error) throw error
    refreshedUser = user
  } catch {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    refreshedUser = user
  }

  const nextPhone = normalizePhoneNumber(getAuthUserPhone(refreshedUser) || phone)
  const verifiedAt =
    getUserPhoneVerifiedAt(refreshedUser, phone) ||
    getUserPhoneVerifiedAt(refreshedUser, nextPhone) ||
    new Date().toISOString()

  await updateProfilePhone(nextPhone || phone, verifiedAt)
  return { phone: nextPhone || phone, verifiedAt, user: refreshedUser }
}

export async function requestCurrentUserPhoneOtp(phoneInput: string) {
  const phone = normalizePhoneNumber(phoneInput)
  const phoneError = getPhoneValidationMessage(phone)
  if (phoneError) throw new Error(phoneError)

  const user = await getSignedInUser()
  const verifiedAt = getUserPhoneVerifiedAt(user, phone)
  if (verifiedAt) {
    return { phone, alreadyVerified: true, verifiedAt }
  }

  const { error } = await supabase.auth.updateUser({ phone })
  if (error) throw error

  await updateProfilePhone(phone, null)
  return { phone, alreadyVerified: false, verifiedAt: null }
}

export async function resendCurrentUserPhoneOtp(phoneInput: string) {
  return requestCurrentUserPhoneOtp(phoneInput)
}

export async function verifyCurrentUserPhoneOtp(phoneInput: string, tokenInput: string) {
  const phone = normalizePhoneNumber(phoneInput)
  const phoneError = getPhoneValidationMessage(phone)
  if (phoneError) throw new Error(phoneError)

  const token = normalizePhoneOtpCode(tokenInput)
  if (token.length !== PHONE_OTP_LENGTH) {
    throw new Error("Please enter the 6-digit phone verification code.")
  }

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "phone_change",
  })

  if (error) throw error
  return refreshVerifiedPhoneSession(phone)
}
