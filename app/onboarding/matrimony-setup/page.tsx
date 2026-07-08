"use client"

import React, { useEffect, useState } from "react"
import { MatrimonySetup } from "@/components/matrimony/matrimony-setup"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function MatrimonySetupPage() {
  const router = useRouter()
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)

  // Check if user already completed matrimony onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth')
          setIsCheckingProfile(false)
          return
        }

        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('onboarding_matrimony')
          .eq('user_id', user.id)
          .single()

        // Use onboarding_matrimony field, not selected_path or onboarding_completed
        if (!error && profile && profile.onboarding_matrimony === true) {
          // User already completed matrimony onboarding, redirect to discovery
          router.push('/matrimony/discovery')
          return
        }
        
        // Not completed or error, show setup page
        setIsCheckingProfile(false)
      } catch (err) {
        console.error('Error checking onboarding status:', err)
        setIsCheckingProfile(false)
      }
    }

    checkOnboardingStatus()
  }, [router])

  if (isCheckingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F7FB] px-4">
        <div className="rounded-[2rem] border border-[#E1E7EF] bg-white/86 p-8 text-center shadow-[0_24px_70px_rgba(24,17,13,0.08)]">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#E83262] border-t-transparent" />
          <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">Preparing your profile</p>
          <p className="mt-2 text-sm text-[#6F7C8B]">Checking your saved setup securely.</p>
        </div>
      </div>
    )
  }

  return <MatrimonySetup />
}
