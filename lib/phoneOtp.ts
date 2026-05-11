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

export async function requestCurrentUserPhoneOtp(phoneInput: string) {
  const phone = normalizePhoneNumber(phoneInput)
  const phoneError = getPhoneValidationMessage(phone)
  if (phoneError) throw new Error(phoneError)

  const user = await getSignedInUser()
  const verifiedAt = getUserPhoneVerifiedAt(user, phone)
  if (verifiedAt) {
    return { phone, alreadyVerified: true, verifiedAt }
  }

  const { error } = await supabase.auth.updateUser({
    phone,
    data: {
      ...(user.user_metadata || {}),
      phone,
    },
  })

  if (error) throw error

  return { phone, alreadyVerified: false, verifiedAt: null }
}

export async function resendCurrentUserPhoneOtp(phoneInput: string) {
  const phone = normalizePhoneNumber(phoneInput)
  const phoneError = getPhoneValidationMessage(phone)
  if (phoneError) throw new Error(phoneError)

  await getSignedInUser()

  const { error } = await supabase.auth.resend({
    type: "phone_change",
    phone,
  })

  if (error) throw error
  return { phone }
}

export async function verifyCurrentUserPhoneOtp(phoneInput: string, tokenInput: string) {
  const phone = normalizePhoneNumber(phoneInput)
  const phoneError = getPhoneValidationMessage(phone)
  if (phoneError) throw new Error(phoneError)

  const token = normalizePhoneOtpCode(tokenInput)
  if (token.length !== PHONE_OTP_LENGTH) {
    throw new Error("Please enter the 6-digit phone verification code.")
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "phone_change",
  })

  if (error) throw error

  let verifiedUser = data.user || null

  try {
    const {
      data: { user },
    } = await supabase.auth.refreshSession()
    verifiedUser = user || verifiedUser
  } catch {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    verifiedUser = user || verifiedUser
  }

  const nextPhone = normalizePhoneNumber(getAuthUserPhone(verifiedUser) || phone)
  const verifiedAt =
    getUserPhoneVerifiedAt(verifiedUser, phone) ||
    getUserPhoneVerifiedAt(verifiedUser, nextPhone) ||
    new Date().toISOString()

  return { phone: nextPhone || phone, verifiedAt, user: verifiedUser }
}
