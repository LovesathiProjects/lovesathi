"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabaseClient"

export const dynamic = "force-dynamic"

function getClientSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (configuredUrl?.startsWith("http")) {
    return configuredUrl.replace(/\/$/, "")
  }
  return window.location.origin
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<"request" | "sent">("request")
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")

  const normalizedEmail = email.trim().toLowerCase()

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const redirectTo = `${getClientSiteUrl()}/auth/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      })

      if (error) throw error

      toast.success("If an account exists, Supabase has sent a password reset link.")
      setStep("sent")
    } catch (error: any) {
      toast.error(error?.message || "Could not send password reset email")
    } finally {
      setIsLoading(false)
    }
  }

  const title = step === "sent" ? "Check your email" : "Forgot password"
  const subtitle =
    step === "sent"
        ? "Open the Supabase recovery email and follow the secure link."
        : "Enter your email and Supabase will send a secure recovery link if the account exists."

  return (
    <div className="luxe-light-page flex min-h-screen flex-col overflow-x-hidden px-4 py-5 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-full border border-[#482b1a]/10 bg-[#fffaf2]/74 px-4 py-3 shadow-sm backdrop-blur-xl">
        <Button variant="ghost" size="sm" className="rounded-full text-[#18110d]" onClick={() => router.push("/auth")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h2 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#18110d]">{title}</h2>
        <div className="w-16" />
      </div>

      <div className="flex flex-1 items-center justify-center py-10">
        <div className="luxe-card mx-auto w-full max-w-lg space-y-6 rounded-[2rem] p-6 sm:p-8">
          <div className="space-y-2 text-center">
            <p className="luxe-kicker text-[#8f001c]">Supabase recovery</p>
            <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#18110d] sm:text-5xl">{title}</h1>
            <p className="text-base text-[#6c5a4a]">{subtitle}</p>
          </div>

          {step === "request" && (
            <form onSubmit={handleSendResetLink} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  className="h-12 rounded-2xl border-[#482b1a]/20 bg-[#fffaf2]"
                />
              </div>

              <Button className="luxe-button h-12 w-full rounded-2xl font-bold" type="submit" size="lg" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}

          {step === "sent" && (
            <div className="space-y-5 pt-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#d9b978]/28 bg-[#fff7e8] text-[#8f001c] shadow-[0_18px_48px_rgba(24,17,13,0.08)]">
                <Mail className="h-8 w-8" />
              </div>
              <div className="rounded-[1.5rem] border border-[#d9b978]/24 bg-white/62 p-4 text-sm font-semibold leading-6 text-[#6c5a4a]">
                Check your inbox and spam folder. The recovery link opens a secure Supabase session where you can set a new password.
              </div>
              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl border-[#482b1a]/16 bg-[#fffaf2] font-bold text-[#18110d]"
                onClick={() => setStep("request")}
              >
                Use a different email
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
