import { NextResponse } from "next/server"
import { writeAdminAuditLog } from "@/lib/adminAudit"
import { requireAdmin } from "@/lib/adminAuth"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const storyStatuses = new Set(["draft", "published", "archived"])

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
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
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

  const id = typeof body.id === "string" && uuidPattern.test(body.id) ? body.id : null
  const coupleNames = cleanText(body.coupleNames, 140)
  const story = cleanText(body.story, 1600)
  const status = storyStatuses.has(body.status) ? body.status : "draft"

  if (!coupleNames || !story || story.length < 20) {
    return NextResponse.json({ error: "Couple names and a story of at least 20 characters are required." }, { status: 400 })
  }

  const { supabase, user } = auth.context
  const payload = {
    couple_names: coupleNames,
    city: cleanText(body.city, 80),
    story,
    image_url: cleanUrl(body.imageUrl),
    wedding_date: cleanDate(body.weddingDate),
    status,
    display_order: Number.isFinite(Number(body.displayOrder)) ? Math.floor(Number(body.displayOrder)) : 0,
    updated_by: user.id,
    published_at: status === "published" ? new Date().toISOString() : null,
  }
  const previousResult = id
    ? await supabase.from("lovesathi_success_stories").select("id,status,couple_names").eq("id", id).maybeSingle()
    : { data: null, error: null }

  if (previousResult.error) {
    return NextResponse.json({ error: previousResult.error.message }, { status: 400 })
  }

  const query = id
    ? supabase.from("lovesathi_success_stories").update(payload).eq("id", id)
    : supabase.from("lovesathi_success_stories").insert({ ...payload, created_by: user.id })

  const { data, error } = await query
    .select("id,couple_names,city,story,image_url,wedding_date,status,display_order,created_at,updated_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await writeAdminAuditLog(supabase, {
    actorId: user.id,
    actorEmail: user.email || null,
    resource: "success_story",
    recordId: data.id,
    previousStatus: previousResult.data?.status || null,
    nextStatus: status,
    notes: `Success story ${id ? "updated" : "created"} from admin.`,
    metadata: {
      coupleNames,
    },
  })

  return NextResponse.json({ ok: true, story: data })
}
