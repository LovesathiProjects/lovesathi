"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Loader2, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhoneNumberInput } from "@/components/ui/phone-number-input"
import { useToast } from "@/components/ui/use-toast"
import {
  EMAIL_VERIFICATION_STORAGE_KEY,
  PHONE_VERIFICATION_STORAGE_KEY,
  getEmailVerificationRedirectUrl,
  normalizeEmail,
} from "@/lib/authRedirects"
import {
  getAuthUserPhone,
  getPhoneValidationMessage,
  normalizePhoneNumber,
} from "@/lib/phone"
import { isCurrentUserPhoneVerified } from "@/lib/phoneVerificationRecords"
import {
  PHONE_OTP_LENGTH,
  normalizePhoneOtpCode,
  requestCurrentUserPhoneOtp,
  resendCurrentUserPhoneOtp,
  verifyCurrentUserPhoneOtp,
} from "@/lib/phoneOtp"
import { supabase } from "@/lib/supabaseClient"

interface EmailVerificationScreenProps {
  onVerified?: () => void
}

type VerificationReason = "unconfirmed" | "expired" | "phone" | null
type EmailOtpVerificationType = "email" | "signup"
type VerificationStage = "loading" | "email" | "phone" | "done"

const EMAIL_OTP_LENGTH = 6

function normalizeOtpCode(value: string) {
  return value.replace(/\D/g, "").slice(0, EMAIL_OTP_LENGTH)
}

