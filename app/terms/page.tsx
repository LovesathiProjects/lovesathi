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
      title="Terms for a protected matrimony introduction service."
      description="Lovesathi is a digital matchmaking and introduction platform. We help members discover potential life partners, but members and families remain responsible for verification, decisions, meetings, communication, and marriage outcomes."
      sections={[
        {
          title: "Eligibility",
          body: "You may use Lovesathi only if you are legally competent to enter a binding agreement and legally eligible to seek a matrimonial alliance under the laws that apply to you. The service is for lawful, serious matrimony only and must not be used for casual dating, escorting, commercial solicitation, spam, harassment, or any unlawful purpose.",
        },
        {
          title: "Member and family responsibility",
          body: "Every member is solely responsible for the truth, accuracy, and legality of profile details, photos, education, profession, income, family information, relationship status, contact details, preferences, and documents submitted. Families or representatives who create or manage a profile confirm that they have clear consent from the person represented.",
        },
        {
          title: "Lovesathi is only a matchmaker",
          body: "Lovesathi provides technology, discovery, communication, verification workflows, premium tools, and concierge-style assistance where applicable. We do not guarantee compatibility, acceptance, response, engagement, marriage, background accuracy, family approval, visa status, financial status, character, health, or any outcome between members. All online and offline interactions happen at the members' own risk.",
        },
        {
          title: "Independent due diligence",
          body: "Before sharing personal information, meeting, making commitments, exchanging gifts, transferring money, or proceeding toward engagement or marriage, members must conduct their own due diligence. This may include identity checks, family discussions, references, legal checks, financial checks, health discussions, and in-person safety precautions. Lovesathi is not responsible for decisions made by members or their families.",
        },
        {
          title: "Prohibited conduct",
          body: "You must not impersonate another person, upload stolen or synthetic photos, misrepresent age or marital status, ask for money, share abusive content, pressure members, bypass contact-safety systems, scrape member data, advertise competing services, or use Lovesathi for fraud, trafficking, extortion, blackmail, discrimination, or unlawful activity. We may remove content, restrict features, suspend accounts, or cooperate with lawful authorities when required.",
        },
        {
          title: "Verification limits",
          body: "Badges, ID checks, profile review, premium status, or concierge assistance are trust signals, not guarantees. Verification can reduce risk but cannot confirm every fact about a member's life, intentions, family, finances, background, or future conduct. Members must continue to use caution and judgment.",
        },
        {
          title: "Paid plans, discounts, and refunds",
          body: "Paid features may include contact reveals, shortlist limits, Super Likes, advanced filters, priority support, concierge assistance, or other premium capabilities. Pricing, offers, discounts, plan benefits, renewal rules, taxes, cancellations, and refunds may change and may depend on the payment provider, app store, or applicable law. Unless required by law or explicitly stated in writing, fees paid for digital matrimony services are non-refundable once benefits are activated.",
        },
        {
          title: "No liability for member interactions",
          body: "Lovesathi is not liable for disputes, emotional distress, rejection, mismatches, broken engagements, failed marriages, family disagreements, fraud by members, offline meetings, travel, gifts, payments, dowry-related demands, harassment, or any loss caused by another member or third party. Members agree not to hold Lovesathi responsible for any act, omission, representation, or promise made by another user.",
        },
        {
          title: "Limitation of liability and indemnity",
          body: "To the maximum extent permitted by law, Lovesathi and its team will not be liable for indirect, incidental, special, consequential, punitive, emotional, reputational, financial, or relationship-related damages. You agree to defend and indemnify Lovesathi from claims arising from your profile, conduct, messages, meetings, violations of these terms, misuse of the platform, or disputes with other members.",
        },
        {
          title: "Account action and service changes",
          body: "We may review, restrict, suspend, delete, or refuse any profile or account at our discretion when safety, law, fraud prevention, product quality, or community trust requires it. Features may be modified, paused, priced differently, or discontinued as Lovesathi evolves.",
        },
        {
          title: "Governing law and support",
          body: "These terms should be interpreted under applicable Indian law unless a different mandatory law applies. Members should report abuse, fraud, impersonation, or safety concerns through Lovesathi support so the team can review and take reasonable platform-level action.",
        },
      ]}
    />
  )
}
