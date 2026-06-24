import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const SUPABASE_EMAIL_OTP_TYPES = new Set(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'])

function getRedirectOrigin(requestOrigin: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl?.startsWith('http')) {
    return siteUrl.replace(/\/$/, '')
  }
  return requestOrigin
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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const redirectOrigin = getRedirectOrigin(requestUrl.origin)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const otpType = requestUrl.searchParams.get('type')
  const safeNextPath = getSafeNextPath(requestUrl)
  const authError = requestUrl.searchParams.get('error') || requestUrl.searchParams.get('error_code')

  if (authError) {
    return NextResponse.redirect(getVerifyEmailUrl(redirectOrigin))
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
      const hasOAuthIdentity = user.identities?.some(
        (identity) => identity.provider && identity.provider !== 'email',
      ) ?? false

      if (safeNextPath) {
        return NextResponse.redirect(new URL(safeNextPath, redirectOrigin))
      }

      // Check if email is verified. If not verified but the account has an
      // OAuth identity (Google/Apple), continue; otherwise redirect to
      // verify-email so users can confirm via OTP.
      if (!user.email_confirmed_at && !hasOAuthIdentity) {
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
