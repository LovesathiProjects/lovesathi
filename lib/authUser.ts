import type { User } from "@supabase/supabase-js"

const EMAIL_PROVIDER = "email"

type AuthIdentityUser = Pick<User, "app_metadata" | "identities">
type EmailVerificationUser = Pick<User, "app_metadata" | "email_confirmed_at" | "identities">

export function hasOAuthIdentity(user: AuthIdentityUser | null | undefined) {
  const metadataProvider = user?.app_metadata?.provider
  if (typeof metadataProvider === "string" && metadataProvider && metadataProvider !== EMAIL_PROVIDER) {
    return true
  }

  return user?.identities?.some((identity) => identity.provider && identity.provider !== EMAIL_PROVIDER) ?? false
}

export function hasConfirmedEmailOrOAuth(user: EmailVerificationUser | null | undefined) {
  return Boolean(user?.email_confirmed_at || hasOAuthIdentity(user))
}
