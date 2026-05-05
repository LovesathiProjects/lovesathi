"use client"

import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export const dynamic = "force-dynamic"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<"request" | "verify" | "reset">("request")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", ""])
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const otpInputs = useRef<(HTMLInputElement | null)[]>([])

  const normalizedEmail = email.trim().toLowerCase()

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail }),
    })

    const data = await res.json()
    setIsLoading(false)

    if (!res.ok) return toast.error(data.error)

    toast.success("OTP sent to your email")
    setStep("verify")
    setTimeout(() => otpInputs.current[0]?.focus(), 200)
  }

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/[^\d]/g, "").slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    if (digit && index < 3) {
      const nextInput = otpInputs.current[index + 1]
      nextInput?.focus()
      nextInput?.select()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace") return
    e.preventDefault()

    const newOtp = [...otp]
    if (otp[index]) {
      newOtp[index] = ""
      setOtp(newOtp)
      return
    }

    if (index > 0) {
      const previousInput = otpInputs.current[index - 1]
      previousInput?.focus()
      previousInput?.select()
      newOtp[index - 1] = ""
      setOtp(newOtp)
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasteData = e.clipboardData.getData("text").trim()

    if (/^\d{4}$/.test(pasteData)) {
      setOtp(pasteData.split("").slice(0, 4))
      otpInputs.current[3]?.focus()
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, otp: otp.join("") }),
    })

    const data = await res.json()
    setIsLoading(false)

    if (!res.ok) return toast.error(data.error)

    toast.success("OTP verified")
    setStep("reset")
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      return toast.error("Passwords do not match")
    }

    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters")
    }

    setIsLoading(true)

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, password }),
    })

    const data = await res.json()
    setIsLoading(false)

    if (!res.ok) return toast.error(data.error || "Password reset failed")

    toast.success("Password reset successful. Redirecting to login...", {
      duration: 2000,
    })

    setTimeout(() => {
      router.replace("/auth")
    }, 1500)
  }

  const title = step === "request" ? "Forgot password" : step === "verify" ? "Verify OTP" : "Reset password"
  const subtitle =
    step === "request"
      ? "Enter your email to receive a secure OTP."
      : step === "verify"
        ? "Enter the 4-digit OTP sent to your email."
        : "Set a new password for your Lovesathi account."

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
            <p className="luxe-kicker text-[#8f001c]">Account recovery</p>
            <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#18110d] sm:text-5xl">{title}</h1>
            <p className="text-base text-[#6c5a4a]">{subtitle}</p>
          </div>

          {step === "request" && (
            <form onSubmit={handleSendCode} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="h-12 rounded-2xl border-[#482b1a]/20 bg-[#fffaf2]"
                />
              </div>

              <Button className="luxe-button h-12 w-full rounded-2xl font-bold" type="submit" size="lg" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send OTP"}
              </Button>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Enter OTP</Label>
                <div className="mb-2 flex justify-center gap-2">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        if (el) otpInputs.current[i] = el
                      }}
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      onFocus={(e) => e.target.select()}
                      className="h-14 w-14 rounded-2xl border border-[#482b1a]/20 bg-[#fffaf2] text-center text-xl font-bold text-[#18110d] focus:outline-none focus:ring-2 focus:ring-[#b9904d]"
                      inputMode="numeric"
                      pattern="[0-9]"
                      type="text"
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>

              <Button className="luxe-button h-12 w-full rounded-2xl font-bold" size="lg" disabled={otp.some((d) => !d) || isLoading}>
                {isLoading ? "Verifying..." : "Verify OTP"}
              </Button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleReset} className="space-y-4 pt-4">
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
                    className="h-12 rounded-2xl border-[#482b1a]/20 bg-[#fffaf2] pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-10 rounded-xl px-3 text-[#6c5a4a] hover:bg-transparent"
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
                    className="h-12 rounded-2xl border-[#482b1a]/20 bg-[#fffaf2] pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-10 rounded-xl px-3 text-[#6c5a4a] hover:bg-transparent"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button className="luxe-button h-12 w-full rounded-2xl font-bold" size="lg" disabled={isLoading}>
                {isLoading ? "Updating..." : "Reset Password"}
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
