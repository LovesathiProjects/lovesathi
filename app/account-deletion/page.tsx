import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Account Deletion",
  description: "How Lovesathi members can delete their account and request deletion support.",
}

export default function AccountDeletionPage() {
  return (
    <LegalPage
      eyebrow="Account deletion"
      title="Delete your Lovesathi account with clarity."
      description="Members can delete their Lovesathi account from inside the app, or contact support if they cannot access their account."
      sections={[
        {
          title: "Delete from inside Lovesathi",
          body: "Sign in to Lovesathi, open Profile, go to Settings, choose Account and privacy, then select Delete account. You will be asked to confirm before the deletion request is processed.",
        },
        {
          title: "If you cannot sign in",
          body: "Email support@lovesathi.com from the email address used on your account and include the subject Account deletion request. The support team may ask for reasonable verification before processing the request.",
        },
        {
          title: "What deletion includes",
          body: "Deletion is intended to remove or disable your account access, profile, profile photos, discovery visibility, and active member-facing data where technically and legally possible.",
        },
        {
          title: "What may be retained",
          body: "Some records may be retained where required for safety, fraud prevention, legal obligations, billing, tax, audit logs, abuse reports, dispute handling, backups, or enforcement of Lovesathi policies.",
        },
        {
          title: "Processing time",
          body: "In-app deletion begins immediately when available. Manual support requests are reviewed as soon as reasonably possible, and Lovesathi may confirm completion or ask for more information if needed.",
        },
      ]}
    />
  )
}