export function EmailVerificationScreen({ onVerified }: EmailVerificationScreenProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [stage, setStage] = useState<VerificationStage>("loading")
  const [verificationReason, setVerificationReason] = useState<VerificationReason>(null)
  const [emailInput, setEmailInput] = useState("")
  const [emailOtpCode, setEmailOtpCode] = useState("")
  const [phoneInput, setPhoneInput] = useState("")
  const [phoneOtpCode, setPhoneOtpCode] = useState("")
  const [phoneOtpSent, setPhoneOtpSent] = useState(false)
  const [phoneOtpTarget, setPhoneOtpTarget] = useState("")
  const [isEmailBusy, setIsEmailBusy] = useState(false)
  const [isPhoneBusy, setIsPhoneBusy] = useState(false)
  const [isPhoneSending, setIsPhoneSending] = useState(false)

  const normalizedPhone = useMemo(() => normalizePhoneNumber(phoneInput), [phoneInput])
  const phoneError = useMemo(() => getPhoneValidationMessage(normalizedPhone), [normalizedPhone])

  const rememberEmail = useCallback((email: string | null | undefined) => {
    const normalized = normalizeEmail(email || "")
    if (!normalized) return
    setEmailInput(normalized)
    window.sessionStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, normalized)
  }, [])

  const rememberPhone = useCallback((phone: string | null | undefined) => {
    const normalized = normalizePhoneNumber(phone || "")
    if (!normalized) return
    setPhoneInput(normalized)
    window.sessionStorage.setItem(PHONE_VERIFICATION_STORAGE_KEY, normalized)
  }, [])

  const clearPendingVerification = useCallback(() => {
    window.sessionStorage.removeItem(EMAIL_VERIFICATION_STORAGE_KEY)
    window.sessionStorage.removeItem(PHONE_VERIFICATION_STORAGE_KEY)
  }, [])

  const continueToOnboarding = useCallback(() => {
    clearPendingVerification()
    setStage("done")
    setTimeout(() => {
      if (onVerified) {
        onVerified()
      } else {
        router.push("/onboarding/verification")
      }
    }, 650)
  }, [clearPendingVerification, onVerified, router])

  const loadVerificationState = useCallback(async () => {
    const params = new URLSearchParams(window.location.search)
    const reason = params.get("reason")
    setVerificationReason(reason === "unconfirmed" || reason === "expired" || reason === "phone" ? reason : null)

    const rememberedEmail = normalizeEmail(
      params.get("email") || window.sessionStorage.getItem(EMAIL_VERIFICATION_STORAGE_KEY) || "",
    )
    const rememberedPhone = normalizePhoneNumber(
      params.get("phone") || window.sessionStorage.getItem(PHONE_VERIFICATION_STORAGE_KEY) || "",
    )

    if (rememberedEmail) rememberEmail(rememberedEmail)
    if (rememberedPhone) rememberPhone(rememberedPhone)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setStage("email")
      return
    }

    if (user.email) rememberEmail(user.email)
    rememberPhone(getAuthUserPhone(user) || rememberedPhone)

    if (!user.email_confirmed_at) {
      setStage("email")
      return
    }

    if (!(await isCurrentUserPhoneVerified(user))) {
      setStage("phone")
      return
    }

    continueToOnboarding()
  }, [continueToOnboarding, rememberEmail, rememberPhone])

  useEffect(() => {
    void loadVerificationState()
  }, [loadVerificationState])

  const verifyEmailOtp = async (email: string, token: string) => {
    const verificationTypes: EmailOtpVerificationType[] = ["email", "signup"]
    let lastError: any = null

    for (const type of verificationTypes) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type,
        options: {
          redirectTo: getEmailVerificationRedirectUrl(),
        },
      })

      if (!error) return data
      lastError = error
    }

    throw lastError || new Error("Unable to verify this code.")
  }

  const handleResendEmail = async () => {
    const email = normalizeEmail(emailInput)
    if (!email) {
      toast({
        title: "Email required",
        description: "Enter the email you used to create your Lovesathi account.",
        variant: "destructive",
      })
      return
    }

    setIsEmailBusy(true)
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: getEmailVerificationRedirectUrl(),
        },
      })

      if (error) throw error
      rememberEmail(email)
      toast({
        title: "Email code sent",
        description: "A fresh Lovesathi email verification code has been sent.",
      })
    } catch (error: any) {
      toast({
        title: "Could not resend email code",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEmailBusy(false)
    }
  }

  const handleVerifyEmailCode = async () => {
    const email = normalizeEmail(emailInput)
    const token = normalizeOtpCode(emailOtpCode)

    if (!email) {
      toast({
        title: "Email required",
        description: "Enter the email you used to create your Lovesathi account.",
        variant: "destructive",
      })
      return
    }

    if (token.length !== EMAIL_OTP_LENGTH) {
      toast({
        title: "Enter the email code",
        description: "Please enter the complete 6-digit code from your email.",
        variant: "destructive",
      })
      return
    }

    setIsEmailBusy(true)
    try {
      const data = await verifyEmailOtp(email, token)
      rememberEmail(data.user?.email || email)
      rememberPhone(getAuthUserPhone(data.user) || phoneInput)
      toast({
        title: "Email verified",
        description: "Now verify your phone number once before profile setup.",
      })
      setStage("phone")
    } catch (error: any) {
      toast({
        title: "Could not verify email code",
        description: error.message || "This code is invalid or expired.",
        variant: "destructive",
      })
    } finally {
      setIsEmailBusy(false)
    }
  }

  const handleSendPhoneOtp = async (resend = false) => {
    if (phoneError) {
      toast({
        title: "Check phone number",
        description: phoneError,
        variant: "destructive",
      })
      return
    }

    setIsPhoneSending(true)
    try {
      const result = resend
        ? await resendCurrentUserPhoneOtp(normalizedPhone)
        : await requestCurrentUserPhoneOtp(normalizedPhone)

      if ("alreadyVerified" in result && result.alreadyVerified) {
        rememberPhone(result.phone)
        setPhoneOtpTarget("")
        continueToOnboarding()
        return
      }

      rememberPhone(result.phone)
      setPhoneOtpTarget(result.phone)
      setPhoneOtpSent(true)
      setPhoneOtpCode("")
      toast({
        title: resend ? "Phone code resent" : "Phone code sent",
        description: `We sent a 6-digit OTP to ${result.phone}.`,
      })
    } catch (error: any) {
      toast({
        title: "Could not send phone OTP",
        description: error.message || "Please check Supabase SMS settings and try again.",
        variant: "destructive",
      })
    } finally {
      setIsPhoneSending(false)
    }
  }

  const handleVerifyPhoneCode = async () => {
    const token = normalizePhoneOtpCode(phoneOtpCode)
    const phoneForVerification = normalizePhoneNumber(phoneOtpTarget || normalizedPhone)
    const phoneVerificationError = getPhoneValidationMessage(phoneForVerification)
    if (phoneVerificationError) {
      toast({
        title: "Check phone number",
        description: phoneVerificationError,
        variant: "destructive",
      })
      return
    }

    if (token.length !== PHONE_OTP_LENGTH) {
      toast({
        title: "Enter the phone code",
        description: "Please enter the complete 6-digit code from your phone.",
        variant: "destructive",
      })
      return
    }

    setIsPhoneBusy(true)
    try {
      const result = await verifyCurrentUserPhoneOtp(phoneForVerification, token)
      rememberPhone(result.phone)
      setPhoneOtpTarget("")
      toast({
        title: "Phone verified",
        description: "Your account is ready. Continuing to profile setup.",
      })
      continueToOnboarding()
    } catch (error: any) {
      toast({
        title: "Could not verify phone code",
        description: error.message || "This code is invalid or expired.",
        variant: "destructive",
      })
    } finally {
      setIsPhoneBusy(false)
    }
  }

  if (stage === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#C2A574]" />
          <p className="text-sm font-medium text-black/70">Preparing verification...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex items-center justify-center border-b border-black/10 px-4 py-6">
        <h2 className="text-lg font-bold text-black">Account Verification</h2>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              {stage === "done" ? (
                <div className="rounded-full bg-green-500/10 p-6">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
              ) : (
                <div className="rounded-full bg-[#C2A574]/10 p-6">
                  {stage === "phone" ? (
                    <Phone className="h-16 w-16 text-[#C2A574]" />
                  ) : (
                    <Mail className="h-16 w-16 text-[#C2A574]" />
                  )}
                </div>
              )}
            </div>

            <h1 className="text-2xl font-bold text-black sm:text-3xl">
              {stage === "done"
                ? "Verified"
                : stage === "phone"
                  ? "Verify Your Phone"
                  : verificationReason === "expired"
                    ? "Verification Code Expired"
                    : "Verify Your Email"}
            </h1>

            <p className="text-base leading-relaxed text-black/70 sm:text-lg">
              {stage === "done"
                ? "Redirecting you to continue..."
                : stage === "phone"
                  ? "We verify phone once for trust and contact safety. You will not be asked again during onboarding."
                  : verificationReason === "unconfirmed"
                    ? "Your account exists, but email is not confirmed yet. Enter the 6-digit code from your email."
                    : "Enter the 6-digit code sent to your email. Phone verification comes next."}
            </p>
          </div>

          {stage === "email" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-email">Email address</Label>
                <Input
                  id="verification-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => rememberEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  className="h-12 rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-code">Email code</Label>
                <Input
                  id="email-code"
                  type="text"
                  inputMode="numeric"
                  value={emailOtpCode}
                  onChange={(e) => setEmailOtpCode(normalizeOtpCode(e.target.value))}
                  placeholder="Enter 6-digit code"
                  autoComplete="one-time-code"
                  className="h-14 rounded-2xl text-center text-2xl font-semibold tracking-[0.35em]"
                  maxLength={EMAIL_OTP_LENGTH}
                />
              </div>

              <Button
                onClick={handleVerifyEmailCode}
                className="w-full font-semibold"
                size="lg"
                disabled={isEmailBusy || !normalizeEmail(emailInput) || emailOtpCode.length !== EMAIL_OTP_LENGTH}
              >
                {isEmailBusy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Verify Email Code
              </Button>

              <Button
                onClick={handleResendEmail}
                variant="outline"
                className="w-full font-semibold"
                size="lg"
                disabled={isEmailBusy || !normalizeEmail(emailInput)}
              >
                {isEmailBusy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mail className="mr-2 h-5 w-5" />}
                Resend Email Code
              </Button>
            </div>
          )}

          {stage === "phone" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <PhoneNumberInput
                  id="verification-phone"
                  label="Phone number"
                  value={phoneInput}
                  onChange={(phone) => {
                    setPhoneInput(phone)
                    setPhoneOtpTarget("")
                    setPhoneOtpSent(false)
                    setPhoneOtpCode("")
                  }}
                  onBlur={() => rememberPhone(phoneInput)}
                />
              </div>

              <Button
                onClick={() => handleSendPhoneOtp(phoneOtpSent)}
                variant="outline"
                className="w-full font-semibold"
                size="lg"
                disabled={isPhoneSending || Boolean(phoneError)}
              >
                {isPhoneSending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Phone className="mr-2 h-5 w-5" />}
                {phoneOtpSent ? "Resend Phone Code" : "Send Phone Code"}
              </Button>

              {phoneOtpSent && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone-code">Phone code</Label>
                    <Input
                      id="phone-code"
                      type="text"
                      inputMode="numeric"
                      value={phoneOtpCode}
                      onChange={(e) => setPhoneOtpCode(normalizePhoneOtpCode(e.target.value))}
                      placeholder="Enter 6-digit code"
                      autoComplete="one-time-code"
                      className="h-14 rounded-2xl text-center text-2xl font-semibold tracking-[0.35em]"
                      maxLength={PHONE_OTP_LENGTH}
                    />
                  </div>

                  <Button
                    onClick={handleVerifyPhoneCode}
                    className="w-full font-semibold"
                    size="lg"
                    disabled={isPhoneBusy || phoneOtpCode.length !== PHONE_OTP_LENGTH}
                  >
                    {isPhoneBusy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    Verify Phone Code
                  </Button>
                </>
              )}
            </div>
          )}

          {stage === "done" && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
