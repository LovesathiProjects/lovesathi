import { supabase } from "@/lib/supabaseClient"
import { getPhoneValidationMessage, getUserPhoneVerifiedAt, normalizePhoneNumber } from "@/lib/phone"

function validateOtpToken(token: string) {
  const normalized = token.replace(/\D/g, "").slice(0, 6)
  if (normalized.length !== 6) {
    throw new Error("Please enter the 6-digit phone verification code.")
  }
  return normalized
}

async function getSignedInUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) throw new Error("Please sign in before verifying your phone number.")
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

  const token = validateOtpToken(tokenInput)

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "phone_change",
  })

  if (error) throw error

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const verifiedAt = getUserPhoneVerifiedAt(user || data.user, phone) || new Date().toISOString()
  return { phone, verifiedAt, user: user || data.user }
}
