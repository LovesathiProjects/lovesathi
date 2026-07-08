import { NextResponse } from "next/server"
import { writeAdminAuditLog } from "@/lib/adminAudit"
import { requireAdmin } from "@/lib/adminAuth"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
const profileReviewStatuses = new Set(["approved", "rejected", "in_review", "pending"])

function validateId(value: unknown) {
  return typeof value === "string" && uuidPattern.test(value)
}

function cleanText(value: unknown, maxLength: number) {
  if (value === null) return null
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null
}

function cleanRequiredText(value: unknown, fallback: string, maxLength: number) {
  return cleanText(value, maxLength) || fallback
}

function cleanNumber(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") return null
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return null
  const rounded = Math.round(numberValue)
  return rounded >= min && rounded <= max ? rounded : null
}

function cleanBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null
}

function cleanJsonObject(value: unknown) {
  if (typeof value === "string") {
    try {
      return cleanJsonObject(JSON.parse(value))
    } catch {
      throw new Error("Invalid JSON section.")
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return value
}

function cleanPhotos(value: unknown) {
  if (typeof value === "string") {
    try {
      return cleanPhotos(JSON.parse(value))
    } catch {
      throw new Error("Photos must be a JSON array.")
    }
  }

  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 12)
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

  const id = body.id
  if (!validateId(id)) {
    return NextResponse.json({ error: "A valid profile id is required." }, { status: 400 })
  }

  const { supabase, user } = auth.context
  const { data: previousRecord, error: lookupError } = await supabase
    .from("matrimony_profile_full")
    .select(
      "id,user_id,name,age,gender,created_by,public_profile_id,photos,bio,personal,career,family,cultural,partner_preferences,profile_completed,profile_hidden,admin_review_status",
    )
    .eq("id", id)
    .maybeSingle()

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 400 })
  }

  if (!previousRecord) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 })
  }

  let payload: Record<string, unknown>
  try {
    const reviewStatus = cleanText(body.reviewStatus, 40)
    payload = {
      name: cleanRequiredText(body.name, previousRecord.name || "Unnamed profile", 120),
      age: cleanNumber(body.age, 18, 100),
      gender: cleanText(body.gender, 40),
      created_by: cleanText(body.createdBy, 40),
      public_profile_id: cleanText(body.publicId, 80),
      photos: cleanPhotos(body.photos),
      bio: cleanText(body.bio, 3000),
      personal: cleanJsonObject(body.personal),
      career: cleanJsonObject(body.career),
      family: cleanJsonObject(body.family),
      cultural: cleanJsonObject(body.cultural),
      partner_preferences: cleanJsonObject(body.partnerPreferences),
      profile_completed: cleanBoolean(body.profileCompleted) ?? Boolean(previousRecord.profile_completed),
      profile_hidden: cleanBoolean(body.profileHidden) ?? Boolean(previousRecord.profile_hidden),
      updated_at: new Date().toISOString(),
    }

    if (reviewStatus && profileReviewStatuses.has(reviewStatus)) {
      payload.admin_review_status = reviewStatus
      payload.admin_reviewed_at = new Date().toISOString()
      payload.admin_reviewed_by = user.id
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Invalid profile payload." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("matrimony_profile_full")
    .update(payload)
    .eq("id", id)
    .select(
      "id,user_id,name,age,gender,created_by,public_profile_id,photos,bio,personal,career,family,cultural,partner_preferences,profile_completed,profile_hidden,admin_review_status,admin_review_notes,admin_reviewed_at,created_at,updated_at",
    )
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    const phone = cleanText(body.phone, 30)
    const { error: phoneError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: previousRecord.user_id,
          phone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )

    if (phoneError) {
      return NextResponse.json({ error: phoneError.message }, { status: 400 })
    }
  }

  await writeAdminAuditLog(supabase, {
    actorId: user.id,
    actorEmail: user.email || null,
    resource: "profile",
    recordId: id,
    previousStatus: previousRecord.admin_review_status || null,
    nextStatus: "details_updated",
    notes: cleanText(body.notes, 500) || "Profile details updated by Lovesathi admin.",
    metadata: {
      userId: previousRecord.user_id,
      previousName: previousRecord.name || null,
      nextName: data.name || null,
      phoneEdited: Object.prototype.hasOwnProperty.call(body, "phone"),
    },
  })

  return NextResponse.json({ ok: true, profile: data })
}
