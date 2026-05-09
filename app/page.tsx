import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  Crown,
  Heart,
  Lock,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const pillars = [
  {
    icon: ShieldCheck,
    title: "Verified first",
    description: "Identity, profile, and safety signals sit at the center of every serious introduction.",
  },
  {
    icon: Search,
    title: "Deep preferences",
    description: "Browse with matrimony-ready filters for family, culture, lifestyle, education, career, and values.",
  },
  {
    icon: MessageCircle,
    title: "Intentional conversations",
    description: "Move from interest to respectful conversation with privacy and control built into the flow.",
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

export default function Home() {
  return (
    <main className="luxe-light-page overflow-hidden">
      <section className="relative isolate min-h-screen px-4 py-6 sm:px-8 lg:px-12">
        <div className="luxe-orb left-[-8rem] top-24 h-80 w-80 bg-[#C2A574]/20" />
        <div className="luxe-orb right-[-10rem] top-8 h-96 w-96 bg-[#C2A574]/16" style={{ animationDelay: "1.4s" }} />
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-full border border-[#482b1a]/10 bg-[#ffffff]/72 px-3 py-3 shadow-[0_18px_60px_rgba(24,17,13,0.08)] backdrop-blur-xl sm:px-4">
          <Link href="/" className="flex items-center gap-3 text-[#3A2B24] no-underline">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C2A574] text-[#3A2B24] shadow-lg">
              <Heart className="h-5 w-5 fill-current" />
            </span>
            <span className="font-serif text-2xl font-bold tracking-[-0.04em]">Lovesathi</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#8B7B70] md:flex">
            <a href="#experience">Experience</a>
            <a href="#trust">Trust</a>
            <a href="#membership">Membership</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" className="hidden text-[#3A2B24] sm:inline-flex">
              <Link href="/auth">Sign in</Link>
            </Button>
            <Button asChild className="luxe-button hidden h-11 w-11 shrink-0 rounded-full p-0 sm:inline-flex sm:w-auto sm:px-5">
              <Link href="/auth">
                <span className="hidden sm:inline">Begin</span>
                <span className="sr-only sm:hidden">Join</span>
                <ArrowRight className="h-4 w-4 sm:ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-7xl min-w-0 items-center gap-12 overflow-hidden py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
          <div className="w-full min-w-0 max-w-full space-y-8 overflow-hidden">
            <div className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-[#C2A574]/30 bg-[#ffffff]/70 px-4 py-2 text-[#8B7B70] shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-[#C2A574]" />
              <span className="luxe-kicker max-w-full text-[0.62rem] leading-5 sm:text-[0.72rem]">Premium matrimony for serious families</span>
            </div>
            <div className="space-y-5">
              <h1 className="luxe-title max-w-[22rem] text-4xl font-bold text-[#3A2B24] sm:max-w-4xl sm:text-7xl lg:text-8xl">
                <span className="block">A richer way</span>
                <span className="block">to find your</span>
                <span className="block">life partner.</span>
              </h1>
              <p className="max-w-[22rem] text-base leading-7 text-[#8B7B70] sm:max-w-2xl sm:text-xl sm:leading-8">
                Lovesathi is being shaped as a refined matrimony experience where trust, privacy,
                family context, and meaningful compatibility come before noise.
              </p>
            </div>
            <div className="flex max-w-[22rem] flex-col gap-3 sm:max-w-none sm:flex-row">
              <Button asChild size="lg" className="luxe-button w-full rounded-full px-7 sm:w-auto">
                <Link href="/auth">
                  Create your profile
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="luxe-outline-button w-full rounded-full px-7 sm:w-auto">
                <Link href="#experience">Explore the experience</Link>
              </Button>
            </div>
            <div className="grid max-w-[22rem] grid-cols-1 gap-3 pt-3 sm:max-w-xl sm:grid-cols-3">
              {[
                ["Verified", "profiles"],
                ["Private", "by design"],
                ["Family", "ready"],
              ].map(([value, label]) => (
                <div key={value} className="rounded-3xl border border-[#482b1a]/10 bg-[#ffffff]/62 p-4 shadow-sm backdrop-blur">
                  <p className="font-serif text-2xl font-bold text-[#C2A574]">{value}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7B70]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -left-8 top-12 h-24 w-24 rounded-full border border-[#C2A574]/30 bg-[#ffffff]/72 shadow-xl backdrop-blur" />
            <div className="absolute -right-4 bottom-20 h-32 w-32 rounded-full bg-[#C2A574]/12 blur-sm" />
            <div className="luxe-card relative rounded-[2.5rem] p-4">
              <div className="overflow-hidden rounded-[2rem] bg-[#3A2B24] text-[#ffffff] shadow-2xl">
                <div className="relative h-[34rem]">
                  <img
                    src="/professional-woman-smiling.png"
                    alt="Premium matrimony profile preview"
                    className="h-full w-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#3A2B24] via-[#3A2B24]/24 to-transparent" />
                  <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
                    <span className="rounded-full border border-white/20 bg-white/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur">
                      Curated match
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ffffff] text-[#C2A574] shadow-xl">
                      <Crown className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 space-y-5 p-6">
                    <div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#ffffff]/16 px-3 py-1 text-xs font-semibold backdrop-blur">Verified</span>
                        <span className="rounded-full bg-[#ffffff]/16 px-3 py-1 text-xs font-semibold backdrop-blur">Family ready</span>
                      </div>
                      <h2 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#ffffff]">Compatibility with grace</h2>
                      <p className="mt-3 text-sm leading-6 text-[#C2A574]">
                        Profiles that feel calm, premium, and complete, with the context matrimony actually needs.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/14 bg-white/10 p-4 backdrop-blur">
                        <Star className="mb-2 h-4 w-4 text-[#C2A574]" />
                        <p className="text-sm font-semibold">Shortlist</p>
                      </div>
                      <div className="rounded-2xl border border-white/14 bg-white/10 p-4 backdrop-blur">
                        <Lock className="mb-2 h-4 w-4 text-[#C2A574]" />
                        <p className="text-sm font-semibold">Privacy</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="experience" className="px-4 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="luxe-kicker mb-3 text-[#C2A574]">The Lovesathi standard</p>
            <h2 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#3A2B24] sm:text-6xl">
              Designed for intention, not endless scrolling.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="luxe-card rounded-[2rem] p-7">
                <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C2A574] text-[#3A2B24] shadow-lg">
                  <pillar.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 font-serif text-3xl font-bold tracking-[-0.04em]">{pillar.title}</h3>
                <p className="leading-7 text-[#8B7B70]">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="px-4 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2.5rem] bg-[#3A2B24] p-6 text-[#ffffff] shadow-2xl sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-14">
          <div>
            <p className="luxe-kicker mb-4 text-[#C2A574]">Trust and privacy</p>
            <h2 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#ffffff]">
              Matrimony needs dignity at every step.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {details.map((detail) => (
              <div key={detail} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                <BadgeCheck className="h-5 w-5 text-[#C2A574]" />
                <span className="font-semibold">{detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="membership" className="px-4 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#C2A574] text-[#3A2B24] shadow-xl">
            <Users className="h-7 w-7" />
          </div>
          <p className="luxe-kicker mb-4 text-[#C2A574]">Ready when you are</p>
          <h2 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#3A2B24] sm:text-6xl">
            Start with a profile that feels worthy of your future.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#8B7B70]">
            Create your account, complete verification, add your family and partner preferences,
            then discover matches with a calmer, premium experience.
          </p>
          <Button asChild size="lg" className="luxe-button mt-8 rounded-full px-8">
            <Link href="/auth">
              Join Lovesathi
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-[#482b1a]/10 px-4 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[#8B7B70] sm:flex-row sm:items-center sm:justify-between">
          <p>(c) {new Date().getFullYear()} Lovesathi. Premium matrimony for serious connections.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/safety">Safety</Link>
            <Link href="/account-deletion">Account deletion</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
