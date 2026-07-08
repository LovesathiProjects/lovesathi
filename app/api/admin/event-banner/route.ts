import { NextResponse } from "next/server"
import { writeAdminAuditLog } from "@/lib/adminAudit"
import { requireAdmin } from "@/lib/adminAuth"

const EVENT_BANNER_BUCKET = "lovesathi-event-banners"
const MAX_BANNER_BYTES = 5 * 1024 * 1024
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"])

function getExtension(file: File) {
  if (file.type === "image/png") return "png"
  if (file.type === "image/webp") return "webp"
  return "jpg"
}

async function ensureBannerBucket(supabase: any) {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) {
    throw new Error(error.message)
  }

  if ((buckets || []).some((bucket: any) => bucket.name === EVENT_BANNER_BUCKET)) {
    return
  }

  const { error: createError } = await supabase.storage.createBucket(EVENT_BANNER_BUCKET, {
    public: true,
    allowedMimeTypes: Array.from(allowedMimeTypes),
    fileSizeLimit: MAX_BANNER_BYTES,
  })

  if (createError && !String(createError.message || "").toLowerCase().includes("already exists")) {
    throw new Error(createError.message)
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (auth.response) {
    return auth.response
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid upload body." }, { status: 400 })
  }

  const file = formData.get("banner")
  const eventId = typeof formData.get("eventId") === "string" ? String(formData.get("eventId")) : null

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an event banner image." }, { status: 400 })
  }

  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json({ error: "Banner must be a JPG, PNG, or WebP image." }, { status: 400 })
  }

  if (file.size > MAX_BANNER_BYTES) {
    return NextResponse.json({ error: "Banner image must be 5 MB or smaller." }, { status: 400 })
  }

  const { supabase, user } = auth.context

  try {
    await ensureBannerBucket(supabase)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to prepare event banner storage." },
      { status: 400 },
    )
  }

  const bytes = await file.arrayBuffer()
  const safeEventId = eventId?.replace(/[^a-zA-Z0-9-]/g, "") || "draft"
  const objectPath = `${safeEventId}/${Date.now()}-${crypto.randomUUID()}.${getExtension(file)}`

  const { error } = await supabase.storage.from(EVENT_BANNER_BUCKET).upload(objectPath, bytes, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const { data } = supabase.storage.from(EVENT_BANNER_BUCKET).getPublicUrl(objectPath)

  await writeAdminAuditLog(supabase, {
    actorId: user.id,
    actorEmail: user.email || null,
    resource: "event",
    recordId: eventId || null,
    previousStatus: null,
    nextStatus: "banner_uploaded",
    notes: "Event banner uploaded from the Lovesathi admin portal.",
    metadata: {
      bucket: EVENT_BANNER_BUCKET,
      objectPath,
      mimeType: file.type,
      size: file.size,
    },
  })

  return NextResponse.json({
    ok: true,
    bannerUrl: data.publicUrl,
  })
}
