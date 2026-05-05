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
      title="Privacy for meaningful, verified introductions."
      description="Lovesathi needs profile, preference, verification, and communication data to help members discover compatible life partners while protecting trust and safety."
      sections={[
        {
          title: "Information we collect",
          body: "We may collect account details, profile information, photos, partner preferences, verification submissions, device data, reports, messages, and support requests needed to operate the matrimony experience.",
        },
        {
          title: "How we use information",
          body: "We use information to create profiles, recommend matches, support verification, provide messaging, prevent abuse, process support requests, improve reliability, and maintain account safety.",
        },
        {
          title: "Visibility and sharing",
          body: "Profile details may be visible to other members according to product settings. Sensitive verification material should be used for review and trust workflows, not public display.",
        },
        {
          title: "Retention and deletion",
          body: "Members should be able to request account deletion and support review. Some records may need to be retained for safety, fraud prevention, legal, billing, or dispute purposes.",
        },
        {
          title: "Security",
          body: "Lovesathi uses technical and operational safeguards, but no online system is perfect. Members should use strong passwords and avoid sharing sensitive personal information too early.",
        },
      ]}
    />
  )
}
