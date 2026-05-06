import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"

type CountResult = {
  label: string
  value: number
  status: "ok" | "warning"
  detail?: string
}

type QueueResult<T> = {
  status: "ok" | "warning"
  detail?: string
  items: T[]
}

type AdminProfileItem = {
  id: string
  userId: string
  name: string
  age: number | null
  gender: string | null
  createdBy: string | null
  city: string | null
  education: string | null
  jobTitle: string | null
  photoCount: number
  completionSteps: number
  profileCompleted: boolean
  createdAt: string | null
  updatedAt: string | null
}

type AdminVerificationItem = {
  id: string
  userId: string
  profileName: string
  documentType: string | null
  status: string
  documentFileName: string | null
  faceScanFileName: string | null
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
}

type AdminReportItem = {
  id: string
  reporterId: string
  reportedUserId: string
  reporterName: string
  reportedName: string
  reason: string
  description: string | null
  status: string
  createdAt: string | null
  reviewedAt: string | null
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

function getHost(request: Request) {
  return (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    new URL(request.url).host ||
    "unknown"
  ).toLowerCase()
}

function getJsonText(value: any, keys: string[]) {
  for (const key of keys) {
    const text = value?.[key]
    if (typeof text === "string" && text.trim()) {
      return text.trim()
    }
  }
  return null
}

function countCompletedSteps(row: any) {
  return [
    row.step1_completed,
    row.step2_completed,
    row.step3_completed,
    row.step4_completed,
    row.step5_completed,
    row.step6_completed,
    row.step7_completed,
  ].filter(Boolean).length
}

function mapProfile(row: any): AdminProfileItem {
  const photos = Array.isArray(row.photos) ? row.photos : []
  const city =
    getJsonText(row.career?.work_location, ["city", "state", "country"]) ||
    getJsonText(row.personal, ["city", "location"]) ||
    getJsonText(row.cultural, ["place_of_birth"])

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name || "Unnamed profile",
    age: typeof row.age === "number" ? row.age : null,
    gender: row.gender || null,
    createdBy: row.created_by || null,
    city,
    education: getJsonText(row.career, ["highest_education", "college"]),
    jobTitle: getJsonText(row.career, ["job_title", "company"]),
    photoCount: photos.length,
    completionSteps: countCompletedSteps(row),
    profileCompleted: Boolean(row.profile_completed),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }
}

async function safeCount(
  supabase: any,
  label: string,
  table: string,
  build?: (query: any) => any,
): Promise<CountResult> {
  try {
    let query = supabase.from(table).select("*", { count: "exact", head: true })
    if (build) {
      query = build(query)
    }
    const { count, error } = await query

    if (error) {
      return {
        label,
        value: 0,
        status: "warning",
        detail: error.message,
      }
    }

    return {
      label,
      value: count || 0,
      status: "ok",
    }
  } catch (error: any) {
    return {
      label,
      value: 0,
      status: "warning",
      detail: error?.message || "Unable to read table",
    }
  }
}

async function safeRows<T>(run: () => PromiseLike<{ data: T[] | null; error: any }>): Promise<QueueResult<T>> {
  try {
    const { data, error } = await run()
    if (error) {
      return {
        status: "warning",
        detail: error.message,
        items: [],
      }
    }

    return {
      status: "ok",
      items: data || [],
    }
  } catch (error: any) {
    return {
      status: "warning",
      detail: error?.message || "Unable to load queue",
      items: [],
    }
  }
}

