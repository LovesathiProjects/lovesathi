import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getRedirectOrigin(requestOrigin: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl?.startsWith('http')) {
    return siteUrl.replace(/\/$/, '')
  }
  return requestOrigin
}

function getSafeNextPath(requestUrl: URL) {
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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const redirectOrigin = getRedirectOrigin(requestUrl.origin)
  const code = requestUrl.searchParams.get('code')
  const safeNextPath = getSafeNextPath(requestUrl)

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      if (safeNextPath) {
        return NextResponse.redirect(new URL(safeNextPath, redirectOrigin))
      }

      // Check if email is verified (OAuth providers usually verify automatically, but check anyway)
      if (!user.email_confirmed_at) {
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
