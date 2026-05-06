"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MatrimonyMain } from "@/components/matrimony/matrimony-main"
import { supabase } from "@/lib/supabaseClient"

export default function MatrimonyDiscovery() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth')
          return
        }

        // Fetch user profile with explicit field selection
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('onboarding_matrimony')
          .eq('user_id', user.id)
          .single()

        // If error or no profile, redirect to onboarding
        if (error || !profile) {
          router.push('/matrimony/onboarding/basic-details')
          return
        }

        // STRICT CHECK: onboarding_matrimony must be EXACTLY true
        // If it's false, null, or undefined, redirect to onboarding
        if (profile.onboarding_matrimony !== true) {
          router.push('/matrimony/onboarding/basic-details')
          return
        }

        // Only if onboarding_matrimony === true, show discovery
        setIsLoading(false)
      } catch (error) {
        console.error('Error checking onboarding:', error)
        router.push('/matrimony/onboarding/basic-details')
      }
    }

    checkOnboarding()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white matrimony-theme">
        <p className="text-black">Loading...</p>
      </div>
    )
  }

  return (
    <div className="matrimony-theme">
      <MatrimonyMain onExit={() => {
        window.location.href = "/"
      }} />
    </div>
  )
}
