import { NextResponse } from "next/server"
import { writeAdminAuditLog } from "@/lib/adminAudit"
import { requireAdmin } from "@/lib/adminAuth"

const notificationChannels = new Set(["push", "email", "sms"])
const notificationStatuses = new Set(["draft", "sent", "archived"])

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null
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

  const channel = notificationChannels.has(body.channel) ? body.channel : "email"
  const status = notificationStatuses.has(body.status) ? body.status : "draft"
  const audience = cleanText(body.audience, 80) || "all"
  const title = cleanText(body.title, 140)
  const message = cleanText(body.body, 1200)

  if (!title || !message) {
    return NextResponse.json({ error: "Notification title and message are required." }, { status: 400 })
  }

  const { supabase, user } = auth.context
  const { data, error } = await supabase
    .from("lovesathi_notification_campaigns")
    .insert({
      channel,
      audience,
      title,
      body: message,
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      created_by: user.id,
    })
    .select("id,channel,audience,title,body,status,sent_at,created_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await writeAdminAuditLog(supabase, {
    actorId: user.id,
    actorEmail: user.email || null,
    resource: "notification",
    recordId: data.id,
    previousStatus: null,
    nextStatus: status,
    notes:
      status === "sent"
        ? "Notification marked sent for provider handoff. Delivery providers are not wired in this phase."
        : "Notification draft saved from admin.",
    metadata: {
      channel,
      audience,
      providerDelivery: false,
    },
  })

  return NextResponse.json({ ok: true, campaign: data })
}
