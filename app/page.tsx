import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Crown,
  HeartHandshake,
  MessageCircle,
  ScanLine,
  Search,
  ShieldCheck,
} from "lucide-react"
import { LovesathiLogo } from "@/components/brand/lovesathi-logo"
import { WhatsAppCta } from "@/components/support/whatsapp-cta"
import { Button } from "@/components/ui/button"

const pillars = [
  {
    icon: ShieldCheck,
    title: "Verified first",
    description: "Identity, profile, and safety signals stay visible throughout every serious introduction.",
  },
  {
    icon: Search,
    title: "Preference led",
    description: "Family, culture, lifestyle, education, career, and values sit beside modern discovery controls.",
  },
  {
    icon: MessageCircle,
    title: "Respectful chat",
    description: "Conversations stay privacy-aware, contact-safe, and ready for real intent instead of casual noise.",
  },
]

const details = [
  "Family-aware profiles",
  "Shortlist and revisit",
  "Private photo controls",
  "Premium discovery filters",
  "Report and block safety",
  "Verification status",
]

const profileRows = [
  ["AS", "Verified match", "MBA, Bengaluru", "92%"],
  ["RM", "Family ready", "Engineer, Pune", "88%"],
  ["KP", "Premium profile", "Doctor, Mumbai", "95%"],
]

