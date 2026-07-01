import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hasOAuthIdentity } from '@/lib/authUser'

export const dynamic = 'force-dynamic'

const SUPABASE_EMAIL_OTP_TYPES = new Set(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'])
const PRIMARY_SITE_ORIGIN = 'https://lovesathi.com'
const WWW_SITE_ORIGIN = 'https://www.lovesathi.com'

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function addWwwPair(origins: Set<string>, origin: string) {
  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:') return

    if (url.hostname.startsWith('www.')) {
      origins.add(`${url.protocol}//${url.hostname.slice(4)}`)
      return
    }

    origins.add(`${url.protocol}//www.${url.hostname}`)
  } catch {
    // Ignore malformed optional deployment origins.
  }
}

function getAllowedRedirectOrigins() {
  const origins = new Set<string>([PRIMARY_SITE_ORIGIN, WWW_SITE_ORIGIN])
  const configuredSiteOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
  const renderOrigin = normalizeOrigin(process.env.RENDER_EXTERNAL_URL)

  if (configuredSiteOrigin) {
    origins.add(configuredSiteOrigin)
    addWwwPair(origins, configuredSiteOrigin)
  }

  if (renderOrigin) {
    origins.add(renderOrigin)
  }

  return origins
}

function isLocalOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  } catch {
    return false
  }
}

function getRedirectOrigin(requestOrigin: string) {
  const normalizedRequestOrigin = normalizeOrigin(requestOrigin)
  if (
    normalizedRequestOrigin &&
    (getAllowedRedirectOrigins().has(normalizedRequestOrigin) || isLocalOrigin(normalizedRequestOrigin))
  ) {
    return normalizedRequestOrigin
  }

  return normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) || PRIMARY_SITE_ORIGIN
}

function getSafeNextPath(requestUrl: URL) {
  if (requestUrl.searchParams.get('mode') === 'reset' || requestUrl.searchParams.get('type') === 'recovery') {
    return '/auth/reset-password'
  }

  const next = requestUrl.searchParams.get('next')
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return null
  }

  const nextUrl = new URL(next, requestUrl.origin)
  const mode = requestUrl.searchParams.get('mode')
  if (mode) {
    nextUrl.searchParams.set('mode', mode)
  }

  return `${nextUrl.pathname}${nextUrl.search}`
}

function getVerifyEmailUrl(redirectOrigin: string, reason: 'expired' | 'unconfirmed' = 'expired') {
  const verifyEmailUrl = new URL('/auth/verify-email', redirectOrigin)
  verifyEmailUrl.searchParams.set('reason', reason)
  return verifyEmailUrl
}

function getAuthErrorUrl(redirectOrigin: string) {
  const authUrl = new URL('/auth', redirectOrigin)
  authUrl.searchParams.set('error', 'oauth')
  return authUrl
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const redirectOrigin = getRedirectOrigin(requestUrl.origin)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const otpType = requestUrl.searchParams.get('type')
  const safeNextPath = getSafeNextPath(requestUrl)
  const authError = requestUrl.searchParams.get('error') || requestUrl.searchParams.get('error_code')

  if (authError && otpType && SUPABASE_EMAIL_OTP_TYPES.has(otpType)) {
    return NextResponse.redirect(getVerifyEmailUrl(redirectOrigin))
  }

  if (authError) {
    return NextResponse.redirect(getAuthErrorUrl(redirectOrigin))
  }

  if (tokenHash && otpType && SUPABASE_EMAIL_OTP_TYPES.has(otpType)) {
    const supabase = createRouteHandlerClient({ cookies })
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType === 'email' ? 'signup' : (otpType as any),
    })

    if (verifyError) {
      return NextResponse.redirect(getVerifyEmailUrl(redirectOrigin))
    }

    if (otpType === 'recovery') {
      return NextResponse.redirect(new URL('/auth/reset-password', redirectOrigin))
    }

    if (safeNextPath) {
      return NextResponse.redirect(new URL(safeNextPath, redirectOrigin))
    }

    return NextResponse.redirect(new URL('/onboarding/verification', redirectOrigin))
  }

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(getVerifyEmailUrl(redirectOrigin))
    }
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // If user came from an OAuth provider (Google/Apple), Supabase often
      // supplies an identity record. Treat OAuth-backed accounts as email
      // verified for the purposes of onboarding flow to avoid forcing a
      // redundant email OTP step.
      if (safeNextPath) {
        return NextResponse.redirect(new URL(safeNextPath, redirectOrigin))
      }

      // Check if email is verified. If not verified but the account has an
      // OAuth identity (Google/Apple), continue; otherwise redirect to
      // verify-email so users can confirm via OTP.
      if (!user.email_confirmed_at && !hasOAuthIdentity(user)) {
        return NextResponse.redirect(new URL('/auth/verify-email', redirectOrigin))
      }

      // Check user profile for onboarding status
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('onboarding_matrimony')
        .eq('user_id', user.id)
        .single()

      if (error || !profile) {
        return NextResponse.redirect(new URL('/onboarding/verification', redirectOrigin))
      }

      if (profile.onboarding_matrimony !== true) {
        return NextResponse.redirect(new URL('/onboarding/verification', redirectOrigin))
      }

      return NextResponse.redirect(new URL('/matrimony/discovery', redirectOrigin))
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/auth/verify-email', redirectOrigin))
}
