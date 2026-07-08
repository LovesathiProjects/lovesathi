import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null
}

function cleanEmail(value: unknown) {
  const email = cleanText(value, 180)?.toLowerCase() || null
  return email && emailPattern.test(email) ? email : null
}

function cleanPhone(value: unknown) {
  const phone = cleanText(value, 24)
  if (!phone) return null
  const compact = phone.replace(/[^\d+]/g, "")
  return compact.length >= 7 && compact.length <= 24 ? compact : null
}

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return null

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: Request) {
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: "Event registration is not configured." }, { status: 503 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid registration request." }, { status: 400 })
  }

  const eventId = typeof body.eventId === "string" && uuidPattern.test(body.eventId) ? body.eventId : null
  const attendeeName = cleanText(body.attendeeName, 120)
  const attendeeEmail = cleanEmail(body.attendeeEmail)
  const attendeePhone = cleanPhone(body.attendeePhone)
  const notes = cleanText(body.notes, 800)

  if (!eventId || !attendeeName || (!attendeeEmail && !attendeePhone)) {
    return NextResponse.json(
      { error: "Name and at least one contact detail are required." },
      { status: 400 },
    )
  }

  const { data: event, error: eventError } = await supabase
    .from("lovesathi_events")
    .select("id,title,status,capacity")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 400 })
  }

  if (!event || event.status !== "published") {
    return NextResponse.json({ error: "This event is not accepting registrations." }, { status: 404 })
  }

  if (event.capacity) {
    const { count, error: countError } = await supabase
      .from("lovesathi_event_registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .in("status", ["registered", "approved"])

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 400 })
    }

    if ((count || 0) >= Number(event.capacity)) {
      return NextResponse.json({ error: "This event is currently full." }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from("lovesathi_event_registrations")
    .insert({
      event_id: eventId,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      attendee_phone: attendeePhone,
      status: "registered",
      notes,
    })
    .select("id,status,created_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    registration: data,
    event: {
      id: event.id,
      title: event.title,
    },
  })
}
