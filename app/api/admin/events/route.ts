import { NextResponse } from "next/server"
import { writeAdminAuditLog } from "@/lib/adminAudit"
import { requireAdmin } from "@/lib/adminAuth"
import {
  createEventSlug,
  LOVESATHI_EVENT_SELECT,
  LOVESATHI_EVENT_STATUSES,
  LOVESATHI_EVENT_TYPES,
  mapLovesathiEvent,
  type LovesathiEventRow,
  type LovesathiEventStatus,
  type LovesathiEventType,
} from "@/lib/events"
import { WHATSAPP_CHAT_URL } from "@/lib/support"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null
}

function cleanUrl(value: unknown) {
  const url = cleanText(value, 600)
  if (!url) return null

  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null
  } catch {
    return null
  }
}

function cleanDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function cleanCapacity(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const capacity = Number(value)
  return Number.isFinite(capacity) && capacity > 0 ? Math.floor(capacity) : null
}

function cleanStatus(value: unknown): LovesathiEventStatus {
  return LOVESATHI_EVENT_STATUSES.includes(value as LovesathiEventStatus)
    ? (value as LovesathiEventStatus)
    : "draft"
}

function cleanEventType(value: unknown): LovesathiEventType {
  return LOVESATHI_EVENT_TYPES.includes(value as LovesathiEventType) ? (value as LovesathiEventType) : "meetup"
}

async function getUniqueSlug(supabase: any, baseSlug: string, currentId: string | null) {
  for (let index = 0; index < 12; index += 1) {
    const slug = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`
    const { data, error } = await supabase
      .from("lovesathi_events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!data || data.id === currentId) {
      return slug
    }
  }

  return `${baseSlug}-${Date.now().toString(36)}`
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (auth.response) {
    return auth.response
  }

  const { supabase } = auth.context
  const { data, error } = await supabase
    .from("lovesathi_events")
    .select(LOVESATHI_EVENT_SELECT)
    .order("updated_at", { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    events: ((data || []) as LovesathiEventRow[]).map(mapLovesathiEvent),
  })
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (auth.response) {
    return auth.response
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const { supabase, user } = auth.context
  const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : null

  if (id && !uuidPattern.test(id)) {
    return NextResponse.json({ error: "A valid event id is required." }, { status: 400 })
  }

  const title = cleanText(body.title, 120)
  const summary = cleanText(body.summary, 240)
  const description = cleanText(body.description, 2400) || ""
  const city = cleanText(body.city, 80)
  const venue = cleanText(body.venue, 180)
  const startsAt = cleanDate(body.startsAt)
  const endsAt = cleanDate(body.endsAt)
  const capacity = cleanCapacity(body.capacity)
  const status = cleanStatus(body.status)
  const eventType = cleanEventType(body.eventType)
  const rsvpUrl = cleanUrl(body.rsvpUrl)
  const whatsappUrl = cleanUrl(body.whatsappUrl) || WHATSAPP_CHAT_URL

  if (!title || !summary || !city || !startsAt) {
    return NextResponse.json(
      { error: "Title, summary, city, and start date are required." },
      { status: 400 },
    )
  }

  if (summary.length < 20) {
    return NextResponse.json({ error: "Summary must be at least 20 characters." }, { status: 400 })
  }

  if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return NextResponse.json({ error: "End time must be after the start time." }, { status: 400 })
  }

  const rawSlug = cleanText(body.slug, 120) || title
  const slug = await getUniqueSlug(supabase, createEventSlug(rawSlug), id)
  const previousResult = id
    ? await supabase
        .from("lovesathi_events")
        .select("id,title,status,slug,published_at")
        .eq("id", id)
        .maybeSingle()
    : { data: null, error: null }

  if (previousResult.error) {
    return NextResponse.json({ error: previousResult.error.message }, { status: 400 })
  }

  const payload = {
    title,
    slug,
    summary,
    description,
    event_type: eventType,
    city,
    venue,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: cleanText(body.timezone, 60) || "Asia/Kolkata",
    rsvp_url: rsvpUrl,
    whatsapp_url: whatsappUrl,
    capacity,
    is_featured: Boolean(body.isFeatured),
    status,
    published_at: status === "published" ? previousResult.data?.published_at || new Date().toISOString() : null,
    updated_by: user.id,
  }

  const query = id
    ? supabase
        .from("lovesathi_events")
        .update(payload)
        .eq("id", id)
    : supabase
        .from("lovesathi_events")
        .insert({
          ...payload,
          created_by: user.id,
        })

  const { data, error } = await query.select(LOVESATHI_EVENT_SELECT).single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const event = mapLovesathiEvent(data as LovesathiEventRow)
  const action =
    status === "published" && previousResult.data?.status !== "published"
      ? "published"
      : id
        ? "updated"
        : "created"

  await writeAdminAuditLog(supabase, {
    actorId: user.id,
    actorEmail: user.email || null,
    resource: "event",
    recordId: event.id,
    previousStatus: previousResult.data?.status || null,
    nextStatus: action,
    notes: cleanText(body.notes, 500) || `Event ${action} from the Lovesathi admin portal.`,
    metadata: {
      title: event.title,
      slug: event.slug,
      status: event.status,
      startsAt: event.startsAt,
      city: event.city,
    },
  })

  return NextResponse.json({ ok: true, event })
}
