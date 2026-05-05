import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Safety Guidelines",
  description: "Safety expectations and reporting guidance for Lovesathi members.",
}

export default function SafetyPage() {
  return (
    <LegalPage
      eyebrow="Safety Guidelines"
      title="Trust is the product."
      description="Matrimony requires care. These guidelines help members move slowly, verify thoughtfully, and report anything that feels unsafe or dishonest."
      sections={[
        {
          title: "Verify before trust",
          body: "Treat verification badges, complete profiles, family context, and consistent communication as trust signals. Do not rely on any single signal before making personal, financial, or family decisions.",
        },
        {
          title: "Protect personal information",
          body: "Avoid sharing government IDs, banking information, passwords, addresses, or private family details with someone you have not independently verified.",
        },
        {
          title: "Report suspicious behavior",
          body: "Report fake profiles, pressure, harassment, scams, payment requests, abusive messages, impersonation, or inconsistent identity claims so the team can review them.",
        },
        {
          title: "Meet carefully",
          body: "When meeting in person, choose public places, tell trusted family or friends, arrange your own transport, and pause if anything feels rushed or uncomfortable.",
        },
        {
          title: "Family involvement",
          body: "Lovesathi supports serious conversations, but members should decide how and when family participates. Consent and respect should guide every introduction.",
        },
      ]}
    />
  )
}
