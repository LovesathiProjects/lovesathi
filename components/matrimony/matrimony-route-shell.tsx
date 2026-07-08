"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MatrimonyMain, type MatrimonyScreen } from "@/components/matrimony/matrimony-main"
import { supabase } from "@/lib/supabaseClient"

interface MatrimonyRouteShellProps {
  initialScreen?: MatrimonyScreen
  initialChatId?: string | null
}

export function MatrimonyRouteShell({
  initialScreen = "discover",
  initialChatId = null,
}: MatrimonyRouteShellProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth")
          return
        }

        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("onboarding_matrimony")
          .eq("user_id", user.id)
          .single()

        if (error || !profile || profile.onboarding_matrimony !== true) {
          router.push("/matrimony/onboarding/basic-details")
          return
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error checking matrimony access:", error)
        router.push("/matrimony/onboarding/basic-details")
      }
    }

    void checkAccess()
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
      <MatrimonyMain
        initialScreen={initialScreen}
        initialChatId={initialChatId}
        onExit={() => {
          window.location.href = "/"
        }}
      />
    </div>
  )
}
