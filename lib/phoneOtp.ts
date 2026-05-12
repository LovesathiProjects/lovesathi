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

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error("Please sign in before phone verification.")
  }

  return session.access_token
}

async function callPhoneOtpFunction(body: Record<string, string>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase phone verification is not configured.")
  }

  const token = await getAccessToken()
  const response = await fetch(`${supabaseUrl}/functions/v1/phone-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || "Phone verification failed. Please try again.")
  }

  return payload
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

  const payload = await callPhoneOtpFunction({ action: "send", phone })
  return {
    phone: normalizePhoneNumber(payload.phone || phone),
    alreadyVerified: Boolean(payload.alreadyVerified),
    verifiedAt: payload.verifiedAt || null,
  }
}

export async function resendCurrentUserPhoneOtp(phoneInput: string) {
  const phone = normalizePhoneNumber(phoneInput)
  const phoneError = getPhoneValidationMessage(phone)
  if (phoneError) throw new Error(phoneError)

  const payload = await callPhoneOtpFunction({ action: "send", phone })
  return { phone: normalizePhoneNumber(payload.phone || phone) }
}

export async function verifyCurrentUserPhoneOtp(phoneInput: string, tokenInput: string) {
  const phone = normalizePhoneNumber(phoneInput)
  const phoneError = getPhoneValidationMessage(phone)
  if (phoneError) throw new Error(phoneError)

  const token = normalizePhoneOtpCode(tokenInput)
  if (token.length !== PHONE_OTP_LENGTH) {
    throw new Error("Please enter the 6-digit phone verification code.")
  }

  const payload = await callPhoneOtpFunction({ action: "verify", phone, token })

  let verifiedUser = null
  try {
    const {
      data: { user },
    } = await supabase.auth.refreshSession()
    verifiedUser = user
  } catch {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    verifiedUser = user
  }

  const nextPhone = normalizePhoneNumber(payload.phone || getAuthUserPhone(verifiedUser) || phone)
  const verifiedAt =
    payload.verifiedAt ||
    getUserPhoneVerifiedAt(verifiedUser, phone) ||
    getUserPhoneVerifiedAt(verifiedUser, nextPhone) ||
    new Date().toISOString()

  return { phone: nextPhone || phone, verifiedAt, user: verifiedUser }
}
