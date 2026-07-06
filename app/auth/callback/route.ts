import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hasOAuthIdentity } from '@/lib/authUser'

export const dynamic = 'force-dynamic'

const SUPABASE_EMAIL_OTP_TYPES = new Set(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'])
const PRIMARY_SITE_ORIGIN = 'https://lovesathi.com'
const WWW_SITE_ORIGIN = 'https://www.lovesathi.com'

type PendingCookie = {
  name: string
  value: string
  options: CookieOptions
}

type OAuthErrorReason =
  | 'provider'
  | 'exchange'
  | 'verify'
  | 'callback_exception'
  | 'missing_user'
  | 'no_callback_params'

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

function isLocalDevelopmentOrigin(origin: string) {
  if (process.env.NODE_ENV === 'production') return false

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
    (getAllowedRedirectOrigins().has(normalizedRequestOrigin) || isLocalDevelopmentOrigin(normalizedRequestOrigin))
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

function sanitizeErrorCode(value: string | null | undefined) {
  if (!value) return null
  const sanitized = value.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 64)
  return sanitized || null
}

function getAuthErrorUrl(redirectOrigin: string, reason: OAuthErrorReason, code?: string | null) {
  const authUrl = new URL('/auth', redirectOrigin)
  authUrl.searchParams.set('error', 'oauth')
  authUrl.searchParams.set('reason', reason)

  const safeCode = sanitizeErrorCode(code)
  if (safeCode) {
    authUrl.searchParams.set('code', safeCode)
  }

  return authUrl
}

function redirectWithCookies(url: URL, pendingCookies: PendingCookie[] = []) {
  const response = NextResponse.redirect(url)

  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options as any)
  }

  return response
}

async function createCallbackSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase URL or anon key for auth callback')
  }

  const cookieStore = await cookies()
  const pendingCookies: PendingCookie[] = []
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        pendingCookies.push(...cookiesToSet)

        for (const { name, value, options } of cookiesToSet) {
          try {
            cookieStore.set(name, value, options as any)
          } catch {
            // The redirect response below still receives the cookies.
          }
        }
      },
    },
  })

  return { pendingCookies, supabase }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const redirectOrigin = getRedirectOrigin(requestUrl.origin)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const otpType = requestUrl.searchParams.get('type')
  const safeNextPath = getSafeNextPath(requestUrl)
  const authError = requestUrl.searchParams.get('error') || requestUrl.searchParams.get('error_code')

  try {
    if (authError && otpType && SUPABASE_EMAIL_OTP_TYPES.has(otpType)) {
      return redirectWithCookies(getVerifyEmailUrl(redirectOrigin))
    }

    if (authError) {
      console.error('OAuth provider returned an error:', {
        error: authError,
        error_code: requestUrl.searchParams.get('error_code'),
      })
      return redirectWithCookies(getAuthErrorUrl(redirectOrigin, 'provider', authError))
    }

    if (tokenHash && otpType && SUPABASE_EMAIL_OTP_TYPES.has(otpType)) {
      const { pendingCookies, supabase } = await createCallbackSupabaseClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType === 'email' ? 'signup' : (otpType as any),
      })

      if (verifyError) {
        console.error('Auth callback email OTP verification failed:', {
          code: verifyError.code,
          message: verifyError.message,
          status: verifyError.status,
        })
        return redirectWithCookies(getVerifyEmailUrl(redirectOrigin), pendingCookies)
      }

      if (otpType === 'recovery') {
        return redirectWithCookies(new URL('/auth/reset-password', redirectOrigin), pendingCookies)
      }

      if (safeNextPath) {
        return redirectWithCookies(new URL(safeNextPath, redirectOrigin), pendingCookies)
      }

      return redirectWithCookies(new URL('/onboarding/verification', redirectOrigin), pendingCookies)
    }

    if (code) {
      const { pendingCookies, supabase } = await createCallbackSupabaseClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Auth callback code exchange failed:', {
          code: exchangeError.code,
          message: exchangeError.message,
          status: exchangeError.status,
        })
        const failureUrl = safeNextPath
          ? getVerifyEmailUrl(redirectOrigin)
          : getAuthErrorUrl(redirectOrigin, 'exchange', exchangeError.code)
        return redirectWithCookies(failureUrl, pendingCookies)
      }

      const user = data.user || (await supabase.auth.getUser()).data.user

      if (user) {
        // If user came from an OAuth provider (Google/Apple), Supabase often
        // supplies an identity record. Treat OAuth-backed accounts as email
        // verified for the purposes of onboarding flow to avoid forcing a
        // redundant email OTP step.
        if (safeNextPath) {
          return redirectWithCookies(new URL(safeNextPath, redirectOrigin), pendingCookies)
        }

        // Check if email is verified. If not verified but the account has an
        // OAuth identity (Google/Apple), continue; otherwise redirect to
        // verify-email so users can confirm via OTP.
        if (!user.email_confirmed_at && !hasOAuthIdentity(user)) {
          return redirectWithCookies(new URL('/auth/verify-email', redirectOrigin), pendingCookies)
        }

        // Check user profile for onboarding status
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('onboarding_matrimony')
          .eq('user_id', user.id)
          .single()

        if (error || !profile) {
          return redirectWithCookies(new URL('/onboarding/verification', redirectOrigin), pendingCookies)
        }

        if (profile.onboarding_matrimony !== true) {
          return redirectWithCookies(new URL('/onboarding/verification', redirectOrigin), pendingCookies)
        }

        return redirectWithCookies(new URL('/matrimony/discovery', redirectOrigin), pendingCookies)
      }

      console.error('Auth callback completed code exchange but returned no user')
      return redirectWithCookies(getAuthErrorUrl(redirectOrigin, 'missing_user'))
    }
  } catch (error) {
    console.error('Auth callback failed:', error)
    return redirectWithCookies(getAuthErrorUrl(redirectOrigin, 'callback_exception'))
  }

  // URL to redirect to after sign in process completes
  return redirectWithCookies(getAuthErrorUrl(redirectOrigin, 'no_callback_params'))
}
