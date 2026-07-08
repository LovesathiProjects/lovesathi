import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clock3,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Sparkles,
  Ticket,
} from "lucide-react"
import { LovesathiLogo } from "@/components/brand/lovesathi-logo"
import { WhatsAppCta } from "@/components/support/whatsapp-cta"
import { Button } from "@/components/ui/button"
import {
  formatEventDateRange,
  getEventTypeLabel,
  loadPublishedLovesathiEvents,
  type LovesathiEvent,
} from "@/lib/events"
import { EventRegistrationForm } from "@/components/events/event-registration-form"
import { WHATSAPP_CHAT_URL } from "@/lib/support"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Events",
  description: "Premium Lovesathi events, family-ready meetups, workshops, and member support sessions.",
  alternates: {
    canonical: "/events",
  },
}

function getEventCta(event: LovesathiEvent) {
  if (event.rsvpUrl) return event.rsvpUrl
  if (event.whatsappUrl) return event.whatsappUrl

  const text = encodeURIComponent(`Hi LoveSathi, I want to know more about ${event.title}.`)
  return `${WHATSAPP_CHAT_URL}?text=${text}`
}

function EventSignal({ icon: Icon, label }: { icon: typeof CalendarDays; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-[#482b1a]/10 bg-white/78 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#6F7C8B]">
      <Icon className="h-4 w-4 shrink-0 text-[#E83262]" />
      <span className="truncate">{label}</span>
    </span>
  )
}

function EventCard({ event, featured = false }: { event: LovesathiEvent; featured?: boolean }) {
  return (
    <article
      id={event.slug}
      className={
        featured
          ? "relative overflow-hidden rounded-lg border border-[#E83262]/24 bg-[#26364A] p-5 text-white shadow-[0_30px_100px_rgba(24,17,13,0.16)] sm:p-7"
          : "overflow-hidden rounded-lg border border-[#482b1a]/10 bg-white/84 p-5 shadow-[0_20px_60px_rgba(38,54,74,0.08)] backdrop-blur-xl"
      }
    >
      {event.bannerUrl && (
        <div
          className={
            featured
              ? "mb-5 overflow-hidden rounded-lg border border-white/12 bg-white/10"
              : "mb-5 overflow-hidden rounded-lg border border-[#E6EAF1] bg-[#F8FAFD]"
          }
        >
          <img src={event.bannerUrl} alt="" className="h-56 w-full object-cover" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            featured
              ? "rounded-full border border-white/16 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#F7C9D5]"
              : "rounded-full border border-[#E83262]/20 bg-[#FFF4F7] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#E83262]"
          }
        >
          {getEventTypeLabel(event.eventType)}
        </span>
        {event.isFeatured && (
          <span className="rounded-full border border-[#E83262]/24 bg-[#E83262]/16 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#F7C9D5]">
            Featured
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
        {event.title}
      </h2>
      <p className={featured ? "mt-4 text-base leading-7 text-[#eadcc8]" : "mt-4 text-base leading-7 text-[#6F7C8B]"}>
        {event.summary}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <EventSignal icon={CalendarDays} label={formatEventDateRange(event)} />
        <EventSignal icon={MapPin} label={[event.city, event.venue].filter(Boolean).join(" - ")} />
        <EventSignal icon={Ticket} label={event.capacity ? `${event.capacity.toLocaleString("en-IN")} seats` : "Limited seats"} />
      </div>

      {event.description && (
        <p className={featured ? "mt-5 text-sm leading-7 text-white/76" : "mt-5 text-sm leading-7 text-[#6F7C8B]"}>
          {event.description}
        </p>
      )}

      <div className="mt-6 space-y-3">
        <EventRegistrationForm eventId={event.id} eventTitle={event.title} featured={featured} />
        <div className="flex flex-col gap-2 sm:flex-row">
          {(event.rsvpUrl || event.whatsappUrl) && (
            <Button asChild variant="outline" className={featured ? "rounded-md border-white/20 bg-white/10 text-white hover:bg-white/15" : "rounded-md border-[#482b1a]/15 bg-white"}>
              <a href={getEventCta(event)} target="_blank" rel="noreferrer">
                {event.rsvpUrl ? "Open RSVP link" : "Ask on WhatsApp"}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          )}
          {event.whatsappUrl && event.rsvpUrl && (
          <Button asChild variant="outline" className={featured ? "rounded-md border-white/20 bg-white/10 text-white hover:bg-white/15" : "rounded-md border-[#482b1a]/15 bg-white"}>
            <a href={event.whatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>
          )}
        </div>
      </div>
    </article>
  )
}

function CalendarPreview({ event }: { event?: LovesathiEvent }) {
  const date = event ? new Date(event.startsAt) : null
  const day = date
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", timeZone: "Asia/Kolkata" }).format(date)
    : "LS"
  const month = date
    ? new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "Asia/Kolkata" }).format(date)
    : "Soon"

  return (
    <div className="relative rounded-lg border border-[#E83262]/18 bg-white p-5 shadow-[0_30px_100px_rgba(38,54,74,0.13)]">
      {event?.bannerUrl && (
        <div className="mb-4 overflow-hidden rounded-lg border border-[#E6EAF1] bg-[#F8FAFD]">
          <img src={event.bannerUrl} alt="" className="h-44 w-full object-cover" />
        </div>
      )}
      <div className="rounded-lg border border-[#E6EAF1] bg-[#F8FAFD] p-4">
        <div className="flex items-center justify-between border-b border-[#E6EAF1] pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#E83262]">Event calendar</p>
            <p className="mt-1 text-sm font-bold text-[#6F7C8B]">Asia/Kolkata</p>
          </div>
          <Sparkles className="h-6 w-6 text-[#E83262]" />
        </div>
        <div className="grid gap-4 pt-4 sm:grid-cols-[8rem_1fr]">
          <div className="rounded-lg bg-[#26364A] p-4 text-center text-white shadow-inner">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F7C9D5]">{month}</p>
            <p className="font-serif text-6xl font-bold tracking-[-0.08em] text-white">{day}</p>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/58">LoveSathi</p>
          </div>
          <div className="space-y-3">
            {[
              event?.title || "Premium member events",
              event ? formatEventDateRange(event) : "Published sessions appear here",
              event ? [event.city, event.venue].filter(Boolean).join(" - ") : "Meetups, workshops, and support circles",
            ].map((item, index) => (
              <div key={item} className="rounded-md border border-[#E6EAF1] bg-white p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#E83262]">
                  {index === 0 ? "Featured" : index === 1 ? "Time" : "Location"}
                </p>
                <p className="mt-1 text-sm font-black text-[#26364A]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function EventsPage() {
  const { events, error } = await loadPublishedLovesathiEvents()
  const now = Date.now()
  const upcoming = events.filter((event) => new Date(event.startsAt).getTime() >= now - 12 * 60 * 60 * 1000)
  const past = events.filter((event) => new Date(event.startsAt).getTime() < now - 12 * 60 * 60 * 1000)
  const featured = upcoming.find((event) => event.isFeatured) || upcoming[0] || events[0]

  return (
    <main className="luxe-light-page overflow-hidden">
      <section className="px-4 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-lg border border-[#482b1a]/10 bg-white/86 px-3 py-3 shadow-[0_18px_60px_rgba(24,17,13,0.08)] backdrop-blur-xl sm:px-4">
          <Link href="/" className="flex items-center gap-3 text-[#26364A] no-underline">
            <LovesathiLogo imageClassName="h-12 sm:h-14" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#6F7C8B] md:flex">
            <Link href="/events">Events</Link>
            <Link href="/success-stories">Stories</Link>
            <Link href="/safety">Safety</Link>
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
            <p className="luxe-kicker mb-4 text-[#E83262]">LoveSathi events</p>
            <h1 className="luxe-title max-w-4xl text-5xl font-bold text-[#26364A] sm:text-7xl">
              Premium moments for serious introductions.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6F7C8B]">
              Curated meetups, support sessions, and relationship-readiness events for members and families.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="luxe-button rounded-md px-7">
                <a href={featured ? `#${featured.slug}` : "#events"}>
                  View calendar
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="luxe-outline-button rounded-md px-7">
                <a href={WHATSAPP_CHAT_URL} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp support
                </a>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 sm:max-w-xl sm:grid-cols-3">
              {[
                ["Curated", "sessions"],
                ["Verified", "members"],
                ["Family", "ready"],
              ].map(([value, label]) => (
                <div key={value} className="rounded-lg border border-[#482b1a]/10 bg-white/78 p-4 shadow-sm backdrop-blur">
                  <p className="text-2xl font-black text-[#E83262]">{value}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6F7C8B]">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <CalendarPreview event={featured} />
        </div>
      </section>

      <section id="events" className="px-4 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="luxe-kicker mb-3 text-[#E83262]">Upcoming</p>
              <h2 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#26364A]">Published events</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#482b1a]/10 bg-white/72 px-4 py-2 text-sm font-bold text-[#6F7C8B]">
              <Clock3 className="h-4 w-4 text-[#E83262]" />
              {upcoming.length.toLocaleString("en-IN")} upcoming
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-[#E83262]/20 bg-[#FFF4F7] p-4 text-sm font-bold text-[#8C2440]">
              Events are temporarily unavailable. Please use WhatsApp support for event details.
            </div>
          )}

          {upcoming.length ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {upcoming.map((event, index) => (
                <EventCard key={event.id} event={event} featured={index === 0 && event.isFeatured} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#E83262]/24 bg-white/76 p-8 text-center shadow-[0_20px_60px_rgba(38,54,74,0.08)]">
              <HeartHandshake className="mx-auto h-10 w-10 text-[#E83262]" />
              <h2 className="mt-4 font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A]">
                New events will be announced soon.
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#6F7C8B]">
                For launch updates, profile help, or event invitations, connect with the LoveSathi team on WhatsApp.
              </p>
              <Button asChild className="luxe-button mt-5 rounded-md">
                <a href={WHATSAPP_CHAT_URL} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
              </Button>
            </div>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="px-4 py-12 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <p className="luxe-kicker mb-3 text-[#E83262]">Archive</p>
            <h2 className="mb-8 font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A]">Recent past events</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {past.slice(0, 6).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="luxe-kicker mb-4 text-[#E83262]">Concierge support</p>
            <h2 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#26364A]">
              Need help choosing an event?
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#6F7C8B]">
              Message LoveSathi for event invitations, family questions, profile setup, and launch support.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-[#6F7C8B]">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2">
                <BadgeCheck className="h-4 w-4 text-[#E83262]" />
                Verified support
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2">
                <CalendarDays className="h-4 w-4 text-[#E83262]" />
                Event guidance
              </span>
            </div>
          </div>
          <WhatsAppCta />
        </div>
      </section>
    </main>
  )
}
