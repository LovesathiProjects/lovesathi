import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react"
import { LovesathiLogo } from "@/components/brand/lovesathi-logo"
import { WhatsAppCta } from "@/components/support/whatsapp-cta"

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Lovesathi support and safety teams.",
}

export default function ContactPage() {
  return (
    <main className="luxe-light-page min-h-screen px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-10 flex items-center justify-between rounded-lg border border-[#482b1a]/10 bg-[#ffffff]/76 px-4 py-3 shadow-sm backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3 text-[#26364A] no-underline">
            <LovesathiLogo imageClassName="h-12" />
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-[#E83262]">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </nav>

        <section className="luxe-card rounded-lg p-6 sm:p-10">
          <p className="luxe-kicker mb-4 text-[#E83262]">Contact</p>
          <h1 className="font-serif text-5xl font-bold tracking-[-0.055em] text-[#26364A] sm:text-7xl">
            We are here when trust needs a human.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#6F7C8B]">
            Use these channels for support, safety reviews, account help, or launch and partnership requests.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-[#482b1a]/10 bg-[#ffffff]/78 p-6 shadow-sm backdrop-blur">
            <Mail className="mb-5 h-8 w-8 text-[#E83262]" />
            <h2 className="font-serif text-3xl font-bold tracking-[-0.04em]">Support</h2>
            <p className="mt-3 leading-8 text-[#6F7C8B]">
              For account, login, profile, billing, or product help, use{" "}
              <a href="mailto:support@lovesathi.com" className="font-bold">
                support@lovesathi.com
              </a>
              .
            </p>
          </article>
          <article className="rounded-lg border border-[#482b1a]/10 bg-[#ffffff]/78 p-6 shadow-sm backdrop-blur">
            <ShieldCheck className="mb-5 h-8 w-8 text-[#E83262]" />
            <h2 className="font-serif text-3xl font-bold tracking-[-0.04em]">Safety</h2>
            <p className="mt-3 leading-8 text-[#6F7C8B]">
              For abuse, impersonation, scams, urgent safety concerns, or verification disputes, use{" "}
              <a href="mailto:safety@lovesathi.com" className="font-bold">
                safety@lovesathi.com
              </a>
              .
            </p>
          </article>
        </section>

        <WhatsAppCta className="mt-6" />
      </div>
    </main>
  )
}
