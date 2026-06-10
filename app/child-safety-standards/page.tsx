import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react"

export const metadata: Metadata = {
  title: "Child Safety Standards | Lovesathi",
  description:
    "Lovesathi's public child safety standards for preventing child sexual abuse and exploitation, reporting concerns, and safety contact information.",
}

const standards = [
  {
    title: "Adults-only matrimony service",
    body: "Lovesathi is intended only for adults who are 18 years or older. Profiles that appear to belong to minors, impersonate minors, or attempt to involve minors are reviewed and may be removed.",
  },
  {
    title: "Zero tolerance for CSAE and CSAM",
    body: "We prohibit child sexual abuse and exploitation, child sexual abuse material, grooming, solicitation, trafficking, sexualized minor content, or links and instructions that facilitate abuse.",
  },
  {
    title: "In-app reporting and blocking",
    body: "Members can report profiles, conversations, photos, and suspicious behavior from inside the app. Reports are routed for safety review, and members can block accounts they do not want to interact with.",
  },
  {
    title: "Review and enforcement",
    body: "When we identify policy violations, we may remove content, suspend or delete accounts, restrict access, preserve relevant evidence where appropriate, and cooperate with lawful requests.",
  },
]

export default function ChildSafetyStandardsPage() {
  return (
    <main className="luxe-light-page min-h-screen text-[#26364A]">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#E83262]/20 bg-white/85 px-4 py-2 text-sm font-semibold text-[#26364A] shadow-sm transition hover:border-[#E83262]/45 hover:text-[#E83262]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lovesathi
          </Link>
          <span className="font-serif text-xl text-[#26364A]">Lovesathi</span>
        </header>

        <section className="luxe-card overflow-hidden rounded-[2.2rem] border border-[#E83262]/15 bg-white/90 shadow-[0_24px_80px_rgba(38,54,74,0.10)]">
          <div className="border-b border-[#E83262]/10 bg-gradient-to-br from-white via-[#FFF7F9] to-[#F6F8FB] px-6 py-10 text-center sm:px-10 sm:py-14">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FDE6EE] text-[#E83262]">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <p className="luxe-kicker text-[#E83262]">Published Safety Standards</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-[#26364A] sm:text-5xl">
              Child Safety Standards
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-[#66768A] sm:text-lg">
              Lovesathi is a serious matrimony platform for adults. We maintain these public standards to prevent
              child sexual abuse and exploitation, protect members, and provide a clear reporting path.
            </p>
          </div>

          <div className="grid gap-4 px-6 py-8 sm:px-10 lg:grid-cols-2">
            {standards.map((item) => (
              <article key={item.title} className="rounded-3xl border border-[#E83262]/10 bg-[#FFFFFF] p-6 shadow-sm">
                <h2 className="text-xl font-bold text-[#26364A]">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[#66768A]">{item.body}</p>
              </article>
            ))}
          </div>

          <section className="grid gap-5 border-t border-[#E83262]/10 bg-[#FBFCFE] px-6 py-8 sm:px-10 lg:grid-cols-2">
            <div className="rounded-3xl border border-[#E83262]/10 bg-white p-6">
              <h2 className="text-xl font-bold text-[#26364A]">How to report a concern</h2>
              <p className="mt-3 text-sm leading-7 text-[#66768A]">
                Use the in-app report and block tools on profiles or chats when you see suspicious conduct, abusive
                content, impersonation, harassment, or any child safety concern. For urgent danger, contact local
                emergency services or law enforcement first.
              </p>
            </div>

            <div className="rounded-3xl border border-[#E83262]/10 bg-white p-6">
              <h2 className="text-xl font-bold text-[#26364A]">Designated safety contact</h2>
              <p className="mt-3 text-sm leading-7 text-[#66768A]">
                Our safety team can be contacted about child safety standards, CSAE or CSAM prevention practices, and
                policy compliance.
              </p>
              <a
                href="mailto:safety@lovesathi.com"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#E83262] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_40px_rgba(232,50,98,0.22)] transition hover:bg-[#D71F51]"
              >
                <Mail className="h-4 w-4" />
                safety@lovesathi.com
              </a>
            </div>
          </section>

          <section className="border-t border-[#E83262]/10 px-6 py-8 sm:px-10">
            <h2 className="text-xl font-bold text-[#26364A]">Compliance statement</h2>
            <p className="mt-3 text-sm leading-7 text-[#66768A]">
              Lovesathi complies with applicable child safety laws and Google Play child safety standards. We do not
              permit content or behavior that exploits or endangers children. We review reports, take enforcement action
              where needed, and cooperate with valid legal requests as required by law.
            </p>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-[#95A1AF]">
              Last updated: June 10, 2026
            </p>
          </section>
        </section>
      </section>
    </main>
  )
}
