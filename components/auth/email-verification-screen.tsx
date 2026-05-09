"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, CheckCircle, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/components/ui/use-toast"
import {
  EMAIL_VERIFICATION_STORAGE_KEY,
  getEmailVerificationRedirectUrl,
  normalizeEmail,
} from "@/lib/authRedirects"

interface EmailVerificationScreenProps {
  onVerified?: () => void
}

type VerificationReason = "unconfirmed" | "expired" | null
type EmailOtpVerificationType = "email" | "signup"

const EMAIL_OTP_LENGTH = 6

function normalizeOtpCode(value: string) {
  return value.replace(/\D/g, "").slice(0, EMAIL_OTP_LENGTH)
}

export function EmailVerificationScreen({ onVerified }: EmailVerificationScreenProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isResending, setIsResending] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [emailInput, setEmailInput] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [isVerified, setIsVerified] = useState(false)
  const [verificationReason, setVerificationReason] = useState<VerificationReason>(null)

  const rememberEmail = useCallback((email: string | null | undefined) => {
    if (!email) return
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) return
    setUserEmail(normalizedEmail)
    setEmailInput(normalizedEmail)
    window.sessionStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, normalizedEmail)
  }, [])

  const getRememberedEmail = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    return normalizeEmail(
      params.get("email") || window.sessionStorage.getItem(EMAIL_VERIFICATION_STORAGE_KEY) || "",
    )
  }, [])

  const getVerificationReason = useCallback((): VerificationReason => {
    const reason = new URLSearchParams(window.location.search).get("reason")
    return reason === "unconfirmed" || reason === "expired" ? reason : null
  }, [])

  // Check email verification status on mount and periodically
  useEffect(() => {
    let mounted = true
    let subscription: { unsubscribe: () => void } | null = null
    let interval: NodeJS.Timeout | null = null
    const rememberedEmail = getRememberedEmail()
    const reason = getVerificationReason()

    if (rememberedEmail) {
      rememberEmail(rememberedEmail)
    }
    if (reason) {
      setVerificationReason(reason)
    }

    const checkEmailVerification = async (retryCount = 0) => {
      try {
        // Wait for session to be established (with retries)
        const { data: { session } } = await supabase.auth.getSession()
        
        // If no session and we haven't retried too many times, wait and retry
        if (!session && retryCount < 5) {
          setTimeout(() => {
            if (mounted) {
              checkEmailVerification(retryCount + 1)
            }
          }, 1000)
          return
        }

        // After retries, try getUser as fallback
        if (!session) {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            // No user found - stay on page, don't redirect
            // This allows users who just signed up to resend without an active session.
            if (mounted) {
              if (rememberedEmail) {
                rememberEmail(rememberedEmail)
              } else {
                setUserEmail(null)
              }
              setIsLoading(false)
            }
            return
          }
          // User found via getUser, use it
          if (mounted) {
            rememberEmail(user.email || rememberedEmail)
            setIsLoading(false)
            if (user.email_confirmed_at) {
              setIsVerified(true)
              setTimeout(() => {
                if (mounted) {
                  if (onVerified) {
                    onVerified()
                  } else {
                    router.push("/onboarding/verification")
                  }
                }
              }, 1500)
            }
          }
          return
        }

        const user = session.user
        
        if (!user) {
          // No user in session - stay on page
          if (mounted) {
            if (rememberedEmail) {
              rememberEmail(rememberedEmail)
            } else {
              setUserEmail(null)
            }
            setIsLoading(false)
          }
          return
        }

        if (mounted) {
          rememberEmail(user.email || rememberedEmail)
          setIsLoading(false)
          
          // Check if email is already verified
          if (user.email_confirmed_at) {
            setIsVerified(true)
            // Auto-proceed after a short delay
            setTimeout(() => {
              if (mounted) {
                if (onVerified) {
                  onVerified()
                } else {
                  router.push("/onboarding/verification")
                }
              }
            }, 1500)
            return
          }
        }

        // Set up auth state listener to detect when email is verified
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (mounted && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
            if (newSession?.user?.email_confirmed_at) {
              setIsVerified(true)
              setTimeout(() => {
                if (mounted) {
                  if (onVerified) {
                    onVerified()
                  } else {
                    router.push("/onboarding/verification")
                  }
                }
              }, 1500)
            }
          }
        })
        subscription = authSubscription
      } catch (error) {
        console.error("Error checking email verification:", error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkEmailVerification()

    // Poll for email verification every 3 seconds
    interval = setInterval(async () => {
      if (mounted && !isVerified) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user?.email_confirmed_at) {
            rememberEmail(user.email)
            setIsVerified(true)
            setTimeout(() => {
              if (mounted) {
                if (onVerified) {
                  onVerified()
                } else {
                  router.push("/onboarding/verification")
                }
              }
            }, 1500)
          } else if (user?.email) {
            // Update email if we got it
            rememberEmail(user.email)
          }
        } catch (error) {
          console.error("Error polling verification:", error)
        }
      }
    }, 3000)

    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [router, onVerified, isVerified, getRememberedEmail, getVerificationReason, rememberEmail])

  const handleResendEmail = async () => {
    const email = normalizeEmail(userEmail || emailInput)

    if (!email) {
      toast({
        title: "Email required",
        description: "Enter the email you used to create your Lovesathi account.",
        variant: "destructive",
      })
      return
    }

    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: getEmailVerificationRedirectUrl(),
        },
      })

      if (error) throw error
      rememberEmail(email)

      toast({
        title: "Verification code sent",
        description: "A fresh Lovesathi email verification code has been sent to your inbox.",
      })
    } catch (error: any) {
      console.error("Error resending email:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to resend the verification code. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

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

      if (!error) {
        return data
      }

      lastError = error
    }

    throw lastError || new Error("Unable to verify this code.")
  }

  const handleVerifyCode = async () => {
    const email = normalizeEmail(userEmail || emailInput)
    const token = normalizeOtpCode(otpCode)

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
        title: "Enter the 6-digit code",
        description: "Please enter the complete verification code from your email.",
        variant: "destructive",
      })
      return
    }

    setIsChecking(true)
    try {
      const data = await verifyEmailOtp(email, token)
      rememberEmail(data.user?.email || email)
      window.sessionStorage.removeItem(EMAIL_VERIFICATION_STORAGE_KEY)
      setIsVerified(true)
      toast({
        title: "Email verified",
        description: "Your email has been confirmed. Redirecting you now.",
      })
      setTimeout(() => {
        if (onVerified) {
          onVerified()
        } else {
          router.push("/onboarding/verification")
        }
      }, 800)
    } catch (error: any) {
      console.error("Error verifying email code:", error)
      toast({
        title: "Could not verify code",
        description: error.message || "This code is invalid or expired. Please request a fresh code.",
        variant: "destructive",
      })
    } finally {
      setIsChecking(false)
    }
  }

  // Show loading state while checking for user
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md mx-auto">
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#C2A574]" />
            <p className="text-black/70 text-sm font-medium">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center px-4 py-6 border-b border-black/10">
        <h2 className="text-lg font-bold text-black">Email Verification</h2>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-6">
              {isVerified ? (
                <div className="rounded-full bg-green-500/10 p-6">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
              ) : (
                <div className="rounded-full bg-[#C2A574]/10 p-6">
                  <Mail className="w-16 h-16 text-[#C2A574]" />
                </div>
              )}
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-black">
              {isVerified
                ? "Email Verified!"
                : verificationReason === "expired"
                  ? "Verification Code Expired"
                  : "Enter Your Verification Code"}
            </h1>
            
            <p className="text-base sm:text-lg text-black/70 leading-relaxed">
              {isVerified
                ? "Your email has been verified successfully. Redirecting you to continue..."
                : verificationReason === "expired"
                  ? "That verification code is expired or no longer valid. Send yourself a fresh Lovesathi code below."
                  : verificationReason === "unconfirmed"
                    ? "Your account exists, but the email is not confirmed yet. Send yourself a fresh verification code below."
                    : emailInput
                      ? `We've sent a 6-digit verification code to ${emailInput}. Enter it below to continue.`
                      : "We've sent a 6-digit verification code. Enter it below to continue."}
            </p>
          </div>

          {!isVerified && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-email">Email address</Label>
                <Input
                  id="verification-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    const nextEmail = e.target.value
                    setEmailInput(nextEmail)
                    setUserEmail(normalizeEmail(nextEmail) || null)
                  }}
                  placeholder="you@email.com"
                  autoComplete="email"
                  className="h-12 rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={otpCode}
                  onChange={(e) => setOtpCode(normalizeOtpCode(e.target.value))}
                  placeholder="Enter 6-digit code"
                  autoComplete="one-time-code"
                  className="h-14 rounded-2xl text-center text-2xl font-semibold tracking-[0.35em]"
                  maxLength={EMAIL_OTP_LENGTH}
                />
              </div>

              <Button
                onClick={handleVerifyCode}
                className="w-full font-semibold"
                size="lg"
                disabled={isChecking || !normalizeEmail(userEmail || emailInput) || otpCode.length !== EMAIL_OTP_LENGTH}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email Code"
                )}
              </Button>

              <Button
                onClick={handleResendEmail}
                variant="outline"
                className="w-full font-semibold"
                size="lg"
                disabled={isResending || !normalizeEmail(userEmail || emailInput)}
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Resend Verification Code
                  </>
                )}
              </Button>

              <div className="text-center pt-4">
                <p className="text-sm text-black/60 leading-relaxed">
                  Didn't receive the code? Check your spam folder or click "Resend" above.
                </p>
              </div>
            </div>
          )}

          {isVerified && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
