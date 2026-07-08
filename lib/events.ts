import { createClient } from "@supabase/supabase-js"

export type LovesathiEventStatus = "draft" | "published" | "archived"
export type LovesathiEventType = "meetup" | "webinar" | "workshop" | "consultation" | "community"

export type LovesathiEventRow = {
  id: string
  title: string
  slug: string
  summary: string
  description: string | null
  event_type: LovesathiEventType
  city: string
  venue: string | null
  starts_at: string
  ends_at: string | null
  timezone: string
  rsvp_url: string | null
  whatsapp_url: string | null
  banner_url: string | null
  capacity: number | null
  is_featured: boolean
  status: LovesathiEventStatus
  published_at: string | null
  created_at: string
  updated_at: string
}

export type LovesathiEvent = {
  id: string
  title: string
  slug: string
  summary: string
  description: string
  eventType: LovesathiEventType
  city: string
  venue: string | null
  startsAt: string
  endsAt: string | null
  timezone: string
  rsvpUrl: string | null
  whatsappUrl: string | null
  bannerUrl: string | null
  capacity: number | null
  isFeatured: boolean
  status: LovesathiEventStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export const LOVESATHI_EVENT_SELECT =
  "id,title,slug,summary,description,event_type,city,venue,starts_at,ends_at,timezone,rsvp_url,whatsapp_url,banner_url,capacity,is_featured,status,published_at,created_at,updated_at"

export const LOVESATHI_EVENT_TYPES: LovesathiEventType[] = [
  "meetup",
  "webinar",
  "workshop",
  "consultation",
  "community",
]

export const LOVESATHI_EVENT_STATUSES: LovesathiEventStatus[] = ["draft", "published", "archived"]

export function mapLovesathiEvent(row: LovesathiEventRow): LovesathiEvent {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    description: row.description || "",
    eventType: row.event_type,
    city: row.city,
    venue: row.venue,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone || "Asia/Kolkata",
    rsvpUrl: row.rsvp_url,
    whatsappUrl: row.whatsapp_url,
    bannerUrl: row.banner_url,
    capacity: row.capacity,
    isFeatured: Boolean(row.is_featured),
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createEventSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "lovesathi-event"
}

export function getEventTypeLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function formatEventDateRange(event: Pick<LovesathiEvent, "startsAt" | "endsAt">) {
  const startsAt = new Date(event.startsAt)
  const endsAt = event.endsAt ? new Date(event.endsAt) : null
  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  })
  const timeFormatter = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  })
  const dateLabel = dateFormatter.format(startsAt)
  const timeLabel = endsAt
    ? `${timeFormatter.format(startsAt)} - ${timeFormatter.format(endsAt)}`
    : timeFormatter.format(startsAt)

  return `${dateLabel} at ${timeLabel}`
}

export async function loadPublishedLovesathiEvents(limit = 24) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      events: [] as LovesathiEvent[],
      error: "Supabase public configuration is missing.",
    }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data, error } = await supabase
    .from("lovesathi_events")
    .select(LOVESATHI_EVENT_SELECT)
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("starts_at", { ascending: true })
    .limit(limit)

  if (error) {
    return {
      events: [] as LovesathiEvent[],
      error: error.message,
    }
  }

  return {
    events: ((data || []) as LovesathiEventRow[]).map(mapLovesathiEvent),
    error: null,
  }
}
