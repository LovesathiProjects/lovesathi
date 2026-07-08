"use client"

import React, { useState } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Step1WelcomeIdentity } from "@/components/matrimony/steps/Step1WelcomeIdentity"
import { Step2PersonalPhysical } from "@/components/matrimony/steps/Step2PersonalPhysical"
import { Step3CareerEducation } from "@/components/matrimony/steps/Step3CareerEducation"
import { Step4Family } from "@/components/matrimony/steps/Step4Family"
import { Step5CulturalAstro } from "@/components/matrimony/steps/Step5CulturalAstro"
import { Step6Bio } from "@/components/matrimony/steps/Step6Bio"
import { Step7PartnerPreferences } from "@/components/matrimony/steps/Step7PartnerPreferences"
import { MatrimonySetupProvider } from "@/components/matrimony/store"
import { supabase } from "@/lib/supabaseClient"
import { completeOnboarding } from "@/lib/pathService"

const stepTitles = [
  "Profile Setup & Basic Details",
  "About You",
  "Your Career & Education",
  "Family Information",
  "Your Cultural Details",
  "A Few Words About You",
  "Partner Preferences",
]

export function MatrimonySetup() {
  const [step, setStep] = useState(0)
  const router = useRouter()

  const onExit = () => {
    if (confirm("Exit setup? Your progress is saved as draft.")) {
      toast.message("You can return to complete your matrimony setup later.")
      router.push("/")
    }
  }

  return (
    <div className="luxe-light-page relative flex min-h-screen flex-col overflow-hidden">
      {/* Header with exit button and progress */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E83262]/18 bg-white/90 px-4 py-4 shadow-[0_16px_60px_rgba(24,17,13,0.08)] backdrop-blur-xl sm:px-6">
        <button
          onClick={onExit}
          className="-ml-2 rounded-full border border-[#482b1a]/10 bg-white/70 p-2 text-[#26364A] transition-colors hover:border-[#E83262]/30 hover:bg-white"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="flex max-w-[56vw] items-center gap-2 overflow-hidden">
          {stepTitles.map((_, index) => (
            <div
              key={index}
              className={`h-2 shrink-0 rounded-full transition-all ${
                index === step
                  ? "w-9 bg-[#E83262]"
                  : index < step
                  ? "w-3 bg-[#E83262]"
                  : "w-2 bg-[#482b1a]/18"
              }`}
            />
          ))}
        </div>
        <div className="flex min-w-12 flex-col items-end">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#E83262]">{step + 1}/7</span>
          <span className="hidden max-w-40 truncate text-xs font-semibold text-[#6F7C8B] sm:block">{stepTitles[step]}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 gap-8 px-3 py-5 sm:px-6 sm:py-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-8 lg:py-12">
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-5">
            <div className="luxe-dark-card rounded-[2rem] p-7 text-[#ffffff]">
              <p className="luxe-kicker mb-4 text-[#E83262]">profile atelier</p>
              <h1 className="font-serif text-5xl font-bold leading-[0.92] tracking-[-0.055em] text-[#ffffff]">
                Build a profile worthy of a serious introduction.
              </h1>
              <p className="mt-5 text-sm leading-7 text-[#E83262]">
                We collect family, culture, career, and preference signals so discovery can feel calm,
                intentional, and premium.
              </p>
            </div>
            <div className="rounded-[2rem] border border-[#482b1a]/10 bg-[#ffffff]/76 p-4 shadow-[0_20px_70px_rgba(24,17,13,0.08)] backdrop-blur">
              {stepTitles.map((title, index) => (
                <div
                  key={title}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold ${
                    index === step ? "bg-[#E83262] text-white" : index < step ? "text-[#E83262]" : "text-[#6F7C8B]"
                  }`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                    index === step ? "bg-[#ffffff] text-[#E83262]" : "bg-[#E83262] text-white"
                  }`}>
                    {index + 1}
                  </span>
                  {title}
                </div>
              ))}
            </div>
          </div>
        </aside>
        <main className="w-full min-w-0">
          <div className="luxe-card overflow-hidden rounded-[1.75rem] p-5 sm:rounded-[2rem] sm:p-9">
        <MatrimonySetupProvider>
          {step === 0 && (
            <Step1WelcomeIdentity onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <Step2PersonalPhysical onNext={() => setStep(2)} onBack={() => setStep(0)} />
          )}
          {step === 2 && (
            <Step3CareerEducation onNext={() => setStep(3)} onBack={() => setStep(1)} />
          )}
          {step === 3 && (
            <Step4Family onNext={() => setStep(4)} onBack={() => setStep(2)} />
          )}
          {step === 4 && (
            <Step5CulturalAstro onNext={() => setStep(5)} onBack={() => setStep(3)} />
          )}
          {step === 5 && (
            <Step6Bio onNext={() => setStep(6)} onBack={() => setStep(4)} />
          )}
          {step === 6 && (
            <Step7PartnerPreferences onNext={async () => {
              try {
                // Mark onboarding as completed
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                  const result = await completeOnboarding(user.id)
                  if (!result.success) {
                    throw new Error(result.error || "Please complete all required profile details.")
                  }
                }
                toast.success("Matrimony setup complete")
                router.push("/matrimony/discovery")
              } catch (error) {
                console.error("Error completing matrimony onboarding:", error)
                toast.error("Failed to complete setup")
              }
            }} onBack={() => setStep(5)} />
          )}
        </MatrimonySetupProvider>
          </div>
        </main>
      </div>
    </div>
  )
}
