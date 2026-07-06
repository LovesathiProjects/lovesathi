import { NextResponse } from "next/server"
import { writeAdminAuditLog } from "@/lib/adminAudit"
import { requireAdmin } from "@/lib/adminAuth"
import {
  getPlanActiveUntil,
  getPlanGraceUntil,
  getSubscriptionPlan,
  SUBSCRIPTION_GRACE_DAYS,
  SUBSCRIPTION_PLANS,
} from "@/lib/subscriptionPlans"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const verificationStatuses = new Set(["approved", "rejected", "in_review"])
const reportStatuses = new Set(["reviewed", "resolved", "dismissed"])
const profileReviewStatuses = new Set(["approved", "rejected", "in_review", "pending"])
const userStatuses = new Set(["suspended", "active"])
const entitlementStatuses = new Set(["active", "past_due", "canceled"])
const authEmailStatuses = new Set(["resend_confirmation"])
const adminGrantPlanIds = new Set<string>(SUBSCRIPTION_PLANS.map((plan) => plan.id))

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : null
}

function validateId(value: unknown) {
  return typeof value === "string" && uuidPattern.test(value)
}

function getSiteOrigin(request: Request) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (configuredSiteUrl?.startsWith("http")) {
    return configuredSiteUrl.replace(/\/$/, "")
  }

  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host")
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https"
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "")
  }

  return new URL(request.url).origin
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

  if (resource === "profile") {
    if (!profileReviewStatuses.has(status)) {
      return NextResponse.json({ error: "Invalid profile review status." }, { status: 400 })
    }

    const notes = cleanText(body.notes)
    const { data: previousRecord } = await supabase
      .from("matrimony_profile_full")
      .select("id,user_id,name,admin_review_status,is_seeded_profile")
      .eq("id", id)
      .maybeSingle()

    const { data, error } = await supabase
      .from("matrimony_profile_full")
      .update({
        admin_review_status: status,
        admin_review_notes: notes,
        admin_reviewed_at: new Date().toISOString(),
        admin_reviewed_by: user.id,
      })
      .eq("id", id)
      .select("id,user_id,name,admin_review_status,admin_review_notes,admin_reviewed_at,admin_reviewed_by")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await writeAdminAuditLog(supabase, {
      actorId: user.id,
      actorEmail: user.email || null,
      resource: "profile",
      recordId: id,
      previousStatus: previousRecord?.admin_review_status || null,
      nextStatus: status,
      notes,
      metadata: {
        userId: previousRecord?.user_id || null,
        profileName: previousRecord?.name || null,
        isSeededProfile: Boolean(previousRecord?.is_seeded_profile),
      },
    })

    return NextResponse.json({ ok: true, record: data })
  }

  if (resource === "user") {
    if (!userStatuses.has(status)) {
      return NextResponse.json({ error: "Invalid user status." }, { status: 400 })
    }

    if (id === user.id && status === "suspended") {
      return NextResponse.json({ error: "You cannot suspend your own active admin account." }, { status: 400 })
    }

    const notes = cleanText(body.notes)
    const { data: previousUserData } = await supabase.auth.admin.getUserById(id)
    const previousUser = previousUserData?.user as any
    const previousStatus =
      previousUser?.banned_until && new Date(previousUser.banned_until).getTime() > Date.now()
        ? "suspended"
        : "active"

    const { data, error } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: status === "suspended" ? "876000h" : "none",
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await writeAdminAuditLog(supabase, {
      actorId: user.id,
      actorEmail: user.email || null,
      resource: "user",
      recordId: id,
      previousStatus,
      nextStatus: status,
      notes,
      metadata: {
        email: previousUser?.email || data.user?.email || null,
      },
    })

    return NextResponse.json({ ok: true, record: { id: data.user?.id, email: data.user?.email } })
  }

  if (resource === "entitlement") {
    if (!entitlementStatuses.has(status)) {
      return NextResponse.json({ error: "Invalid entitlement status." }, { status: 400 })
    }

    const notes = cleanText(body.notes)
    const planId = typeof body.planId === "string" && body.planId.trim() ? body.planId.trim() : "signature"

    if (status === "active" && !adminGrantPlanIds.has(planId)) {
      return NextResponse.json({ error: "Invalid subscription plan." }, { status: 400 })
    }

    const plan = getSubscriptionPlan(planId)
    const { data: currentRows } = await supabase
      .from("user_entitlements")
      .select("id,plan_id,status,active_until,renewal_due_at,grace_until")
      .eq("user_id", id)
      .in("status", ["active", "trialing", "past_due"])
      .order("updated_at", { ascending: false })

    const currentActive = (currentRows || []).find(
      (item: any) => {
        const activeUntil = item.active_until ? new Date(item.active_until).getTime() : null
        const graceUntil = item.grace_until ? new Date(item.grace_until).getTime() : null
        return !activeUntil || activeUntil > Date.now() || Boolean(graceUntil && graceUntil > Date.now())
      },
    )
    const currentEntitlement = currentActive || currentRows?.[0]

    if (status === "canceled") {
      const { error } = await supabase
        .from("user_entitlements")
        .update({
          status: "canceled",
          active_until: new Date().toISOString(),
          canceled_at: new Date().toISOString(),
          notes,
          metadata: {
            canceledBy: user.email || user.id,
            reason: notes,
          },
        })
        .eq("user_id", id)
        .in("status", ["active", "trialing", "past_due"])

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      await writeAdminAuditLog(supabase, {
        actorId: user.id,
        actorEmail: user.email || null,
        resource: "entitlement",
        recordId: id,
        previousStatus: currentActive?.status || null,
        nextStatus: "canceled",
        notes,
        metadata: {
          planId: currentActive?.plan_id || null,
        },
      })

      return NextResponse.json({ ok: true })
    }

    if (status === "past_due") {
      if (!currentEntitlement) {
        return NextResponse.json({ error: "No active entitlement is available to mark payment due." }, { status: 404 })
      }

      const renewalDueAt = currentEntitlement?.active_until ? new Date(currentEntitlement.active_until) : new Date()
      const graceUntil = getPlanGraceUntil(renewalDueAt).toISOString()
      const { data, error } = await supabase
        .from("user_entitlements")
        .update({
          status: "past_due",
          renewal_due_at: renewalDueAt.toISOString(),
          grace_until: graceUntil,
          payment_failed_at: new Date().toISOString(),
          notes: notes || "Renewal payment is pending. Premium access remains during the grace period.",
          metadata: {
            markedPastDueBy: user.email || user.id,
            graceDays: SUBSCRIPTION_GRACE_DAYS,
            planId: currentEntitlement?.plan_id || plan.id,
          },
        })
        .eq("id", currentEntitlement?.id || "")
        .select("id,user_id,plan_id,status,active_until,renewal_due_at,grace_until")
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      await writeAdminAuditLog(supabase, {
        actorId: user.id,
        actorEmail: user.email || null,
        resource: "entitlement",
        recordId: id,
        previousStatus: currentEntitlement?.status || null,
        nextStatus: "past_due",
        notes,
        metadata: {
          planId: currentEntitlement?.plan_id || plan.id,
          graceUntil,
        },
      })

      return NextResponse.json({ ok: true, record: data })
    }

    await supabase
      .from("user_entitlements")
      .update({
        status: "canceled",
        active_until: new Date().toISOString(),
        canceled_at: new Date().toISOString(),
        notes: "Superseded by a newer admin-granted entitlement.",
      })
      .eq("user_id", id)
      .in("status", ["active", "trialing", "past_due"])

    const activeUntil = getPlanActiveUntil(plan.id).toISOString()
    const { data, error } = await supabase
      .from("user_entitlements")
      .insert({
        user_id: id,
        plan_id: plan.id,
        status: "active",
        active_until: activeUntil,
        renewal_due_at: activeUntil,
        grace_until: null,
        payment_failed_at: null,
        last_payment_reminder_at: null,
        canceled_at: null,
        source: "admin",
        granted_by: user.id,
        notes,
        metadata: {
          grantedByEmail: user.email || null,
          planName: plan.name,
          durationDays: plan.durationDays,
          graceDays: SUBSCRIPTION_GRACE_DAYS,
        },
      })
      .select("id,user_id,plan_id,status,active_until,renewal_due_at,grace_until")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await writeAdminAuditLog(supabase, {
      actorId: user.id,
      actorEmail: user.email || null,
      resource: "entitlement",
      recordId: id,
      previousStatus: currentActive?.status || null,
      nextStatus: "active",
      notes,
      metadata: {
        planId: plan.id,
        planName: plan.name,
        activeUntil,
      },
    })

    return NextResponse.json({ ok: true, record: data })
  }

  if (resource === "auth_email") {
    if (!authEmailStatuses.has(status)) {
      return NextResponse.json({ error: "Invalid auth email action." }, { status: 400 })
    }

    const notes = cleanText(body.notes) || "Confirmation code resent by Lovesathi admin."
    const { data: previousUserData, error: userLookupError } = await supabase.auth.admin.getUserById(id)
    const previousUser = previousUserData?.user as any

    if (userLookupError || !previousUser) {
      return NextResponse.json({ error: userLookupError?.message || "User account not found." }, { status: 404 })
    }

    if (!previousUser.email) {
      return NextResponse.json({ error: "This user does not have an email address." }, { status: 400 })
    }

    if (previousUser.email_confirmed_at) {
      return NextResponse.json({ error: "This user's email is already confirmed." }, { status: 400 })
    }

    const redirectTo = new URL("/auth/callback", getSiteOrigin(request)).toString()
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: previousUser.email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await writeAdminAuditLog(supabase, {
      actorId: user.id,
      actorEmail: user.email || null,
      resource: "auth_email",
      recordId: id,
      previousStatus: "unconfirmed",
      nextStatus: "confirmation_resent",
      notes,
      metadata: {
        email: previousUser.email,
        redirectTo,
      },
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown admin action." }, { status: 400 })
}
