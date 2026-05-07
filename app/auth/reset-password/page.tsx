"use client"

import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabaseClient"

export const dynamic = "force-dynamic"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    let mounted = true
    let timeout: ReturnType<typeof setTimeout> | null = null

    async function hydrateRecoverySession() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (mounted) {
          if (error) {
            setStatus("invalid")
          } else {
            window.history.replaceState(null, "", "/auth/reset-password")
            setStatus("ready")
          }
        }
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (mounted && session) {
        setStatus("ready")
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === "PASSWORD_RECOVERY" || session) {
        setStatus("ready")
      }
    })

    void hydrateRecoverySession()

    timeout = setTimeout(async () => {
      if (!mounted) return
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setStatus(session ? "ready" : "invalid")
    }, 3000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      if (timeout) clearTimeout(timeout)
    }
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      return toast.error("Passwords do not match")
    }

    if (password.length < 8) {
      return toast.error("Password must be at least 8 characters")
    }

    setIsLoading(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error("Reset link expired or invalid. Please request a new password reset email.")
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      await supabase.auth.signOut()
      toast.success("Password updated. Please log in with your new password.", {
        duration: 2200,
      })

      setTimeout(() => {
        router.replace("/auth")
      }, 1200)
    } catch (error: any) {
      toast.error(error?.message || "Password reset failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="luxe-light-page flex min-h-screen flex-col overflow-x-hidden px-4 py-5 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-full border border-[#482b1a]/10 bg-[#ffffff]/74 px-4 py-3 shadow-sm backdrop-blur-xl">
        <Button variant="ghost" size="sm" className="rounded-full text-[#18110d]" onClick={() => router.push("/auth")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h2 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#18110d]">Set new password</h2>
        <div className="w-16" />
      </div>

      <div className="flex flex-1 items-center justify-center py-10">
        <div className="luxe-card mx-auto w-full max-w-lg space-y-6 rounded-[2rem] p-6 sm:p-8">
          <div className="space-y-2 text-center">
            <p className="luxe-kicker text-[#8f001c]">Secure recovery</p>
            <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#18110d] sm:text-5xl">
              Set new password
            </h1>
            <p className="text-base text-[#685f58]">
              Choose a new password for your Lovesathi account.
            </p>
          </div>

          {status === "checking" && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-[#d8c79f]/24 bg-white/62 p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#8f001c]" />
              <p className="text-sm font-semibold text-[#685f58]">Opening your secure Supabase recovery session...</p>
            </div>
          )}

          {status === "invalid" && (
            <div className="space-y-5 pt-2 text-center">
              <div className="rounded-[1.5rem] border border-[#8f001c]/20 bg-[#8f001c]/10 p-4 text-sm font-semibold leading-6 text-[#8f001c]">
                This reset link is expired or invalid. Please request a fresh password reset email.
              </div>
              <Button asChild className="luxe-button h-12 w-full rounded-2xl font-bold">
                <Link href="/auth/forgot-password">Request new link</Link>
              </Button>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleResetPassword} className="space-y-4 pt-4">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#1b6b43]/10 text-[#1b6b43]">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    autoComplete="new-password"
                    className="h-12 rounded-2xl border-[#482b1a]/20 bg-[#ffffff] pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-10 rounded-xl px-3 text-[#685f58] hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    autoComplete="new-password"
                    className="h-12 rounded-2xl border-[#482b1a]/20 bg-[#ffffff] pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-10 rounded-xl px-3 text-[#685f58] hover:bg-transparent"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button className="luxe-button h-12 w-full rounded-2xl font-bold" size="lg" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Password"}
              </Button>

              <Separator />
              <Button asChild variant="link" className="w-full font-bold text-[#8f001c]">
                <Link href="/auth">Back to login</Link>
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
