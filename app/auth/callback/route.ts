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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const redirectOrigin = getRedirectOrigin(requestUrl.origin)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Check if email is verified (OAuth providers usually verify automatically, but check anyway)
      if (!user.email_confirmed_at) {
        console.log('Email not verified, sending to email verification')
        return NextResponse.redirect(new URL('/auth/verify-email', redirectOrigin))
      }

      // Check user profile for onboarding status
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('onboarding_matrimony')
        .eq('user_id', user.id)
        .single()

      if (error || !profile) {
        console.log('No profile found, sending to onboarding')
        return NextResponse.redirect(new URL('/onboarding/verification', redirectOrigin))
      }

      if (profile.onboarding_matrimony !== true) {
        console.log('Matrimony onboarding not completed, sending to verification:', {
          onboarding_matrimony: profile.onboarding_matrimony,
        })
        return NextResponse.redirect(new URL('/onboarding/verification', redirectOrigin))
      }

      return NextResponse.redirect(new URL('/matrimony/discovery', redirectOrigin))
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/auth/verify-email', redirectOrigin))
}
