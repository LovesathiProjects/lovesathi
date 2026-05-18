import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, HelpCircle, Mail, ShieldCheck, Sparkles } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Lovesathi profiles, verification, discovery, messaging, and premium plans.",
}

const faqSections = [
  {
    title: "Getting Started",
    questions: [
      {
        question: "What is Lovesathi?",
        answer:
          "Lovesathi is a serious matrimony platform built for intentional introductions. We help members create richer profiles, discover compatible matches, communicate safely, and involve family at the pace they choose.",
      },
      {
        question: "Why do I need to complete my profile?",
        answer:
          "Complete profiles help the matching experience feel serious and trustworthy. Family, education, career, culture, lifestyle, photos, and partner preferences all improve the quality of discovery.",
      },
      {
        question: "Can I edit my details later?",
        answer:
          "Yes. You can update profile photos, personal details, family context, career information, cultural details, bio, and preferences from your profile and settings areas.",
      },
    ],
  },
  {
    title: "Trust & Privacy",
    questions: [
      {
        question: "Does verification guarantee that a person is safe?",
        answer:
          "No. Verification is a trust signal, not a guarantee. Members should independently verify identity, background, family information, financial claims, and intentions before making personal decisions.",
      },
      {
        question: "Can free users see my phone number?",
        answer:
          "No. Phone numbers are masked unless a member has the right premium contact access. Lovesathi also blocks attempts to share phone numbers, emails, social handles, and other contact details inside chat for safety.",
      },
      {
        question: "Who can see my profile?",
        answer:
          "Your profile may appear in curated discovery for compatible members. Some details can be limited, masked, or premium-gated depending on account state and product rules.",
      },
    ],
  },
  {
    title: "Discovery & Matches",
    questions: [
      {
        question: "Why do I see premium profiles as a free user?",
        answer:
          "Free members can still come across premium profiles, but premium profile photos and full details may be blurred or limited. You can swipe left or right, and subscription unlocks richer access.",
      },
      {
        question: "What happens when I like someone?",
        answer:
          "A like sends interest. If both members like each other, it becomes a match and you can start a conversation within Lovesathi limits and safety rules.",
      },
      {
        question: "Why did my swipe limit stop me?",
        answer:
          "Free users can swipe 15 times in 12 hours. This keeps discovery intentional and reduces spam. Premium members get expanded or unlimited access depending on the plan.",
      },
    ],
  },
  {
    title: "Premium & Billing",
    questions: [
      {
        question: "What do premium plans unlock?",
        answer:
          "Premium plans unlock different levels of contact reveals, shortlist capacity, Super Likes, chat access, verified filters, priority support, and Heritage concierge support depending on the selected tier.",
      },
      {
        question: "What happens if renewal payment fails?",
        answer:
          "Premium access continues for a 15-day grace period while renewal reminders are shown. If payment is not completed during grace, premium access expires automatically.",
      },
      {
        question: "Is the launch discount permanent?",
        answer:
          "The current launch offer gives 90% off the Basic plan only. Essential, Signature, and Heritage use standard launch pricing. Final payment, invoice, and renewal handling depends on the connected payment provider.",
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <main className="luxe-light-page min-h-[100dvh] overflow-x-hidden px-4 py-5 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Button asChild variant="outline" className="rounded-full border-[#E83262]/28 bg-white/74 text-[#26364A]">
            <Link href="/matrimony/discovery">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Badge className="hidden border border-[#E83262]/24 bg-white/72 px-3 py-1.5 text-[#26364A] sm:inline-flex">
            Lovesathi help
          </Badge>
        </div>

        <section className="luxe-card relative overflow-hidden rounded-[2rem] border-[#E83262]/24 p-6 shadow-[0_28px_90px_rgba(24,17,13,0.1)] sm:p-8 lg:p-10">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#E83262]/16 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#E83262] text-white shadow-[0_18px_42px_rgba(194,165,116,0.2)]">
                <HelpCircle className="h-7 w-7" />
              </div>
              <p className="luxe-kicker text-[0.68rem] text-[#E83262]">frequently asked questions</p>
              <h1 className="mt-3 font-serif text-4xl font-bold leading-[0.95] tracking-[-0.06em] text-[#26364A] sm:text-5xl lg:text-6xl">
                Clear answers for serious matrimony.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#6F7C8B]">
                A concise guide to how Lovesathi handles profiles, privacy, discovery, premium access, and safe communication.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-[#E83262]/24 bg-white/62 p-4">
                  <ShieldCheck className="mb-3 h-5 w-5 text-[#E83262]" />
                  <p className="text-sm font-bold text-[#26364A]">Trust signals are not guarantees.</p>
                  <p className="mt-1 text-xs leading-5 text-[#6F7C8B]">Always verify independently before making family or financial decisions.</p>
                </div>
                <div className="rounded-2xl border border-[#E83262]/24 bg-white/62 p-4">
                  <Sparkles className="mb-3 h-5 w-5 text-[#E83262]" />
                  <p className="text-sm font-bold text-[#26364A]">Premium access is plan-based.</p>
                  <p className="mt-1 text-xs leading-5 text-[#6F7C8B]">Each tier controls contact reveals, chat access, shortlist capacity, and concierge support.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {faqSections.map((section) => (
                <div key={section.title} className="rounded-[1.5rem] border border-[#E83262]/20 bg-white/62 p-4 sm:p-5">
                  <p className="luxe-kicker mb-2 text-[0.62rem] text-[#E83262]">{section.title}</p>
                  <Accordion type="single" collapsible className="w-full">
                    {section.questions.map((item, index) => (
                      <AccordionItem key={item.question} value={`${section.title}-${index}`} className="border-[#482b1a]/10">
                        <AccordionTrigger className="text-left font-bold text-[#26364A] hover:text-[#E83262]">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm leading-6 text-[#6F7C8B]">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 rounded-[1.75rem] border border-[#E83262]/20 bg-white/58 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">Still need help?</p>
            <p className="mt-1 text-sm leading-6 text-[#6F7C8B]">Contact support if your account, profile, verification, or subscription needs a manual review.</p>
          </div>
          <Button asChild className="luxe-button rounded-full">
            <Link href="/contact">
              <Mail className="mr-2 h-4 w-4" />
              Contact Support
            </Link>
          </Button>
        </section>
      </div>
    </main>
  )
}
