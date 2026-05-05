"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"

interface AppleLoginButtonProps {
  variant?: "login" | "signup"
}

export default function AppleLoginButton({ variant = "signup" }: AppleLoginButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleAppleLogin = async () => {
    try {
      setIsLoading(true)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || window.location.origin
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err) {
      console.error("Apple Sign-in Error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const buttonText = variant === "login" ? "Log in with Apple" : "Sign in with Apple"

  return (
    <Button
      variant="outline"
      className={`h-12 w-full rounded-2xl border border-[#482b1a]/18 bg-[#fffaf2]/86 font-bold text-[#18110d] shadow-sm transition-all hover:border-[#8f001c]/40 hover:bg-white hover:text-[#8f001c] active:bg-[#f6ead8] ${
        isPressed || isLoading ? "opacity-80" : ""
      }`}
      size="lg"
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onClick={handleAppleLogin}
      disabled={isLoading}
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
      {isLoading ? "Signing in..." : buttonText}
    </Button>
  )
}
