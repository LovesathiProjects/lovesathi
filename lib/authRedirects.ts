export const EMAIL_VERIFICATION_STORAGE_KEY = "lovesathi.pendingVerificationEmail"
export const PHONE_VERIFICATION_STORAGE_KEY = "lovesathi.pendingVerificationPhone"

// Some WebViews and private browser modes deny sessionStorage. Pending contact
// details are only a convenience; storage failure must not undo a successful signup.
const pendingVerification = new Map<string, string | null>()

export function getVerificationStorageItem(key: string) {
  if (pendingVerification.has(key)) return pendingVerification.get(key) ?? null
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function setVerificationStorageItem(key: string, value: string) {
  pendingVerification.set(key, value)
  try { window.sessionStorage.setItem(key, value) } catch { /* Use the in-memory fallback. */ }
}

export function removeVerificationStorageItem(key: string) {
  pendingVerification.set(key, null)
  try { window.sessionStorage.removeItem(key) } catch { /* Storage may be unavailable. */ }
}

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
  const callbackUrl = new URL("/auth/callback", getBrowserOriginSiteUrl())
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
