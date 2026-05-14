"use client"

import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, Crown, Eye, EyeOff, Heart, ShieldCheck, Sparkles, Users } from "lucide-react"
import AppleLoginButton from "@/components/auth/AppleLoginButton"
import GoogleLoginButton from "@/components/auth/GoogleLoginButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhoneNumberInput } from "@/components/ui/phone-number-input"
import {
  EMAIL_VERIFICATION_STORAGE_KEY,
  PHONE_VERIFICATION_STORAGE_KEY,
  getEmailVerificationRedirectUrl,
  isEmailNotConfirmedError,
  normalizeEmail,
} from "@/lib/authRedirects"
import { getPhoneValidationMessage, normalizePhoneNumber } from "@/lib/phone"
import { isCurrentUserPhoneVerified } from "@/lib/phoneVerificationRecords"
import { supabase } from "@/lib/supabaseClient"

interface AuthScreenProps {
  onAuthSuccess?: () => void
}

type AuthView = "landing" | "login" | "signup"

const trustSignals = [
  { icon: ShieldCheck, label: "Verified profiles" },
  { icon: Crown, label: "Premium discovery" },
  { icon: Users, label: "Family-ready context" },
]

function LegalLinks({ action }: { action: "continuing" | "signing up" }) {
  return (
    <p className="mx-auto max-w-sm text-center text-xs leading-relaxed text-[#6F7C8B]">
      By {action}, you agree to our{" "}
      <Link href="/terms" className="font-bold text-[#E83262] hover:underline">
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="font-bold text-[#E83262] hover:underline">
        Privacy Policy
      </Link>
      .
    </p>
  )
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E83262] text-white shadow-[0_18px_45px_rgba(194,165,116,0.28)] sm:h-20 sm:w-20">
        <Heart className="h-8 w-8 fill-current sm:h-10 sm:w-10" />
      </div>
      <h1 className={`${compact ? "text-5xl" : "text-6xl sm:text-7xl"} font-serif font-bold tracking-[-0.07em] text-[#26364A]`}>
        Lovesathi
      </h1>
      <p className="mt-2 max-w-sm text-sm font-semibold uppercase tracking-[0.2em] text-[#E83262]">
        Premium matrimony
      </p>
    </div>
  )
}

