import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Lovesathi premium matrimony services.",
}

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of Service"
      title="Terms for a respectful matrimony experience."
      description="These terms define the expected use of Lovesathi, including account responsibility, respectful behavior, safety expectations, and service boundaries."
      sections={[
        {
          title: "Eligibility",
          body: "You must be legally eligible to use matrimony services and provide accurate information about yourself. Lovesathi is intended for serious life-partner discovery, not casual dating, spam, impersonation, or commercial solicitation.",
        },
        {
          title: "Account responsibility",
          body: "You are responsible for the accuracy of your profile, the security of your account, and all activity under your login. Do not share misleading identity, family, education, profession, relationship status, or verification information.",
        },
        {
          title: "Community conduct",
          body: "Members must communicate respectfully and must not harass, threaten, abuse, scam, or pressure other members. Lovesathi may restrict, suspend, or remove accounts that harm trust or safety.",
        },
        {
          title: "Paid features",
          body: "Premium plans, contact visibility, boosts, advanced filters, and other paid capabilities may be added or changed over time. Final pricing, refunds, and cancellation rules should match the payment provider and local law.",
        },
        {
          title: "Service changes",
          body: "Features may evolve as Lovesathi improves. We may modify, pause, or discontinue features when needed for safety, compliance, reliability, or product quality.",
        },
      ]}
    />
  )
}
