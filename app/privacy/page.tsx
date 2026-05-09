import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Lovesathi handles profile, verification, communication, and safety data.",
}

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="Privacy for serious matrimonial introductions."
      description="Lovesathi collects and uses information to operate a matchmaker-style matrimony service, protect members, support verification, enforce safety rules, and provide paid discovery features."
      sections={[
        {
          title: "Information we collect",
          body: "We may collect account details, phone number, email, profile information, photos, date of birth, gender, family details, education, profession, income range, cultural details, partner preferences, location preferences, verification submissions, device data, payment status, reports, messages, and support requests.",
        },
        {
          title: "How we use information",
          body: "We use information to create and display profiles, recommend matches, power filters, support verification, provide messaging, show premium access, reveal contacts only through allowed flows, prevent fraud, detect unsafe chat behavior, process support requests, improve reliability, and protect the Lovesathi community.",
        },
        {
          title: "Profile visibility",
          body: "Your profile details, photos, preferences, city, community, education, profession, and selected family information may be visible to other members as part of the matrimony service. Some details may be masked, blurred, limited, or premium-gated. Verification documents are intended for trust and review workflows and are not meant for public display.",
        },
        {
          title: "Messages, safety, and abuse prevention",
          body: "Messages may be processed to deliver chat, enforce limits, block phone-number sharing, investigate reports, and prevent fraud or abuse. We may preserve reports, moderation records, audit logs, and limited message context when needed for safety, legal compliance, dispute handling, or platform integrity.",
        },
        {
          title: "Service providers and legal requests",
          body: "We may use trusted service providers for hosting, authentication, database, storage, email, analytics, payments, support, and security. We may disclose information when required by law, court order, lawful authority, fraud prevention, safety review, or to protect Lovesathi, members, and the public.",
        },
        {
          title: "Payments and subscriptions",
          body: "Payment processors or app stores may collect payment information directly. Lovesathi may store subscription status, plan type, contact reveal usage, Super Like usage, shortlist usage, support entitlement, and transaction references needed to provide paid features and resolve billing issues.",
        },
        {
          title: "Retention and deletion",
          body: "You may request account deletion from inside Lovesathi settings or through the public account deletion page. Some information may be retained where necessary for legal obligations, fraud prevention, safety investigations, billing, tax, audit, backup, dispute resolution, or enforcement of these policies.",
        },
        {
          title: "Your responsibility",
          body: "Members should avoid sharing sensitive personal, financial, identity, or family information too early. Lovesathi gives tools to support safer introductions, but members remain responsible for what they choose to share with other members or families.",
        },
        {
          title: "Security",
          body: "We use technical and operational safeguards designed to protect member data, but no online service can be guaranteed completely secure. Use strong passwords, keep devices secure, and report suspicious activity quickly.",
        },
      ]}
    />
  )
}
