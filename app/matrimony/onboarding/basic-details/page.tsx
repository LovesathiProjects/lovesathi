"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function MatrimonyBasicDetailsPage() {
  const router = useRouter()

  // Check if user is authenticated and redirect to matrimony setup
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth')
          return
        }

        // Check if onboarding is already completed
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_matrimony')
          .eq('user_id', user.id)
          .single()

        if (profile?.onboarding_matrimony === true) {
          // Already completed, redirect to discover
          router.push('/matrimony/discovery')
          return
        }

        // Redirect to matrimony setup page
        router.push('/onboarding/matrimony-setup')
      } catch (error) {
        console.error('Error checking auth:', error)
        router.push('/onboarding/matrimony-setup')
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F7FB] px-4">
      <div className="rounded-[2rem] border border-[#E1E7EF] bg-white/86 p-8 text-center shadow-[0_24px_70px_rgba(24,17,13,0.08)]">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#E83262] border-t-transparent" />
        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">Opening profile setup</p>
        <p className="mt-2 text-sm text-[#6F7C8B]">You will continue where you left off.</p>
      </div>
    </div>
  )
}
