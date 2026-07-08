import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BadgeCheck, HeartHandshake, MessageCircle, Sparkles, Trophy } from "lucide-react"
import { LovesathiLogo } from "@/components/brand/lovesathi-logo"
import { WhatsAppCta } from "@/components/support/whatsapp-cta"
import { Button } from "@/components/ui/button"
import { loadPublishedLovesathiSuccessStories, type LovesathiSuccessStory } from "@/lib/successStories"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Success Stories",
  description: "Published LoveSathi marriage stories and family-ready success notes.",
  alternates: {
    canonical: "/success-stories",
  },
}

function formatStoryDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date)
}

function StoryCard({ story, featured = false }: { story: LovesathiSuccessStory; featured?: boolean }) {
  const storyDate = formatStoryDate(story.weddingDate)

  return (
    <article
      className={
        featured
          ? "rounded-lg border border-[#E83262]/24 bg-[#26364A] p-6 text-white shadow-[0_30px_100px_rgba(24,17,13,0.16)] sm:p-8"
          : "rounded-lg border border-[#482b1a]/10 bg-white/84 p-6 shadow-[0_20px_60px_rgba(38,54,74,0.08)] backdrop-blur-xl"
      }
    >
      <div
        className={
          featured
            ? "mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-white/12 bg-white/10 text-[#F7C9D5]"
            : "mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-[#E83262]/18 bg-[#FFF4F7] text-[#E83262]"
        }
      >
        <HeartHandshake className="h-8 w-8" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            featured
              ? "rounded-full border border-white/16 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#F7C9D5]"
              : "rounded-full border border-[#E83262]/20 bg-[#FFF4F7] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#E83262]"
          }
        >
          Success story
        </span>
        {story.city && (
          <span
            className={
              featured
                ? "rounded-full border border-white/16 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/72"
                : "rounded-full border border-[#482b1a]/10 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#6F7C8B]"
            }
          >
            {story.city}
          </span>
        )}
      </div>
      <h2
        className={
          featured
            ? "mt-5 font-serif text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl"
            : "mt-5 font-serif text-3xl font-bold tracking-[-0.05em] text-[#26364A]"
        }
      >
        {story.coupleNames}
      </h2>
      {storyDate && (
        <p className={featured ? "mt-2 text-sm font-bold text-[#F7C9D5]" : "mt-2 text-sm font-bold text-[#E83262]"}>
          Married in {storyDate}
        </p>
      )}
      <p className={featured ? "mt-5 text-base leading-8 text-[#eadcc8]" : "mt-5 text-base leading-8 text-[#6F7C8B]"}>
        {story.story}
      </p>
    </article>
  )
}

export default async function SuccessStoriesPage() {
  const { stories, error } = await loadPublishedLovesathiSuccessStories()
  const featured = stories[0]
  const rest = stories.slice(1)

  return (
    <main className="luxe-light-page overflow-hidden">
      <section className="px-4 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-lg border border-[#482b1a]/10 bg-white/86 px-3 py-3 shadow-[0_18px_60px_rgba(24,17,13,0.08)] backdrop-blur-xl sm:px-4">
          <Link href="/" className="flex items-center gap-3 text-[#26364A] no-underline">
            <LovesathiLogo imageClassName="h-12 sm:h-14" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#6F7C8B] md:flex">
            <Link href="/events">Events</Link>
            <Link href="/success-stories">Success Stories</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <Button asChild className="luxe-button h-11 rounded-md px-5">
            <Link href="/auth">
              Join
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-20">
          <div>
            <p className="luxe-kicker mb-4 text-[#E83262]">LoveSathi stories</p>
            <h1 className="luxe-title max-w-4xl text-5xl font-bold text-[#26364A] sm:text-7xl">
              Real outcomes, handled with dignity.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6F7C8B]">
              Published stories are reviewed before they appear here, with private details kept out of public view.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="luxe-button rounded-md px-7">
                <a href="#stories">
                  Read stories
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="luxe-outline-button rounded-md px-7">
                <Link href="/events">View events</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-[#E83262]/18 bg-white p-5 shadow-[0_30px_100px_rgba(38,54,74,0.13)]">
            <div className="rounded-lg border border-[#E6EAF1] bg-[#F8FAFD] p-6">
              <Sparkles className="h-8 w-8 text-[#E83262]" />
              <h2 className="mt-6 font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A]">
                Every story is reviewed before publishing.
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {["Consent-first", "Privacy-aware", "Family-ready"].map((item) => (
                  <div key={item} className="rounded-md border border-[#E6EAF1] bg-white p-4">
                    <BadgeCheck className="mb-3 h-5 w-5 text-[#E83262]" />
                    <p className="text-sm font-black text-[#26364A]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="stories" className="px-4 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="luxe-kicker mb-3 text-[#E83262]">Published</p>
              <h2 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#26364A]">Success stories</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#482b1a]/10 bg-white/72 px-4 py-2 text-sm font-bold text-[#6F7C8B]">
              <Trophy className="h-4 w-4 text-[#E83262]" />
              {stories.length.toLocaleString("en-IN")} published
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-[#E83262]/20 bg-[#FFF4F7] p-4 text-sm font-bold text-[#8C2440]">
              Stories are temporarily unavailable. Please contact LoveSathi support for updates.
            </div>
          )}

          {featured ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <StoryCard story={featured} featured />
              {rest.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#E83262]/24 bg-white/76 p-8 text-center shadow-[0_20px_60px_rgba(38,54,74,0.08)]">
              <HeartHandshake className="mx-auto h-10 w-10 text-[#E83262]" />
              <h2 className="mt-4 font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A]">
                Stories will be published after review.
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#6F7C8B]">
                LoveSathi will show approved stories here once couples and families are comfortable sharing them.
              </p>
              <Button asChild className="luxe-button mt-5 rounded-md">
                <Link href="/auth">
                  Create your profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="luxe-kicker mb-4 text-[#E83262]">Share carefully</p>
            <h2 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#26364A]">
              Have a LoveSathi story to share?
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#6F7C8B]">
              Message the team with consent from both sides. We will keep private details out of public pages.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-[#6F7C8B]">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2">
                <MessageCircle className="h-4 w-4 text-[#E83262]" />
                WhatsApp support
              </span>
            </div>
          </div>
          <WhatsAppCta />
        </div>
      </section>
    </main>
  )
}
