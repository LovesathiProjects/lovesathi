import { SUBSCRIPTION_GRACE_DAYS } from "@/lib/subscriptionPlans"

export type EntitlementLifecycleRow = {
  status?: string | null
  active_until?: string | null
  renewal_due_at?: string | null
  grace_until?: string | null
}

const PREMIUM_STATUSES = new Set(["active", "trialing"])

function parseTime(value?: string | null) {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

function addGraceDays(time: number) {
  return time + SUBSCRIPTION_GRACE_DAYS * 24 * 60 * 60 * 1000
}

export function getEntitlementAccessUntilMs(row?: EntitlementLifecycleRow | null) {
  if (!row?.status) return undefined

  const activeUntil = parseTime(row.active_until)
  const renewalDueAt = parseTime(row.renewal_due_at)
  const graceUntil = parseTime(row.grace_until)

  if (PREMIUM_STATUSES.has(row.status)) {
    if (!activeUntil) return null
    return Math.max(activeUntil, graceUntil ?? addGraceDays(activeUntil))
  }

  if (row.status === "past_due") {
    if (graceUntil) return graceUntil
    const dueAt = renewalDueAt ?? activeUntil
    return dueAt ? addGraceDays(dueAt) : undefined
  }

  return undefined
}

export function isEntitlementPaymentDue(row?: EntitlementLifecycleRow | null, now = Date.now()) {
  if (!row?.status) return false
  const activeUntil = parseTime(row.active_until)

  return row.status === "past_due" || Boolean(PREMIUM_STATUSES.has(row.status) && activeUntil && activeUntil <= now)
}

export function isEntitlementPremium(row?: EntitlementLifecycleRow | null, now = Date.now()) {
  if (!row?.status) return false
  if (!PREMIUM_STATUSES.has(row.status) && row.status !== "past_due") return false

  const accessUntil = getEntitlementAccessUntilMs(row)
  return accessUntil === null || Boolean(accessUntil && accessUntil > now)
}

export function getEntitlementDaysRemaining(row?: EntitlementLifecycleRow | null, now = Date.now()) {
  const accessUntil = getEntitlementAccessUntilMs(row)
  if (accessUntil === null) return null
  if (!accessUntil) return 0

  return Math.max(0, Math.ceil((accessUntil - now) / 86400000))
}

