"use client"

import type React from "react"
import { ArrowLeft, HeartHandshake, HelpCircle, PhoneCall, ShieldCheck, Sparkles, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"

export type MatrimonyInfoScreenId =
  | "partner-preferences"
  | "astrology"
  | "phonebook"
  | "safety-centre"
  | "help-support"
  | "success-stories"

const screenContent: Record<
  MatrimonyInfoScreenId,
  {
    eyebrow: string
    title: string
    subtitle: string
    icon: React.ElementType
    sections: Array<{ title: string; body: string }>
    cta?: string
  }
> = {
  "partner-preferences": {
    eyebrow: "Search Settings",
    title: "Partner Preferences",
    subtitle: "A clear, matrimony-style summary of the person and family context you are looking for.",
    icon: HeartHandshake,
    sections: [
      { title: "Core Preferences", body: "Age, height, marital status, religion, community, mother tongue, location, education, profession, and income filters are managed from onboarding and discovery filters." },
      { title: "Family Context", body: "Family type, lifestyle, diet, and cultural preferences are used as soft compatibility signals instead of blocking every profile too aggressively." },
      { title: "Next Upgrade", body: "We will connect this page to a full editable preference form so members can tune matches after onboarding." },
    ],
    cta: "Edit preferences from filters",
  },
  astrology: {
    eyebrow: "Horoscope",
    title: "Astrology Services",
    subtitle: "Optional horoscope and birth-detail support for families who consider it important.",
    icon: Sparkles,
    sections: [
      { title: "Birth Details", body: "Members can add birth country, state, city, time of birth, star or raashi, and gotra in their profile." },
      { title: "Compatibility", body: "Astrology matching is kept optional so every family can decide how much weight it should carry." },
      { title: "Assisted Review", body: "Premium concierge can help collect and compare horoscope details when both sides are comfortable." },
    ],
  },
  phonebook: {
    eyebrow: "Contacts",
    title: "Phonebook",
    subtitle: "A safe place for revealed contact numbers and premium contact usage.",
    icon: PhoneCall,
    sections: [
      { title: "Masked by Default", body: "Phone numbers remain masked for free users and can only be revealed through eligible paid plans." },
      { title: "Contact Limits", body: "Each plan has its own contact reveal allowance, and chat still blocks phone-number sharing for safety." },
      { title: "Coming Next", body: "Revealed contacts will be listed here with date, profile, and remaining allowance." },
    ],
  },
  "safety-centre": {
    eyebrow: "Trust",
    title: "Safety Centre",
    subtitle: "Verification, reporting, privacy, and careful communication guidance for serious matrimony.",
    icon: ShieldCheck,
    sections: [
      { title: "Verify First", body: "Members are encouraged to complete identity and phone verification before deeper communication." },
      { title: "Stay on Platform", body: "Avoid sharing phone numbers, payment requests, private documents, or sensitive details too early." },
      { title: "Report Quickly", body: "Report suspicious profiles, harassment, impersonation, pressure tactics, or requests for money." },
    ],
  },
  "help-support": {
    eyebrow: "Support",
    title: "Help & Support",
    subtitle: "Support for profile setup, OTP, verification, billing, reports, and account access.",
    icon: HelpCircle,
    sections: [
      { title: "Account Help", body: "Get help with signup, email verification, phone OTP, password reset, or login access." },
      { title: "Profile Help", body: "Ask for help with profile photos, bio, partner preferences, or incomplete onboarding steps." },
      { title: "Priority Support", body: "Signature members get first-priority support, and Heritage members receive concierge assistance." },
    ],
  },
  "success-stories": {
    eyebrow: "Stories",
    title: "Success Stories",
    subtitle: "A place to highlight real introductions and families who found compatibility through Lovesathi.",
    icon: Trophy,
    sections: [
      { title: "Member Stories", body: "Approved testimonials can be shown here with consent from both families." },
      { title: "Verified Outcomes", body: "Stories should avoid sensitive private details and focus on trust, compatibility, and respectful introductions." },
      { title: "Launch State", body: "This page is ready for content once the first approved Lovesathi stories are collected." },
    ],
  },
}

export function MatrimonyInfoScreen({ screen, onBack }: { screen: MatrimonyInfoScreenId; onBack: () => void }) {
  const content = screenContent[screen]
  const Icon = content.icon

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white text-[#26364A]">
      <header className="shrink-0 border-b border-[#E6EAF1] bg-white px-4 pt-[calc(0.85rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 pb-5">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E1E6EE] bg-white text-[#26364A] shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#E83262]">{content.eyebrow}</p>
            <h1 className="truncate text-2xl font-black tracking-[-0.03em] text-[#26364A]">{content.title}</h1>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <section className="mx-auto max-w-3xl rounded-[1.35rem] border border-[#E6EAF1] bg-white p-6 shadow-[0_12px_34px_rgba(31,44,60,0.07)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF0F5] text-[#E83262]">
            <Icon className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-[#26364A]">{content.title}</h2>
          <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-[#6F7C8B]">{content.subtitle}</p>

          <div className="mt-7 divide-y divide-[#EEF1F6]">
            {content.sections.map((section) => (
              <article key={section.title} className="py-5 first:pt-0 last:pb-0">
                <h3 className="text-lg font-black text-[#26364A]">{section.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#6F7C8B]">{section.body}</p>
              </article>
            ))}
          </div>

          {content.cta && (
            <Button type="button" onClick={onBack} className="mt-7 rounded-xl bg-[#E83262] px-6 font-black text-white hover:bg-[#C3264E]">
              {content.cta}
            </Button>
          )}
        </section>
      </main>
    </div>
  )
}
