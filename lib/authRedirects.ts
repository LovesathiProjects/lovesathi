export const EMAIL_VERIFICATION_STORAGE_KEY = "lovesathi.pendingVerificationEmail"
export const PHONE_VERIFICATION_STORAGE_KEY = "lovesathi.pendingVerificationPhone"

export function getClientSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (configuredUrl?.startsWith("http")) {
    return configuredUrl.replace(/\/$/, "")
  }

  return window.location.origin
}

export function getBrowserOriginSiteUrl() {
  if (typeof window !== "undefined" && window.location.origin.startsWith("http")) {
    return window.location.origin.replace(/\/$/, "")
  }

  return getClientSiteUrl()
}

export function getEmailVerificationRedirectUrl() {
  const callbackUrl = new URL("/auth/callback", getClientSiteUrl())
  callbackUrl.searchParams.set("next", "/onboarding/verification")
  return callbackUrl.toString()
}

export function getOAuthRedirectUrl() {
  return new URL("/auth/callback", getBrowserOriginSiteUrl()).toString()
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isEmailNotConfirmedError(error: unknown) {
  if (!error || typeof error !== "object") return false

  const maybeError = error as { code?: string; message?: string }
  const code = maybeError.code?.toLowerCase()
  const message = maybeError.message?.toLowerCase() || ""

  return code === "email_not_confirmed" || message.includes("email not confirmed")
}
