import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const verificationStatuses = new Set(["approved", "rejected", "in_review"])
const reportStatuses = new Set(["reviewed", "resolved", "dismissed"])

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : null
}

function validateId(value: unknown) {
  return typeof value === "string" && uuidPattern.test(value)
}

async function writeAdminAuditLog(
  supabase: any,
  {
    actorId,
    actorEmail,
    resource,
    recordId,
    previousStatus,
    nextStatus,
    notes,
    metadata,
  }: {
    actorId: string
    actorEmail: string | null
    resource: "verification" | "report"
    recordId: string
    previousStatus: string | null
    nextStatus: string
    notes: string | null
    metadata?: Record<string, unknown>
  },
) {
  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_id: actorId,
    actor_email: actorEmail,
    action: `${resource}.${nextStatus}`,
    resource,
    record_id: recordId,
    previous_status: previousStatus,
    next_status: nextStatus,
    notes,
    metadata: metadata || {},
  })

  if (error) {
    console.warn("[admin/actions] Unable to write admin audit log:", error.message)
  }
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
  const resource = typeof body.resource === "string" ? body.resource : ""
  const id = body.id
  const status = typeof body.status === "string" ? body.status : ""

  if (!validateId(id)) {
    return NextResponse.json({ error: "A valid record id is required." }, { status: 400 })
  }

  if (resource === "verification") {
    if (!verificationStatuses.has(status)) {
      return NextResponse.json({ error: "Invalid verification status." }, { status: 400 })
    }

    const notes = cleanText(body.notes)
    const { data: previousRecord } = await supabase
      .from("id_verifications")
      .select("id,user_id,verification_status,document_type")
      .eq("id", id)
      .maybeSingle()

    const payload: Record<string, unknown> = {
      verification_status: status,
      verification_notes: notes,
    }

    if (status === "approved" || status === "rejected") {
      payload.verified_at = new Date().toISOString()
      payload.verified_by = user.id
    }

    const { data, error } = await supabase
      .from("id_verifications")
      .update(payload)
      .eq("id", id)
      .select("id,verification_status,verification_notes,verified_at,verified_by,updated_at")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await writeAdminAuditLog(supabase, {
      actorId: user.id,
      actorEmail: user.email || null,
      resource: "verification",
      recordId: id,
      previousStatus: previousRecord?.verification_status || null,
      nextStatus: status,
      notes,
      metadata: {
        userId: previousRecord?.user_id || null,
        documentType: previousRecord?.document_type || null,
      },
    })

    return NextResponse.json({ ok: true, record: data })
  }

  if (resource === "report") {
    if (!reportStatuses.has(status)) {
      return NextResponse.json({ error: "Invalid report status." }, { status: 400 })
    }

    const notes = cleanText(body.notes)
    const { data: previousRecord } = await supabase
      .from("user_reports")
      .select("id,reporter_id,reported_user_id,reason,status")
      .eq("id", id)
      .maybeSingle()

    const { data, error } = await supabase
      .from("user_reports")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", id)
      .select("id,status,reviewed_at,reviewed_by")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await writeAdminAuditLog(supabase, {
      actorId: user.id,
      actorEmail: user.email || null,
      resource: "report",
      recordId: id,
      previousStatus: previousRecord?.status || null,
      nextStatus: status,
      notes,
      metadata: {
        reporterId: previousRecord?.reporter_id || null,
        reportedUserId: previousRecord?.reported_user_id || null,
        reason: previousRecord?.reason || null,
      },
    })

    return NextResponse.json({ ok: true, record: data })
  }

  return NextResponse.json({ error: "Unknown admin action." }, { status: 400 })
}