function ProfileToken({ initials }: { initials: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E83262]/20 bg-[linear-gradient(145deg,#FFF4F7,#FFFFFF)] text-sm font-black text-[#E83262]">
      {initials}
    </span>
  )
}

function ProductPreview() {
  return (
    <div className="rounded-lg border border-[#E83262]/18 bg-white p-4 shadow-[0_28px_90px_rgba(38,54,74,0.12)] sm:p-5">
      <div className="rounded-lg border border-[#E6EAF1] bg-[#F8FAFD] p-4">
        <div className="flex items-center justify-between gap-3 border-b border-[#E6EAF1] pb-4">
          <LovesathiLogo imageClassName="h-12" />
          <span className="rounded-full border border-[#E83262]/18 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#E83262]">
            Premium
          </span>
        </div>

        <div className="grid gap-4 pt-4 lg:grid-cols-[1fr_9rem]">
          <div className="space-y-3">
            <div className="rounded-lg border border-[#E6EAF1] bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#E83262]">Discovery</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-[#26364A]">
                    Find verified matches
                  </h2>
                </div>
                <Crown className="h-6 w-6 text-[#C99A2E]" />
              </div>
              <div className="mt-4 space-y-2">
                {profileRows.map(([initials, title, subtitle, score]) => (
                  <div key={initials} className="flex items-center gap-3 rounded-md border border-[#EEF1F6] bg-[#FBFCFE] p-3">
                    <ProfileToken initials={initials} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-[#26364A]">{title}</p>
                      <p className="truncate text-xs font-bold text-[#6F7C8B]">{subtitle}</p>
                    </div>
                    <span className="rounded-full bg-[#FFF4F7] px-2 py-1 text-xs font-black text-[#E83262]">{score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {["Discovery", "Activity", "Chat"].map((label) => (
                <div key={label} className="rounded-lg border border-[#E6EAF1] bg-white p-3 text-center">
                  <p className="text-sm font-black text-[#26364A]">{label}</p>
                  <p className="mt-1 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-[#6F7C8B]">Active</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#E6EAF1] bg-white p-3 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-md border border-[#E6EAF1] bg-white p-1.5">
              <img src="/whatsapp-chat-qr.svg" alt="LoveSathi WhatsApp QR" className="h-full w-full" />
            </div>
            <ScanLine className="mx-auto mt-3 h-4 w-4 text-[#E83262]" />
            <p className="mt-2 text-xs font-black text-[#26364A]">Chat on WhatsApp</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="luxe-light-page overflow-hidden">
      <section className="relative isolate min-h-screen px-4 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-lg border border-[#482b1a]/10 bg-white/86 px-3 py-3 shadow-[0_18px_60px_rgba(24,17,13,0.08)] backdrop-blur-xl sm:px-4">
          <Link href="/" className="flex items-center gap-3 text-[#26364A] no-underline">
            <LovesathiLogo imageClassName="h-12 sm:h-14" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#6F7C8B] md:flex">
            <a href="#experience">Experience</a>
            <Link href="/events">Events</Link>
            <Link href="/success-stories">Stories</Link>
            <a href="#trust">Trust</a>
            <a href="#support">WhatsApp</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" className="hidden text-[#26364A] sm:inline-flex">
              <Link href="/auth">Sign in</Link>
            </Button>
            <Button asChild className="luxe-button hidden h-11 rounded-md px-5 sm:inline-flex">
              <Link href="/auth">
                Begin
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-7xl min-w-0 items-center gap-12 overflow-hidden py-14 lg:grid-cols-[0.98fr_1.02fr] lg:py-20">
          <div className="w-full min-w-0 max-w-full space-y-8 overflow-hidden">
            <div className="space-y-5">
              <h1 className="luxe-title max-w-[22rem] text-4xl font-bold text-[#26364A] sm:max-w-4xl sm:text-7xl lg:text-8xl">
                <span className="block">LoveSathi</span>
                <span className="block">premium matrimony</span>
                <span className="block">with real intent.</span>
              </h1>
              <p className="max-w-[22rem] text-base leading-7 text-[#6F7C8B] sm:max-w-2xl sm:text-xl sm:leading-8">
                A refined app for verified, family-aware life-partner discovery, built around privacy,
                compatibility, and respectful conversations.
              </p>
            </div>
            <div className="flex max-w-[22rem] flex-col gap-3 sm:max-w-none sm:flex-row">
              <Button asChild size="lg" className="luxe-button w-full rounded-md px-7 sm:w-auto">
                <Link href="/auth">
                  Create your profile
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="luxe-outline-button w-full rounded-md px-7 sm:w-auto">
                <a href="#support">Scan WhatsApp QR</a>
              </Button>
            </div>
            <div className="grid max-w-[22rem] grid-cols-1 gap-3 pt-3 sm:max-w-xl sm:grid-cols-3">
              {[
                ["Verified", "profiles"],
                ["Private", "by design"],
                ["Family", "ready"],
              ].map(([value, label]) => (
                <div key={value} className="rounded-lg border border-[#482b1a]/10 bg-white/78 p-4 shadow-sm backdrop-blur">
                  <p className="text-2xl font-black text-[#E83262]">{value}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6F7C8B]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section id="experience" className="px-4 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="luxe-kicker mb-3 text-[#E83262]">The LoveSathi standard</p>
            <h2 className="text-5xl font-black tracking-[-0.05em] text-[#26364A] sm:text-6xl">
              Designed for intention, not endless scrolling.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="luxe-card rounded-lg p-7">
                <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-md bg-[#E83262] text-white shadow-lg">
                  <pillar.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-3xl font-black tracking-[-0.04em]">{pillar.title}</h3>
                <p className="leading-7 text-[#6F7C8B]">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="px-4 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-lg bg-[#26364A] p-6 text-white shadow-2xl sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-14">
          <div>
            <p className="luxe-kicker mb-4 text-[#F7C9D5]">Trust and privacy</p>
            <h2 className="text-5xl font-black tracking-[-0.05em] text-white">
              Matrimony needs dignity at every step.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {details.map((detail) => (
              <div key={detail} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/8 p-4 backdrop-blur">
                <BadgeCheck className="h-5 w-5 text-[#F7C9D5]" />
                <span className="font-semibold">{detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="events" className="px-4 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 rounded-lg border border-[#E83262]/18 bg-white/82 p-6 shadow-[0_24px_90px_rgba(38,54,74,0.10)] backdrop-blur-xl lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:p-10">
          <div>
            <p className="luxe-kicker mb-4 text-[#E83262]">Member events</p>
            <h2 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#26364A] sm:text-6xl">
              Curated sessions for serious introductions.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6F7C8B]">
              Explore LoveSathi meetups, workshops, and concierge support sessions as they are published.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="luxe-button rounded-md px-7">
                <Link href="/events">
                  View events
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="luxe-outline-button rounded-md px-7">
                <Link href="/success-stories">Read stories</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Meetups", "Family-aware introductions"],
              ["Workshops", "Profile and readiness help"],
              ["Support", "WhatsApp concierge access"],
            ].map(([title, body]) => (
              <div key={title} className="rounded-lg border border-[#482b1a]/10 bg-[#F8FAFD] p-5">
                <CalendarDays className="mb-5 h-6 w-6 text-[#E83262]" />
                <h3 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">{title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#6F7C8B]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="support" className="px-4 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div>
            <p className="luxe-kicker mb-4 text-[#E83262]">Direct support</p>
            <h2 className="text-5xl font-black tracking-[-0.05em] text-[#26364A] sm:text-6xl">
              Scan, chat, and get help from LoveSathi.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6F7C8B]">
              Use WhatsApp for profile help, verification questions, safety reports, or launch support.
            </p>
          </div>
          <WhatsAppCta />
        </div>
      </section>

      <section id="membership" className="px-4 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-md bg-[#E83262] text-white shadow-xl">
            <HeartHandshake className="h-7 w-7" />
          </div>
          <p className="luxe-kicker mb-4 text-[#E83262]">Ready when you are</p>
          <h2 className="text-5xl font-black tracking-[-0.05em] text-[#26364A] sm:text-6xl">
            Start with a profile that feels worthy of your future.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#6F7C8B]">
            Create your account, complete verification when ready, add family and partner preferences,
            then discover matches through a calmer premium experience.
          </p>
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="luxe-button rounded-md px-8">
              <Link href="/auth">
                Join LoveSathi
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-md">
              <Link href="/contact">Contact support</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#482b1a]/10 px-4 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[#6F7C8B] sm:flex-row sm:items-center sm:justify-between">
          <p>(c) {new Date().getFullYear()} LoveSathi. Premium matrimony for serious connections.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/safety">Safety</Link>
            <Link href="/events">Events</Link>
            <Link href="/child-safety-standards">Child safety standards</Link>
            <Link href="/account-deletion">Account deletion</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