function AuthShell({
  title,
  eyebrow,
  children,
  onBack,
}: {
  title: string
  eyebrow: string
  children: React.ReactNode
  onBack: () => void
}) {
  return (
    <div className="luxe-light-page flex min-h-screen flex-col overflow-x-hidden px-4 py-5 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Button variant="ghost" className="rounded-full text-[#26364A]" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Link href="/" className="font-serif text-2xl font-bold tracking-[-0.05em] text-[#26364A] no-underline">
          Lovesathi
        </Link>
      </div>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden space-y-8 lg:block">
          <BrandMark />
          <div className="luxe-card rounded-[2rem] p-6">
            <p className="luxe-kicker mb-3 text-[#E83262]">Built for serious intent</p>
            <p className="text-lg leading-8 text-[#6F7C8B]">
              A calm, premium entry into profile creation, verification, and life-partner discovery.
            </p>
          </div>
        </div>
        <div className="luxe-card mx-auto w-full max-w-xl rounded-[2rem] p-5 shadow-2xl sm:p-8">
          <div className="mb-8 text-center">
            <p className="luxe-kicker mb-3 text-[#E83262]">{eyebrow}</p>
            <h2 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A] sm:text-5xl">
              {title}
            </h2>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const router = useRouter()
  const [view, setView] = useState<AuthView>("landing")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  })
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setError(null)
    setShowPassword(false)
    setFormData({ name: "", email: "", phone: "", password: "" })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const email = normalizeEmail(formData.email)
      const phone = normalizePhoneNumber(formData.phone)
      const phoneError = getPhoneValidationMessage(phone)
      if (phoneError) {
        throw new Error(phoneError)
      }
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            phone,
          },
          emailRedirectTo: getEmailVerificationRedirectUrl(),
        },
      })
      if (signUpError) throw signUpError
      window.sessionStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, email)
      window.sessionStorage.setItem(PHONE_VERIFICATION_STORAGE_KEY, phone)
      router.push("/auth/verify-email")
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePostLogin = async (userId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user && !user.email_confirmed_at) {
        window.sessionStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, normalizeEmail(user.email || ""))
        if (user.user_metadata?.phone || user.phone) {
          window.sessionStorage.setItem(PHONE_VERIFICATION_STORAGE_KEY, normalizePhoneNumber(String(user.user_metadata?.phone || user.phone || "")))
        }
        router.push("/auth/verify-email?reason=unconfirmed")
        return
      }

      if (user && !(await isCurrentUserPhoneVerified(user))) {
        if (user.email) window.sessionStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, normalizeEmail(user.email))
        if (user.user_metadata?.phone || user.phone) {
          window.sessionStorage.setItem(PHONE_VERIFICATION_STORAGE_KEY, normalizePhoneNumber(String(user.user_metadata?.phone || user.phone || "")))
        }
        router.push("/auth/verify-email?reason=phone")
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("onboarding_matrimony")
        .eq("user_id", userId)
        .single()

      if (profileError || !profile) {
        router.push("/onboarding/verification")
        return
      }

      if (profile.onboarding_matrimony !== true) {
        router.push("/onboarding/verification")
        return
      }

      onAuthSuccess?.()
      router.push("/matrimony/discovery")
    } catch (err) {
      console.error("Error checking profile:", err)
      router.push("/onboarding/verification")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const email = normalizeEmail(formData.email)
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: formData.password,
      })
      if (loginError) throw loginError

      if (data.user) {
        await handlePostLogin(data.user.id)
      } else {
        router.push("/onboarding/verification")
      }
    } catch (err: any) {
      if (isEmailNotConfirmedError(err)) {
        const email = normalizeEmail(formData.email)
        window.sessionStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, email)
        if (formData.phone) {
          window.sessionStorage.setItem(PHONE_VERIFICATION_STORAGE_KEY, normalizePhoneNumber(formData.phone))
        }
        router.push("/auth/verify-email?reason=unconfirmed")
        return
      }

      setError(err.message || "Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }

  if (view === "landing") {
    return (
      <div className="luxe-page flex min-h-screen flex-col overflow-x-hidden px-4 py-5 sm:px-6">
        <div className="luxe-orb left-[-7rem] top-20 h-72 w-72 bg-[#E83262]/18" />
        <div className="luxe-orb right-[-8rem] top-10 h-96 w-96 bg-[#E83262]/30" style={{ animationDelay: "1.2s" }} />
        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-white/10 bg-white/8 px-4 py-3 text-[#ffffff] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3 text-[#ffffff] no-underline">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffffff] text-[#E83262]">
              <Heart className="h-5 w-5 fill-current" />
            </span>
            <span className="font-serif text-2xl font-bold tracking-[-0.05em]">Lovesathi</span>
          </Link>
          <Button asChild variant="ghost" className="text-[#ffffff] hover:bg-white/10 hover:text-[#ffffff]">
            <Link href="/">Home</Link>
          </Button>
        </header>

        <main className="relative z-10 mx-auto grid w-[calc(100vw-2rem)] min-w-0 max-w-6xl flex-1 items-center gap-10 overflow-hidden py-10 sm:w-full lg:grid-cols-[1.08fr_0.92fr]">
          <section className="w-full min-w-0 max-w-full space-y-8 overflow-hidden text-[#ffffff]">
            <div className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-[#E83262]/30 bg-white/8 px-4 py-2 backdrop-blur">
              <Sparkles className="h-4 w-4 text-[#E83262]" />
              <span className="luxe-kicker max-w-full truncate text-[#E83262] sm:whitespace-normal">A private entrance to serious matrimony</span>
            </div>
            <div className="space-y-5">
              <h1 className="luxe-title max-w-[22rem] text-4xl font-bold text-[#ffffff] sm:max-w-3xl sm:text-7xl lg:text-8xl">
                <span className="block">Find a match</span>
                <span className="block">with depth,</span>
                <span className="block">dignity, and taste.</span>
              </h1>
              <p className="max-w-[22rem] text-base leading-7 text-[#E83262] sm:max-w-2xl sm:text-lg sm:leading-8">
                Lovesathi brings a luxury standard to matrimony: verified identity, rich profiles,
                family context, and calm discovery for people ready to choose seriously.
              </p>
            </div>
            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              {trustSignals.map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                  <item.icon className="mb-4 h-5 w-5 text-[#E83262]" />
                  <p className="text-sm font-bold text-[#ffffff]">{item.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="luxe-card mx-auto w-full max-w-md rounded-[2rem] p-5 sm:p-7">
            <div className="mb-8">
              <BrandMark compact />
              <p className="mx-auto mt-4 max-w-xs text-center text-[#6F7C8B]">
                Where meaningful life-partner discovery begins.
              </p>
            </div>

            <div className="space-y-3">
              <GoogleLoginButton />
              <AppleLoginButton />
              <Button
                variant="outline"
                size="lg"
                className="luxe-outline-button w-full rounded-2xl font-bold"
                onClick={() => {
                  resetForm()
                  setView("signup")
                }}
              >
                Continue with Email
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-[#6F7C8B]">
              <span>Already have an account?</span>
              <Button
                variant="link"
                className="h-auto p-0 font-bold text-[#E83262]"
                onClick={() => {
                  resetForm()
                  setView("login")
                }}
              >
                Log In
              </Button>
            </div>

            <div className="mt-6">
              <LegalLinks action="continuing" />
            </div>
          </section>
        </main>
      </div>
    )
  }

  if (view === "login") {
    return (
      <AuthShell
        title="Welcome back"
        eyebrow="Member access"
        onBack={() => {
          resetForm()
          setView("landing")
        }}
      >
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="you@email.com"
              required
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              autoComplete="email"
              className="h-12 rounded-2xl border-[#482b1a]/20 bg-[#ffffff]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                required
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                autoComplete="current-password"
                className="h-12 rounded-2xl border-[#482b1a]/20 bg-[#ffffff] pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-10 rounded-xl px-3 text-[#6F7C8B] hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button asChild variant="link" className="h-auto px-0 text-sm font-bold text-[#E83262]">
              <Link href="/auth/forgot-password">Forgot password?</Link>
            </Button>
          </div>

          {error && (
            <div className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3">
              <p className="text-center text-sm font-bold text-[#E83262]">{error}</p>
            </div>
          )}

          <Button type="submit" className="luxe-button h-12 w-full rounded-2xl font-bold" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <div className="my-7 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#482b1a]/12" />
          <span className="luxe-kicker text-[#6F7C8B]">or</span>
          <div className="h-px flex-1 bg-[#482b1a]/12" />
        </div>

        <div className="space-y-3">
          <GoogleLoginButton variant="login" />
          <AppleLoginButton variant="login" />
        </div>

        <p className="mt-7 text-center text-sm text-[#6F7C8B]">
          New to Lovesathi?{" "}
          <Button
            variant="link"
            className="h-auto p-0 font-bold text-[#E83262]"
            onClick={() => {
              resetForm()
              setView("signup")
            }}
          >
            Create account
          </Button>
        </p>
      </AuthShell>
    )
  }

  if (view === "signup") {
    return (
      <AuthShell
        title="Create your profile"
        eyebrow="Begin intentionally"
        onBack={() => {
          resetForm()
          setView("landing")
        }}
      >
        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="signup-name">Full Name</Label>
            <Input
              id="signup-name"
              placeholder="Enter your full name"
              required
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              autoComplete="name"
              className="h-12 rounded-2xl border-[#482b1a]/20 bg-[#ffffff]"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@email.com"
                required
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                autoComplete="email"
                className="h-12 rounded-2xl border-[#482b1a]/20 bg-[#ffffff]"
              />
            </div>
            <div className="space-y-2">
              <PhoneNumberInput
                id="signup-phone"
                label="Phone Number"
                required
                value={formData.phone}
                onChange={(phone) => setFormData((prev) => ({ ...prev, phone }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a secure password"
                required
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                autoComplete="new-password"
                className="h-12 rounded-2xl border-[#482b1a]/20 bg-[#ffffff] pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-10 rounded-xl px-3 text-[#6F7C8B] hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3">
              <p className="text-center text-sm font-bold text-[#E83262]">{error}</p>
            </div>
          )}

          <Button type="submit" className="luxe-button h-12 w-full rounded-2xl font-bold" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <div className="my-7 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#482b1a]/12" />
          <span className="luxe-kicker text-[#6F7C8B]">or</span>
          <div className="h-px flex-1 bg-[#482b1a]/12" />
        </div>

        <div className="space-y-3">
          <GoogleLoginButton />
          <AppleLoginButton />
        </div>

        <p className="mt-7 text-center text-sm text-[#6F7C8B]">
          Already a member?{" "}
          <Button
            variant="link"
            className="h-auto p-0 font-bold text-[#E83262]"
            onClick={() => {
              resetForm()
              setView("login")
            }}
          >
            Log In
          </Button>
        </p>

        <div className="mt-5">
          <LegalLinks action="signing up" />
        </div>
      </AuthShell>
    )
  }

  return null
}
