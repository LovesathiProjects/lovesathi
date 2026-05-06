"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Mail, CheckCircle, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/components/ui/use-toast"

interface EmailVerificationScreenProps {
  onVerified?: () => void
}

export function EmailVerificationScreen({ onVerified }: EmailVerificationScreenProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isResending, setIsResending] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)

  // Check email verification status on mount and periodically
  useEffect(() => {
    let mounted = true
    let subscription: { unsubscribe: () => void } | null = null
    let interval: NodeJS.Timeout | null = null

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
            // This allows users who just signed up to see the verification page
            if (mounted) {
              setUserEmail(null)
              setIsLoading(false)
            }
            return
          }
          // User found via getUser, use it
          if (mounted) {
            setUserEmail(user.email || null)
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
            setUserEmail(null)
            setIsLoading(false)
          }
          return
        }

        if (mounted) {
          setUserEmail(user.email || null)
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
            setUserEmail(user.email)
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
  }, [router, onVerified, isVerified])

  const handleResendEmail = async () => {
    if (!userEmail) {
      toast({
        title: "Error",
        description: "No email address found. Please try signing in again.",
        variant: "destructive",
      })
      return
    }

    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      })

      if (error) throw error

      toast({
        title: "Email sent!",
        description: "Verification email has been sent. Please check your inbox.",
      })
    } catch (error: any) {
      console.error("Error resending email:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  const handleContinue = async () => {
    setIsChecking(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast({
          title: "Session expired",
          description: "Please sign in again to continue.",
          variant: "destructive",
        })
        setIsChecking(false)
        setTimeout(() => {
          router.push("/auth")
        }, 2000)
        return
      }

      // Check if email is verified
      if (!user.email_confirmed_at) {
        toast({
          title: "Email not verified",
          description: "Please verify your email before continuing. Check your inbox for the verification link.",
          variant: "destructive",
        })
        setIsChecking(false)
        return
      }

      // Email is verified, proceed
      setIsVerified(true)
      if (onVerified) {
        onVerified()
      } else {
        router.push("/onboarding/verification")
      }
    } catch (error: any) {
      console.error("Error checking verification:", error)
      toast({
        title: "Error",
        description: "Failed to verify email status. Please try again.",
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
            <Loader2 className="w-8 h-8 animate-spin text-[#97011A]" />
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
                <div className="rounded-full bg-[#97011A]/10 p-6">
                  <Mail className="w-16 h-16 text-[#97011A]" />
                </div>
              )}
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-black">
              {isVerified ? "Email Verified!" : "Verify Your Email"}
            </h1>
            
            <p className="text-base sm:text-lg text-black/70 leading-relaxed">
              {isVerified 
                ? "Your email has been verified successfully. Redirecting you to continue..." 
                : userEmail 
                  ? `We've sent a verification email to ${userEmail}. Please check your inbox and click the verification link.`
                  : "We've sent a verification email. Please check your inbox and click the verification link to continue."}
            </p>
          </div>

          {!isVerified && (
            <div className="space-y-4">
              <Button
                onClick={handleContinue}
                className="w-full font-semibold"
                size="lg"
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "I've Verified My Email"
                )}
              </Button>

              <Button
                onClick={handleResendEmail}
                variant="outline"
                className="w-full font-semibold"
                size="lg"
                disabled={isResending || !userEmail}
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </Button>

              <div className="text-center pt-4">
                <p className="text-sm text-black/60 leading-relaxed">
                  Didn't receive the email? Check your spam folder or click "Resend" above.
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
