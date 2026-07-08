import { NextResponse } from "next/server"
import { writeAdminAuditLog } from "@/lib/adminAudit"
import { requireAdmin } from "@/lib/adminAuth"

const settingKeyPattern = /^[a-z0-9_.-]+$/

function cleanText(value: unknown, maxLength = 800) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
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

  const items = Array.isArray(body.items) ? body.items : []
  if (items.length === 0) {
    return NextResponse.json({ error: "No settings were provided." }, { status: 400 })
  }

  const { supabase, user } = auth.context
  const payload = items
    .map((item: any) => ({
      key: cleanText(item.key, 120),
      category: cleanText(item.category, 80) || "general",
      label: cleanText(item.label, 120) || cleanText(item.key, 120),
      value: cleanText(item.value, 1000),
      updated_by: user.id,
    }))
    .filter((item: any) => item.key && settingKeyPattern.test(item.key) && item.label)

  if (payload.length !== items.length) {
    return NextResponse.json({ error: "One or more settings are invalid." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("lovesathi_site_settings")
    .upsert(payload, { onConflict: "key" })
    .select("key,category,label,value,updated_at")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await writeAdminAuditLog(supabase, {
    actorId: user.id,
    actorEmail: user.email || null,
    resource: "site_setting",
    recordId: null,
    previousStatus: null,
    nextStatus: "updated",
    notes: "Site contact and social settings updated from admin.",
    metadata: {
      keys: payload.map((item: any) => item.key),
    },
  })

  return NextResponse.json({ ok: true, settings: data || [] })
}
