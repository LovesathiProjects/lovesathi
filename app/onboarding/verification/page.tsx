"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { VerificationScreen } from "@/components/onboarding/verification-screen"
import { supabase } from "@/lib/supabaseClient"

export default function VerificationPage() {
  const router = useRouter()
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth")
          return
        }

        if (!user.email_confirmed_at) {
          router.push("/auth/verify-email")
          return
        }

        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("onboarding_matrimony")
          .eq("user_id", user.id)
          .single()

        if (!error && profile?.onboarding_matrimony === true) {
          router.replace("/matrimony/discovery")
          return
        }

        setIsCheckingProfile(false)
      } catch (err) {
        console.error("Error checking onboarding status:", err)
        setIsCheckingProfile(false)
      }
    }

    checkOnboardingStatus()
  }, [router])

  if (isCheckingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <VerificationScreen
      onComplete={() => router.push("/onboarding/matrimony-setup")}
      onSkip={() => router.push("/onboarding/matrimony-setup")}
    />
  )
}