async function loadNameMap(supabase: any, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, string>()
  }

  const { data } = await supabase.from("matrimony_profile_full").select("user_id,name").in("user_id", userIds)
  const rows = (data || []) as Array<{ user_id: string; name: string | null }>
  return new Map<string, string>(rows.map((row) => [row.user_id, row.name || "Unnamed profile"]))
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (auth.response) {
    return auth.response
  }

  const { adminEmails, supabase, user } = auth.context
  const host = getHost(request)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const metrics = await Promise.all([
    safeCount(supabase, "Registered users", "user_profiles"),
    safeCount(supabase, "Completed profiles", "matrimony_profile_full", (query) => query.eq("profile_completed", true)),
    safeCount(supabase, "Draft profiles", "matrimony_profile_full", (query) => query.eq("profile_completed", false)),
    safeCount(supabase, "Pending verifications", "id_verifications", (query) =>
      query.in("verification_status", ["pending", "in_review"]),
    ),
    safeCount(supabase, "Open reports", "user_reports", (query) => query.in("status", ["pending", "reviewed"])),
    safeCount(supabase, "Active matches", "matrimony_matches", (query) => query.eq("is_active", true)),
    safeCount(supabase, "Messages", "messages"),
    safeCount(supabase, "Shortlists", "shortlists"),
    safeCount(supabase, "New profiles 7d", "matrimony_profile_full", (query) => query.gte("created_at", sevenDaysAgo)),
  ])

  const [profileRows, verificationRows, reportRows] = await Promise.all([
    safeRows<any>(() =>
      supabase
        .from("matrimony_profile_full")
        .select(
          "id,user_id,name,age,gender,created_by,photos,personal,career,cultural,profile_completed,step1_completed,step2_completed,step3_completed,step4_completed,step5_completed,step6_completed,step7_completed,created_at,updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(8),
    ),
    safeRows<any>(() =>
      supabase
        .from("id_verifications")
        .select(
          "id,user_id,document_type,verification_status,document_file_name,face_scan_file_name,verification_notes,created_at,updated_at",
        )
        .in("verification_status", ["pending", "in_review"])
        .order("created_at", { ascending: false })
        .limit(8),
    ),
    safeRows<any>(() =>
      supabase
        .from("user_reports")
        .select("id,reporter_id,reported_user_id,reason,description,status,created_at,reviewed_at")
        .in("status", ["pending", "reviewed"])
        .order("created_at", { ascending: false })
        .limit(8),
    ),
  ])

  const nameMap = await loadNameMap(
    supabase,
    unique([
      ...verificationRows.items.map((item) => item.user_id),
      ...reportRows.items.map((item) => item.reporter_id),
      ...reportRows.items.map((item) => item.reported_user_id),
    ]),
  )

  const verifications: QueueResult<AdminVerificationItem> = {
    status: verificationRows.status,
    detail: verificationRows.detail,
    items: verificationRows.items.map((item) => ({
      id: item.id,
      userId: item.user_id,
      profileName: nameMap.get(item.user_id) || "Profile not completed",
      documentType: item.document_type || null,
      status: item.verification_status || "pending",
      documentFileName: item.document_file_name || null,
      faceScanFileName: item.face_scan_file_name || null,
      notes: item.verification_notes || null,
      createdAt: item.created_at || null,
      updatedAt: item.updated_at || null,
    })),
  }

  const reports: QueueResult<AdminReportItem> = {
    status: reportRows.status,
    detail: reportRows.detail,
    items: reportRows.items.map((item) => ({
      id: item.id,
      reporterId: item.reporter_id,
      reportedUserId: item.reported_user_id,
      reporterName: nameMap.get(item.reporter_id) || "Reporter",
      reportedName: nameMap.get(item.reported_user_id) || "Reported profile",
      reason: item.reason,
      description: item.description || null,
      status: item.status || "pending",
      createdAt: item.created_at || null,
      reviewedAt: item.reviewed_at || null,
    })),
  }

  return NextResponse.json({
    admin: {
      email: user.email,
    },
    host,
    generatedAt: new Date().toISOString(),
    metrics,
    queues: {
      profiles: {
        status: profileRows.status,
        detail: profileRows.detail,
        items: profileRows.items.map(mapProfile),
      } satisfies QueueResult<AdminProfileItem>,
      verifications,
      reports,
    },
    readiness: [
      {
        label: "Admin allowlist",
        status: "ok",
        detail: `${adminEmails.length} configured admin account${adminEmails.length === 1 ? "" : "s"}.`,
      },
      {
        label: "Admin subdomain",
        status: host === "admin.lovesathi.com" ? "ok" : "warning",
        detail:
          host === "admin.lovesathi.com"
            ? "The portal is running from the dedicated admin subdomain."
            : "Add admin.lovesathi.com as a Render custom domain and point DNS to the same Lovesathi web service.",
      },
      {
        label: "Moderation actions",
        status: "ok",
        detail: "Verification and report status actions are guarded by Supabase login plus ADMIN_EMAILS.",
      },
      {
        label: "MSG91 email",
        status: "warning",
        detail: "DNS verification must be completed in MSG91 before password OTP email can work.",
      },
      {
        label: "Socket domain",
        status: "warning",
        detail: "Confirm socket.lovesathi.com DNS and Render custom domain before relying on live chat.",
      },
    ],
  })
}
