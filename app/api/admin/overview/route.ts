import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { LOVESATHI_EVENT_SELECT, mapLovesathiEvent, type LovesathiEventRow } from "@/lib/events"
import { getSubscriptionPlan, SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans"
import { isEntitlementPaymentDue, isEntitlementPremium } from "@/lib/subscriptionLifecycle"

type CountResult = {
  label: string
  value: number
  status: "ok" | "warning"
  detail?: string
}

type AdminRiskItem = {
  label: string
  value: number
  severity: "clear" | "watch" | "urgent"
  detail: string
}

type QueueResult<T> = {
  status: "ok" | "warning"
  detail?: string
  items: T[]
}

type AdminProfileItem = {
  id: string
  userId: string
  publicId: string | null
  email: string | null
  name: string
  age: number | null
  gender: string | null
  createdBy: string | null
  city: string | null
  education: string | null
  jobTitle: string | null
  bio: string | null
  photoCount: number
  completionSteps: number
  profileCompleted: boolean
  reviewStatus: string
  reviewNotes: string | null
  reviewedAt: string | null
  isSeededProfile: boolean
  flags: string[]
  createdAt: string | null
  updatedAt: string | null
}

type AdminUserItem = {
  id: string
  publicId: string | null
  email: string | null
  status: string
  provider: string | null
  emailConfirmedAt: string | null
  lastSignInAt: string | null
  suspendedUntil: string | null
  premium: {
    isPremium: boolean
    planId: string | null
    planName: string | null
    status: string | null
    activeUntil: string | null
    renewalDueAt: string | null
    graceUntil: string | null
    paymentDue: boolean
    source: string | null
  }
  profileName: string | null
  profileCompleted: boolean
  profileReviewStatus: string | null
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

type AdminAuditItem = {
  id: string
  actorEmail: string | null
  action: string
  resource: string
  recordId: string | null
  previousStatus: string | null
  nextStatus: string | null
  notes: string | null
  createdAt: string | null
}

type AuthEmailCount = {
  action: string
  label: string
  description: string
  total: number
  last30Days: number
  lastSeen: string | null
}

type AuthEmailSummaryItem = {
  category: "email" | "magic_link"
  label: string
  description: string
  overall: number
  last30Days: number
  lastSeen: string | null
}

type AuthEmailEvent = {
  id: string
  action: string
  label: string
  email: string | null
  userId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string | null
}

type AuthEmailTelemetry = {
  status: "ok" | "warning"
  detail?: string
  since: string | null
  last30Since: string | null
  until: string | null
  summary: AuthEmailSummaryItem[]
  counts: AuthEmailCount[]
  events: AuthEmailEvent[]
}

type AdminDashboardKpi = {
  label: string
  value: number
  status: "ok" | "warning"
  detail: string
}

type AdminSubscriptionItem = {
  id: string
  userId: string
  userEmail: string | null
  profileName: string | null
  planId: string | null
  planName: string | null
  status: string | null
  source: string | null
  activeUntil: string | null
  renewalDueAt: string | null
  graceUntil: string | null
  paymentDue: boolean
}

type AdminEventRegistrationItem = {
  id: string
  eventId: string
  eventTitle: string
  userId: string | null
  attendeeName: string
  attendeeEmail: string | null
  attendeePhone: string | null
  status: string
  notes: string | null
  createdAt: string | null
}

type AdminEventReportItem = {
  id: string
  eventId: string | null
  eventTitle: string
  reporterId: string | null
  reason: string
  description: string | null
  status: string
  createdAt: string | null
  reviewedAt: string | null
}

type AdminSiteSettingItem = {
  key: string
  category: string
  label: string
  value: string
  updatedAt: string | null
}

type AdminNotificationCampaignItem = {
  id: string
  channel: "push" | "email" | "sms"
  audience: string
  title: string
  body: string
  status: string
  sentAt: string | null
  createdAt: string | null
}

type AdminSuccessStoryItem = {
  id: string
  coupleNames: string
  city: string | null
  story: string
  imageUrl: string | null
  weddingDate: string | null
  status: string
  displayOrder: number
  createdAt: string | null
  updatedAt: string | null
}

const authEmailActions: Record<string, { label: string; description: string }> = {
  user_confirmation_requested: {
    label: "Verification emails",
    description: "Signup confirmations and resend-verification codes requested through Supabase Auth.",
  },
  user_recovery_requested: {
    label: "Password reset emails",
    description: "Forgot-password recovery links requested through Supabase Auth.",
  },
  user_repeated_signup: {
    label: "Repeated signup attempts",
    description: "Duplicate signup requests for accounts that already exist or are waiting for confirmation.",
  },
  user_invited: {
    label: "Invitations",
    description: "Supabase user invitation emails sent from admin flows.",
  },
  user_signedup: {
    label: "Email signups",
    description: "New auth users created. This is not always a separate email send, but helps compare conversion.",
  },
}

const ADMIN_PAGE_SIZE = 1000
const ADMIN_MAX_PAGES = 10
const ADMIN_IN_FILTER_BATCH_SIZE = 200

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

function chunkValues<T>(values: T[], size = ADMIN_IN_FILTER_BATCH_SIZE) {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function getLoadedRowsDetail(label: string, count: number) {
  const formattedCount = count.toLocaleString("en-IN")
  const maxRows = ADMIN_PAGE_SIZE * ADMIN_MAX_PAGES
  return count >= maxRows
    ? `Showing the first ${maxRows.toLocaleString("en-IN")} ${label}. Narrow with search if needed.`
    : `Showing all ${formattedCount} ${label}.`
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

function getProfileFlags(row: any) {
  const flags: string[] = []
  const photos = Array.isArray(row.photos) ? row.photos : []

  if (!row.profile_completed) flags.push("Profile incomplete")
  if (photos.length < 2) flags.push("Needs photos")
  if (!row.bio || String(row.bio).trim().length < 40) flags.push("Thin bio")
  if (!row.career?.highest_education) flags.push("Education missing")
  if (!row.career?.job_title) flags.push("Career missing")
  if (!row.cultural?.religion || !row.cultural?.community) flags.push("Cultural details missing")
  if (row.is_seeded_profile) flags.push("Seeded profile")
  if (row.admin_review_status === "rejected") flags.push("Hidden from discovery")

  return flags
}

function mapProfile(row: any, userEmailMap = new Map<string, string | null>()): AdminProfileItem {
  const photos = Array.isArray(row.photos) ? row.photos : []
  const city =
    getJsonText(row.career?.work_location, ["city", "state", "country"]) ||
    getJsonText(row.personal, ["city", "location"]) ||
    getJsonText(row.cultural, ["place_of_birth"])

  return {
    id: row.id,
    userId: row.user_id,
    publicId: row.public_profile_id || null,
    email: userEmailMap.get(row.user_id) || null,
    name: row.name || "Unnamed profile",
    age: typeof row.age === "number" ? row.age : null,
    gender: row.gender || null,
    createdBy: row.created_by || null,
    city,
    education: getJsonText(row.career, ["highest_education", "college"]),
    jobTitle: getJsonText(row.career, ["job_title", "company"]),
    bio: typeof row.bio === "string" ? row.bio : null,
    photoCount: photos.length,
    completionSteps: countCompletedSteps(row),
    profileCompleted: Boolean(row.profile_completed),
    reviewStatus: row.admin_review_status || "pending",
    reviewNotes: row.admin_review_notes || null,
    reviewedAt: row.admin_reviewed_at || null,
    isSeededProfile: Boolean(row.is_seeded_profile),
    flags: getProfileFlags(row),
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

async function safeAuthUsers(supabase: any): Promise<QueueResult<any>> {
  try {
    const users: any[] = []
    const perPage = ADMIN_PAGE_SIZE
    let page = 1
    let detail: string | undefined

    while (page <= ADMIN_MAX_PAGES) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      })

      if (error) {
        return {
          status: "warning",
          detail: error.message,
          items: users,
        }
      }

      const pageUsers = data?.users || []
      users.push(...pageUsers)

      if (pageUsers.length < perPage) break
      page += 1
    }

    detail = getLoadedRowsDetail("Supabase Auth users", users.length)

    return {
      status: "ok",
      detail,
      items: users,
    }
  } catch (error: any) {
    return {
      status: "warning",
      detail: error?.message || "Unable to load auth users.",
      items: [],
    }
  }
}

function isMissingAdminReviewColumn(error: any) {
  const message = String(error?.message || error?.details || "")
  return ["admin_review_status", "admin_review_notes", "admin_reviewed_at"].some((column) =>
    message.includes(column),
  )
}

async function loadAdminProfileRows(supabase: any): Promise<QueueResult<any>> {
  const enhancedSelect =
    "id,user_id,public_profile_id,name,age,gender,created_by,photos,bio,personal,career,cultural,profile_completed,step1_completed,step2_completed,step3_completed,step4_completed,step5_completed,step6_completed,step7_completed,is_seeded_profile,admin_review_status,admin_review_notes,admin_reviewed_at,created_at,updated_at"
  const legacySelect =
    "id,user_id,public_profile_id,name,age,gender,created_by,photos,bio,personal,career,cultural,profile_completed,step1_completed,step2_completed,step3_completed,step4_completed,step5_completed,step6_completed,step7_completed,created_at,updated_at"

  try {
    async function loadProfilePages(select: string) {
      const rows: any[] = []

      for (let page = 0; page < ADMIN_MAX_PAGES; page += 1) {
        const from = page * ADMIN_PAGE_SIZE
        const to = from + ADMIN_PAGE_SIZE - 1
        const { data, error } = await supabase
          .from("matrimony_profile_full")
          .select(select)
          .order("updated_at", { ascending: false })
          .range(from, to)

        if (error) {
          return { rows, error, detail: undefined as string | undefined }
        }

        const pageRows = data || []
        rows.push(...pageRows)
        if (pageRows.length < ADMIN_PAGE_SIZE) break
      }

      return {
        rows,
        error: null,
        detail: getLoadedRowsDetail("matrimony profiles", rows.length),
      }
    }

    const enhanced = await loadProfilePages(enhancedSelect)

    if (!enhanced.error) {
      return { status: "ok", detail: enhanced.detail, items: enhanced.rows }
    }

    if (!isMissingAdminReviewColumn(enhanced.error)) {
      return {
        status: "warning",
        detail: enhanced.error.message,
        items: [],
      }
    }

    const legacy = await loadProfilePages(legacySelect)

    return {
      status: "warning",
      detail:
        legacy.error?.message ||
        `Profile review migration is pending. ${legacy.detail || "Showing profiles in read-only moderation mode until the DB migration is applied."}`,
      items: legacy.rows,
    }
  } catch (error: any) {
    return {
      status: "warning",
      detail: error?.message || "Unable to load profile review queue.",
      items: [],
    }
  }
}

async function loadBatchedRows(
  supabase: any,
  table: string,
  select: string,
  column: string,
  values: string[],
  build?: (query: any) => any,
): Promise<QueueResult<any>> {
  const items: any[] = []

  try {
    for (const batch of chunkValues(values)) {
      let query = supabase.from(table).select(select).in(column, batch)
      if (build) {
        query = build(query)
      }

      const { data, error } = await query
      if (error) {
        return {
          status: "warning",
          detail: error.message,
          items,
        }
      }

      items.push(...(data || []))
    }

    return { status: "ok", items }
  } catch (error: any) {
    return {
      status: "warning",
      detail: error?.message || `Unable to load ${table}.`,
      items,
    }
  }
}

async function loadAuthUserProfileRows(supabase: any, userIds: string[]): Promise<QueueResult<any>> {
  if (userIds.length === 0) {
    return { status: "ok", items: [] }
  }

  const enhanced = await loadBatchedRows(
    supabase,
    "matrimony_profile_full",
    "user_id,public_profile_id,name,profile_completed,admin_review_status,updated_at",
    "user_id",
    userIds,
  )

  if (enhanced.status === "ok") {
    return enhanced
  }

  const legacy = await loadBatchedRows(
    supabase,
    "matrimony_profile_full",
    "user_id,public_profile_id,name,profile_completed,updated_at",
    "user_id",
    userIds,
  )

  return {
    status: legacy.status,
    detail: legacy.detail || enhanced.detail,
    items: legacy.items,
  }
}

async function loadEntitlementRows(supabase: any, userIds: string[]): Promise<QueueResult<any>> {
  if (userIds.length === 0) {
    return { status: "ok", items: [] }
  }

  const result = await loadBatchedRows(
    supabase,
    "user_entitlements",
    "id,user_id,plan_id,status,active_until,renewal_due_at,grace_until,source,updated_at",
    "user_id",
    userIds,
    (query) => query.order("updated_at", { ascending: false }),
  )

  result.items.sort(
    (left, right) =>
      new Date(right.updated_at || 0).getTime() - new Date(left.updated_at || 0).getTime(),
  )

  return result
}

async function loadAllEntitlementRows(supabase: any): Promise<QueueResult<any>> {
  return safeRows<any>(() =>
    supabase
      .from("user_entitlements")
      .select("id,user_id,plan_id,status,active_until,renewal_due_at,grace_until,source,updated_at")
      .order("updated_at", { ascending: false })
      .limit(120),
  )
}

async function loadEventRegistrationRows(supabase: any): Promise<QueueResult<any>> {
  return safeRows<any>(() =>
    supabase
      .from("lovesathi_event_registrations")
      .select("id,event_id,user_id,attendee_name,attendee_email,attendee_phone,status,notes,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(80),
  )
}

async function loadEventReportRows(supabase: any): Promise<QueueResult<any>> {
  return safeRows<any>(() =>
    supabase
      .from("lovesathi_event_reports")
      .select("id,event_id,reporter_id,reason,description,status,created_at,reviewed_at")
      .in("status", ["pending", "reviewed"])
      .order("created_at", { ascending: false })
      .limit(40),
  )
}

async function loadSiteSettingRows(supabase: any): Promise<QueueResult<any>> {
  return safeRows<any>(() =>
    supabase
      .from("lovesathi_site_settings")
      .select("key,category,label,value,updated_at")
      .order("category", { ascending: true })
      .order("key", { ascending: true }),
  )
}

async function loadNotificationCampaignRows(supabase: any): Promise<QueueResult<any>> {
  return safeRows<any>(() =>
    supabase
      .from("lovesathi_notification_campaigns")
      .select("id,channel,audience,title,body,status,sent_at,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(40),
  )
}

async function loadSuccessStoryRows(supabase: any): Promise<QueueResult<any>> {
  return safeRows<any>(() =>
    supabase
      .from("lovesathi_success_stories")
      .select("id,couple_names,city,story,image_url,wedding_date,status,display_order,created_at,updated_at")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(40),
  )
}

async function loadNameMap(supabase: any, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, string>()
  }

  const result = await loadBatchedRows(supabase, "matrimony_profile_full", "user_id,name", "user_id", userIds)
  const rows = result.items as Array<{ user_id: string; name: string | null }>
  return new Map<string, string>(rows.map((row) => [row.user_id, row.name || "Unnamed profile"]))
}

function mapAuthUser(user: any, profile?: any, entitlement?: any): AdminUserItem {
  const providers = Array.isArray(user?.app_metadata?.providers)
    ? user.app_metadata.providers.join(", ")
    : typeof user?.app_metadata?.provider === "string"
      ? user.app_metadata.provider
      : null
  const suspendedUntil = typeof user?.banned_until === "string" ? user.banned_until : null
  const isSuspended = suspendedUntil ? new Date(suspendedUntil).getTime() > Date.now() : false
  const status = isSuspended ? "suspended" : user?.email_confirmed_at ? "active" : "unconfirmed"
  const isPremium = Boolean(entitlement) && isEntitlementPremium(entitlement)
  const plan = entitlement?.plan_id ? getSubscriptionPlan(entitlement.plan_id) : null

  return {
    id: String(user?.id || ""),
    publicId: profile?.public_profile_id || null,
    email: typeof user?.email === "string" ? user.email : null,
    status,
    provider: providers,
    emailConfirmedAt: typeof user?.email_confirmed_at === "string" ? user.email_confirmed_at : null,
    lastSignInAt: typeof user?.last_sign_in_at === "string" ? user.last_sign_in_at : null,
    suspendedUntil,
    premium: {
      isPremium,
      planId: entitlement?.plan_id || null,
      planName: plan?.name || null,
      status: entitlement?.status || null,
      activeUntil: entitlement?.active_until || null,
      renewalDueAt: entitlement?.renewal_due_at || null,
      graceUntil: entitlement?.grace_until || null,
      paymentDue: Boolean(entitlement) && isEntitlementPaymentDue(entitlement),
      source: entitlement?.source || null,
    },
    profileName: profile?.name || null,
    profileCompleted: Boolean(profile?.profile_completed),
    profileReviewStatus: profile?.admin_review_status || null,
    createdAt: typeof user?.created_at === "string" ? user.created_at : null,
    updatedAt: typeof user?.updated_at === "string" ? user.updated_at : null,
  }
}

function getAuthEmailActionMeta(action: string) {
  return (
    authEmailActions[action] || {
      label: statusLabel(action),
      description: "Supabase Auth email-related event.",
    }
  )
}

function statusLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getMetricValue(metrics: CountResult[], label: string) {
  return metrics.find((metric) => metric.label === label)?.value || 0
}

function mapAuthEmailTelemetry(payload: any): AuthEmailTelemetry {
  const summary = Array.isArray(payload?.summary) ? payload.summary : []
  const counts = Array.isArray(payload?.counts) ? payload.counts : []
  const events = Array.isArray(payload?.events) ? payload.events : []

  return {
    status: "ok",
    since: typeof payload?.since === "string" ? payload.since : null,
    last30Since: typeof payload?.last30Since === "string" ? payload.last30Since : null,
    until: typeof payload?.until === "string" ? payload.until : null,
    summary: summary.map((item: any) => {
      const category =
        item?.category === "magic_link" || item?.category === "email"
          ? item.category
          : "email"

      return {
        category,
        label: typeof item?.label === "string" ? item.label : statusLabel(category),
        description:
          typeof item?.description === "string" ? item.description : "Supabase Auth email telemetry counter.",
        overall: typeof item?.overall === "number" ? item.overall : Number(item?.overall) || 0,
        last30Days: typeof item?.last30Days === "number" ? item.last30Days : Number(item?.last30Days) || 0,
        lastSeen: typeof item?.lastSeen === "string" ? item.lastSeen : null,
      }
    }),
    counts: counts.map((count: any) => {
      const action = typeof count?.action === "string" ? count.action : "unknown"
      const meta = getAuthEmailActionMeta(action)
      return {
        action,
        label: meta.label,
        description: meta.description,
        total: typeof count?.total === "number" ? count.total : Number(count?.total) || 0,
        last30Days: typeof count?.last30Days === "number" ? count.last30Days : Number(count?.last30Days) || 0,
        lastSeen: typeof count?.lastSeen === "string" ? count.lastSeen : null,
      }
    }),
    events: events.map((event: any) => {
      const action = typeof event?.action === "string" ? event.action : "unknown"
      return {
        id: String(event?.id || `${action}:${event?.createdAt || Math.random()}`),
        action,
        label: getAuthEmailActionMeta(action).label,
        email: typeof event?.email === "string" ? event.email : null,
        userId: typeof event?.userId === "string" ? event.userId : null,
        ipAddress: typeof event?.ipAddress === "string" ? event.ipAddress : null,
        userAgent: typeof event?.userAgent === "string" ? event.userAgent : null,
        createdAt: typeof event?.createdAt === "string" ? event.createdAt : null,
      }
    }),
  }
}

async function loadAuthEmailTelemetry(supabase: any): Promise<AuthEmailTelemetry> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const { data, error } = await supabase.rpc("get_lovesathi_auth_email_events", {
      p_since: since,
      p_limit: 25,
    })

    if (error) {
      return {
        status: "warning",
        detail: error.message,
        since,
        last30Since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        until: new Date().toISOString(),
        summary: [],
        counts: [],
        events: [],
      }
    }

    return mapAuthEmailTelemetry(data)
  } catch (error: any) {
    return {
      status: "warning",
      detail: error?.message || "Unable to load Supabase auth email logs.",
      since,
      last30Since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      until: new Date().toISOString(),
      summary: [],
      counts: [],
      events: [],
    }
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (auth.response) {
    return auth.response
  }

  const { adminEmails, supabase, user } = auth.context
  const host = getHost(request)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  await supabase.rpc("expire_lovesathi_past_due_entitlements")

  const [metrics, authEmailTelemetry, authUserRows] = await Promise.all([
    Promise.all([
      safeCount(supabase, "Registered users", "user_profiles"),
      safeCount(supabase, "Completed profiles", "matrimony_profile_full", (query) => query.eq("profile_completed", true)),
      safeCount(supabase, "Draft profiles", "matrimony_profile_full", (query) => query.eq("profile_completed", false)),
      safeCount(supabase, "Profiles needing review", "matrimony_profile_full", (query) =>
        query.in("admin_review_status", ["pending", "in_review"]),
      ),
      safeCount(supabase, "Rejected profiles", "matrimony_profile_full", (query) =>
        query.eq("admin_review_status", "rejected"),
      ),
      safeCount(supabase, "Pending verifications", "id_verifications", (query) =>
        query.in("verification_status", ["pending", "in_review"]),
      ),
      safeCount(supabase, "Open reports", "user_reports", (query) => query.in("status", ["pending", "reviewed"])),
      safeCount(supabase, "Active matches", "matrimony_matches", (query) => query.eq("is_active", true)),
      safeCount(supabase, "Messages", "messages"),
      safeCount(supabase, "Shortlists", "shortlists"),
      safeCount(supabase, "Active premium", "user_entitlements", (query) =>
        query.in("status", ["active", "trialing", "past_due"]),
      ),
      safeCount(supabase, "Total events", "lovesathi_events"),
      safeCount(supabase, "Published events", "lovesathi_events", (query) => query.eq("status", "published")),
      safeCount(supabase, "Draft events", "lovesathi_events", (query) => query.eq("status", "draft")),
      safeCount(supabase, "New profiles 7d", "matrimony_profile_full", (query) => query.gte("created_at", sevenDaysAgo)),
      safeCount(supabase, "Admin actions 7d", "admin_audit_logs", (query) => query.gte("created_at", sevenDaysAgo)),
    ]),
    loadAuthEmailTelemetry(supabase),
    safeAuthUsers(supabase),
  ])

  const authUserIds = unique(authUserRows.items.map((item) => item.id))

  const [
    profileRows,
    verificationRows,
    reportRows,
    auditRows,
    eventRows,
    userProfileRows,
    entitlementRows,
    allEntitlementRows,
    eventRegistrationRows,
    eventReportRows,
    siteSettingRows,
    notificationCampaignRows,
    successStoryRows,
  ] = await Promise.all([
    loadAdminProfileRows(supabase),
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
    safeRows<any>(() =>
      supabase
        .from("admin_audit_logs")
        .select("id,actor_email,action,resource,record_id,previous_status,next_status,notes,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ),
    safeRows<any>(() =>
      supabase
        .from("lovesathi_events")
        .select(LOVESATHI_EVENT_SELECT)
        .order("updated_at", { ascending: false })
        .limit(24),
    ),
    loadAuthUserProfileRows(supabase, authUserIds),
    loadEntitlementRows(supabase, authUserIds),
    loadAllEntitlementRows(supabase),
    loadEventRegistrationRows(supabase),
    loadEventReportRows(supabase),
    loadSiteSettingRows(supabase),
    loadNotificationCampaignRows(supabase),
    loadSuccessStoryRows(supabase),
  ])

  const userProfileMap = new Map(userProfileRows.items.map((item) => [item.user_id, item]))
  const entitlementMap = new Map<string, any>()
  entitlementRows.items.forEach((item) => {
    const isActive = isEntitlementPremium(item)
    const current = entitlementMap.get(item.user_id)
    const currentIsActive = current && isEntitlementPremium(current)
    if (!current || (isActive && !currentIsActive)) {
      entitlementMap.set(item.user_id, item)
    }
  })
  const userEmailMap = new Map<string, string | null>(
    authUserRows.items.map((item) => [item.id, typeof item.email === "string" ? item.email : null]),
  )
  const authUsers = authUserRows.items.map((item) => mapAuthUser(item, userProfileMap.get(item.id), entitlementMap.get(item.id)))
  const recentRegistrationSince = Date.now() - 7 * 24 * 60 * 60 * 1000
  const activeUserSince = Date.now() - 30 * 24 * 60 * 60 * 1000
  const unconfirmedUserCount = authUsers.filter((item) => item.status === "unconfirmed").length
  const suspendedUserCount = authUsers.filter((item) => item.status === "suspended").length
  const premiumUserCount = authUsers.filter((item) => item.premium.isPremium).length
  const activeUserCount = authUsers.filter((item) => {
    const lastSeen = item.lastSignInAt ? new Date(item.lastSignInAt).getTime() : 0
    return item.status === "active" && lastSeen >= activeUserSince
  }).length
  const recentRegistrationCount = authUsers.filter((item) => {
    const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0
    return createdAt >= recentRegistrationSince
  }).length
  const userMetrics: CountResult[] = [
    {
      label: "Auth users visible",
      value: authUsers.length,
      status: authUserRows.status,
      detail: authUserRows.detail,
    },
    {
      label: "Unconfirmed users",
      value: unconfirmedUserCount,
      status: unconfirmedUserCount > 0 ? "warning" : "ok",
      detail: authUserRows.detail,
    },
    {
      label: "Suspended users",
      value: suspendedUserCount,
      status: suspendedUserCount > 0 ? "warning" : "ok",
      detail: authUserRows.detail,
    },
    {
      label: "Premium users visible",
      value: premiumUserCount,
      status: entitlementRows.status,
      detail:
        entitlementRows.status === "ok"
          ? "Premium state is matched against the loaded Supabase Auth users."
          : entitlementRows.detail,
    },
  ]

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
  const events = (eventRows.items as LovesathiEventRow[]).map(mapLovesathiEvent)
  const eventTitleMap = new Map<string, string>(events.map((event) => [event.id, event.title]))
  const profileNameByUserId = new Map<string, string | null>(
    userProfileRows.items.map((item) => [item.user_id, item.name || null]),
  )
  const entitlementLedgerItems: AdminSubscriptionItem[] = allEntitlementRows.items.map((item) => {
    const plan = item.plan_id ? getSubscriptionPlan(item.plan_id) : null
    return {
      id: item.id,
      userId: item.user_id,
      userEmail: userEmailMap.get(item.user_id) || null,
      profileName: profileNameByUserId.get(item.user_id) || null,
      planId: item.plan_id || null,
      planName: plan?.name || null,
      status: item.status || null,
      source: item.source || null,
      activeUntil: item.active_until || null,
      renewalDueAt: item.renewal_due_at || null,
      graceUntil: item.grace_until || null,
      paymentDue: isEntitlementPaymentDue(item),
    }
  })
  const activeSubscriptions: QueueResult<AdminSubscriptionItem> = {
    status: allEntitlementRows.status,
    detail: allEntitlementRows.detail,
    items: entitlementLedgerItems.filter((item) => ["active", "trialing", "past_due"].includes(item.status || "")),
  }
  const eventRegistrations: QueueResult<AdminEventRegistrationItem> = {
    status: eventRegistrationRows.status,
    detail: eventRegistrationRows.detail,
    items: eventRegistrationRows.items.map((item) => ({
      id: item.id,
      eventId: item.event_id,
      eventTitle: eventTitleMap.get(item.event_id) || "Event unavailable",
      userId: item.user_id || null,
      attendeeName: item.attendee_name || "Guest",
      attendeeEmail: item.attendee_email || null,
      attendeePhone: item.attendee_phone || null,
      status: item.status || "registered",
      notes: item.notes || null,
      createdAt: item.created_at || null,
    })),
  }
  const eventReports: QueueResult<AdminEventReportItem> = {
    status: eventReportRows.status,
    detail: eventReportRows.detail,
    items: eventReportRows.items.map((item) => ({
      id: item.id,
      eventId: item.event_id || null,
      eventTitle: item.event_id ? eventTitleMap.get(item.event_id) || "Event unavailable" : "General event report",
      reporterId: item.reporter_id || null,
      reason: item.reason || "Event report",
      description: item.description || null,
      status: item.status || "pending",
      createdAt: item.created_at || null,
      reviewedAt: item.reviewed_at || null,
    })),
  }
  const siteSettings: QueueResult<AdminSiteSettingItem> = {
    status: siteSettingRows.status,
    detail: siteSettingRows.detail,
    items: siteSettingRows.items.map((item) => ({
      key: item.key,
      category: item.category || "general",
      label: item.label || item.key,
      value: item.value || "",
      updatedAt: item.updated_at || null,
    })),
  }
  const notificationCampaigns: QueueResult<AdminNotificationCampaignItem> = {
    status: notificationCampaignRows.status,
    detail: notificationCampaignRows.detail,
    items: notificationCampaignRows.items.map((item) => ({
      id: item.id,
      channel: item.channel === "push" || item.channel === "email" || item.channel === "sms" ? item.channel : "email",
      audience: item.audience || "all",
      title: item.title || "Untitled campaign",
      body: item.body || "",
      status: item.status || "draft",
      sentAt: item.sent_at || null,
      createdAt: item.created_at || null,
    })),
  }
  const successStories: QueueResult<AdminSuccessStoryItem> = {
    status: successStoryRows.status,
    detail: successStoryRows.detail,
    items: successStoryRows.items.map((item) => ({
      id: item.id,
      coupleNames: item.couple_names || "Unnamed couple",
      city: item.city || null,
      story: item.story || "",
      imageUrl: item.image_url || null,
      weddingDate: item.wedding_date || null,
      status: item.status || "draft",
      displayOrder: Number(item.display_order) || 0,
      createdAt: item.created_at || null,
      updatedAt: item.updated_at || null,
    })),
  }
  const allMetrics = [...metrics, ...userMetrics]
  const totalEvents = getMetricValue(allMetrics, "Total events")
  const profilesNeedingReview = getMetricValue(allMetrics, "Profiles needing review")
  const pendingVerifications = getMetricValue(allMetrics, "Pending verifications")
  const openReports = getMetricValue(allMetrics, "Open reports")
  const unconfirmedUsers = getMetricValue(allMetrics, "Unconfirmed users")
  const activePremium = getMetricValue(allMetrics, "Active premium")
  const publishedEvents = getMetricValue(allMetrics, "Published events")
  const draftEvents = getMetricValue(allMetrics, "Draft events")
  const adminActions7d = getMetricValue(allMetrics, "Admin actions 7d")
  const dashboard: AdminDashboardKpi[] = [
    {
      label: "Total Users",
      value: authUsers.length || getMetricValue(allMetrics, "Registered users"),
      status: authUserRows.status,
      detail: authUserRows.detail || "Total Supabase Auth users visible to the admin API.",
    },
    {
      label: "Active Users",
      value: activeUserCount,
      status: "ok",
      detail: "Users not blocked who signed in within the last 30 days.",
    },
    {
      label: "Premium Users",
      value: premiumUserCount,
      status: entitlementRows.status,
      detail: "Users with an active, trialing, or grace-period premium entitlement.",
    },
    {
      label: "Total Events",
      value: totalEvents || eventRows.items.length,
      status: eventRows.status,
      detail: "Total event records created on the platform.",
    },
    {
      label: "Pending Verifications",
      value: pendingVerifications,
      status: pendingVerifications > 0 ? "warning" : "ok",
      detail: "Profiles waiting for admin identity or document approval.",
    },
    {
      label: "Recent Registrations",
      value: recentRegistrationCount,
      status: "ok",
      detail: "New users registered in the last 7 days.",
    },
  ]
  const risk: AdminRiskItem[] = [
    {
      label: "Safety reports",
      value: openReports,
      severity: openReports > 0 ? "urgent" : "clear",
      detail:
        openReports > 0
          ? "Open member reports should be reviewed before daily approval rounds."
          : "No open safety reports are currently waiting on the trust desk.",
    },
    {
      label: "Profile review backlog",
      value: profilesNeedingReview,
      severity: profilesNeedingReview > 10 ? "urgent" : profilesNeedingReview > 0 ? "watch" : "clear",
      detail:
        profilesNeedingReview > 0
          ? "Approve serious profiles and reject incomplete or unsafe profiles before they enter discovery."
          : "The profile review queue is clear.",
    },
    {
      label: "ID checks pending",
      value: pendingVerifications,
      severity: pendingVerifications > 8 ? "urgent" : pendingVerifications > 0 ? "watch" : "clear",
      detail:
        pendingVerifications > 0
          ? "Identity submissions are waiting for human verification decisions."
          : "No ID verification submissions are currently pending.",
    },
    {
      label: "Email confirmations",
      value: unconfirmedUsers,
      severity: unconfirmedUsers > 10 ? "watch" : "clear",
      detail:
        unconfirmedUsers > 0
          ? "Unconfirmed users can be nudged from User management with a fresh verification code."
          : "Loaded auth users have confirmed email.",
    },
    {
      label: "Premium controls",
      value: activePremium,
      severity: "clear",
      detail:
        activePremium > 0
          ? "Active premium entitlements are visible and can be revoked from this portal."
          : "No active premium entitlements are visible in the loaded user set.",
    },
    {
      label: "Event calendar",
      value: publishedEvents,
      severity: publishedEvents > 0 ? "clear" : draftEvents > 0 ? "watch" : "watch",
      detail:
        publishedEvents > 0
          ? "Public events are live on the events page."
          : draftEvents > 0
            ? "Event drafts are waiting to be published."
            : "Create the first Lovesathi event before launch campaigns begin.",
    },
    {
      label: "Admin activity",
      value: adminActions7d,
      severity: adminActions7d > 0 ? "clear" : "watch",
      detail:
        adminActions7d > 0
          ? "Recent admin decisions are being captured in the audit log."
          : "No admin audit actions were recorded in the last 7 days.",
    },
  ]

  return NextResponse.json({
    admin: {
      email: user.email,
    },
    host,
    generatedAt: new Date().toISOString(),
    dashboard,
    metrics: allMetrics,
    risk,
    queues: {
      users: {
        status: authUserRows.status,
        detail: authUserRows.detail,
        items: authUsers,
      } satisfies QueueResult<AdminUserItem>,
      profiles: {
        status: profileRows.status,
        detail: profileRows.detail,
        items: profileRows.items.map((item) => mapProfile(item, userEmailMap)),
      } satisfies QueueResult<AdminProfileItem>,
      verifications,
      reports,
      events: {
        status: eventRows.status,
        detail: eventRows.detail,
        items: events,
      },
      audit: {
        status: auditRows.status,
        detail: auditRows.detail,
        items: auditRows.items.map((item) => ({
          id: item.id,
          actorEmail: item.actor_email || null,
          action: item.action || "admin.action",
          resource: item.resource || "record",
          recordId: item.record_id || null,
          previousStatus: item.previous_status || null,
          nextStatus: item.next_status || null,
          notes: item.notes || null,
          createdAt: item.created_at || null,
        })),
      } satisfies QueueResult<AdminAuditItem>,
    },
    operations: {
      plans: SUBSCRIPTION_PLANS,
      activeSubscriptions,
      paymentHistory: {
        status: allEntitlementRows.status,
        detail:
          allEntitlementRows.status === "ok"
            ? "Payment-provider records are not connected yet; this view shows entitlement changes and renewal state."
            : allEntitlementRows.detail,
        items: entitlementLedgerItems,
      } satisfies QueueResult<AdminSubscriptionItem>,
      eventRegistrations,
      eventReports,
      siteSettings,
      notificationCampaigns,
      successStories,
    },
    authEmailTelemetry,
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
        detail: "User, profile, verification, and report actions are guarded by Supabase login plus ADMIN_EMAILS.",
      },
      {
        label: "User management",
        status: authUserRows.status,
        detail:
          authUserRows.status === "ok"
            ? "Admins can inspect loaded auth users, suspend, restore, or permanently delete accounts with audit notes."
            : authUserRows.detail || "Supabase Auth user management is not currently reachable.",
      },
      {
        label: "Subscription entitlements",
        status: entitlementRows.status,
        detail:
          entitlementRows.status === "ok"
            ? "Premium state is driven by user_entitlements and can be granted or revoked by admin until payment webhooks are connected."
            : entitlementRows.detail || "Run the latest migration so premium entitlement controls can load.",
      },
      {
        label: "Audit trail",
        status: auditRows.status,
        detail:
          auditRows.status === "ok"
            ? "Admin decisions are being written to admin_audit_logs."
            : "Run the latest Supabase migrations so admin_audit_logs can record review decisions.",
      },
      {
        label: "Event publishing",
        status: eventRows.status,
        detail:
          eventRows.status === "ok"
            ? "Admins can draft, publish, feature, and archive public Lovesathi events."
            : eventRows.detail || "Run the latest migration so event publishing can load.",
      },
      {
        label: "Event registrations",
        status: eventRegistrationRows.status,
        detail:
          eventRegistrationRows.status === "ok"
            ? "Admins can review event registration rows when public registration is enabled."
            : eventRegistrationRows.detail || "Run the admin operations migration so event registration lists can load.",
      },
      {
        label: "Notifications",
        status: notificationCampaignRows.status,
        detail:
          notificationCampaignRows.status === "ok"
            ? "Notification drafts are recorded for push, email, and SMS provider handoff."
            : notificationCampaignRows.detail || "Run the admin operations migration so notification drafts can load.",
      },
      {
        label: "Site settings",
        status: siteSettingRows.status,
        detail:
          siteSettingRows.status === "ok"
            ? "Contact details and social links are editable from the admin operations surface."
            : siteSettingRows.detail || "Run the admin operations migration so site settings can load.",
      },
      {
        label: "Success stories",
        status: successStoryRows.status,
        detail:
          successStoryRows.status === "ok"
            ? "Admin-managed success stories are available with public-read support for published stories."
            : successStoryRows.detail || "Run the admin operations migration so success stories can load.",
      },
      {
        label: "Supabase email",
        status: "warning",
        detail: "Confirm Supabase Auth email templates and redirect URLs before relying on confirmation and recovery email.",
      },
      {
        label: "Socket domain",
        status: "warning",
        detail: "Confirm socket.lovesathi.com DNS and Render custom domain before relying on live chat.",
      },
    ],
  })
}
