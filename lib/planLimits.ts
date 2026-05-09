import { supabase } from "@/lib/supabaseClient"
import {
  getPlanChatProfileLimit,
  getPlanMonthlySuperLikes,
  getPlanShortlistLimit,
  getSubscriptionPlan,
} from "@/lib/subscriptionPlans"
import {
  getEntitlementAccessUntilMs,
  getEntitlementDaysRemaining,
  isEntitlementPaymentDue,
  isEntitlementPremium,
} from "@/lib/subscriptionLifecycle"

export const FREE_PLAN_LIMITS = {
  swipeActions: 15,
  messagePeople: 5,
  messagesPerPerson: 5,
  windowHours: 12,
  shortlists: 3,
} as const

export type LimitKind = "swipe" | "messagePeople" | "messagePerson" | "shortlist" | "superLike"

export interface UsageLimitStatus {
  allowed: boolean
  isPremium: boolean
  remaining?: number
  kind?: LimitKind
  error?: string
}

export interface EntitlementStatus {
  isPremium: boolean
  planId: string | null
  status: string | null
  activeUntil: string | null
  accessUntil: string | null
  renewalDueAt: string | null
  graceUntil: string | null
  paymentDue: boolean
  graceDaysRemaining: number | null
  createdAt: string | null
  daysRemaining: number | null
}

const LIMIT_COPY: Record<LimitKind, string> = {
  swipe: `Free plan swipe limit reached. You can review ${FREE_PLAN_LIMITS.swipeActions} profiles every ${FREE_PLAN_LIMITS.windowHours} hours. Upgrade for unlimited discovery.`,
  messagePeople: `Free plan message limit reached. You can text ${FREE_PLAN_LIMITS.messagePeople} people every ${FREE_PLAN_LIMITS.windowHours} hours. Upgrade for unlimited conversations.`,
  messagePerson: `Free plan conversation limit reached. You can send ${FREE_PLAN_LIMITS.messagesPerPerson} messages to each person every ${FREE_PLAN_LIMITS.windowHours} hours. Upgrade for unlimited conversations.`,
  shortlist: `Free plan shortlist limit reached. You can save ${FREE_PLAN_LIMITS.shortlists} profiles. Upgrade for unlimited shortlists.`,
  superLike: "Super Likes are a premium feature. Choose a paid plan to send standout interest.",
}

function windowStartIso() {
  return new Date(Date.now() - FREE_PLAN_LIMITS.windowHours * 60 * 60 * 1000).toISOString()
}

function tableMissing(error: any) {
  return error?.code === "42P01" || /does not exist/i.test(error?.message || "")
}

function routineMissing(error: any) {
  return error?.code === "PGRST202" || /function .* not found|could not find the function/i.test(error?.message || "")
}

function emptyEntitlementStatus(): EntitlementStatus {
  return {
    isPremium: false,
    planId: null,
    status: null,
    activeUntil: null,
    accessUntil: null,
    renewalDueAt: null,
    graceUntil: null,
    paymentDue: false,
    graceDaysRemaining: null,
    createdAt: null,
    daysRemaining: null,
  }
}

export function getLimitMessage(kind: LimitKind) {
  return LIMIT_COPY[kind]
}

export function normalizeLimitError(errorMessage?: string | null) {
  if (!errorMessage) return errorMessage || undefined
  const lower = errorMessage.toLowerCase()

  if (lower.includes("swipe limit")) return getLimitMessage("swipe")
  if (lower.includes("conversation limit")) return getLimitMessage("messagePerson")
  if (lower.includes("message limit")) return getLimitMessage("messagePeople")
  if (lower.includes("shortlist limit")) return getLimitMessage("shortlist")
  if (lower.includes("super like")) return getLimitMessage("superLike")

  return errorMessage
}

export async function isPremiumUser(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_lovesathi_premium", { p_user_id: userId })

  if (!error) {
    return Boolean(data)
  }

  if (!tableMissing(error)) {
    console.warn("[isPremiumUser] Unable to read entitlement status:", error.message)
  }

  return false
}

export async function getUserEntitlementStatus(userId: string): Promise<EntitlementStatus> {
  const { error: syncError } = await supabase.rpc("sync_lovesathi_entitlement_lifecycle", { p_user_id: userId })
  if (syncError && !routineMissing(syncError)) {
    console.warn("[getUserEntitlementStatus] Unable to sync entitlement lifecycle:", syncError.message)
  }

  const { data, error } = await supabase
    .from("user_entitlements")
    .select("plan_id,status,active_until,renewal_due_at,grace_until,payment_failed_at,last_payment_reminder_at,created_at,updated_at")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("updated_at", { ascending: false })
    .limit(5)

  if (error) {
    if (!tableMissing(error)) {
      console.warn("[getUserEntitlementStatus] Unable to read entitlement:", error.message)
    }
    return emptyEntitlementStatus()
  }

  const now = Date.now()
  const active = (data || []).find((row) => isEntitlementPremium(row, now))
  const fallback = active || data?.[0]
  if (!fallback) return emptyEntitlementStatus()

  const accessUntilMs = getEntitlementAccessUntilMs(fallback)
  const paymentDue = isEntitlementPaymentDue(fallback, now)
  const accessUntil = accessUntilMs ? new Date(accessUntilMs).toISOString() : null
  const daysRemaining = getEntitlementDaysRemaining(fallback, now)

  return {
    isPremium: Boolean(active),
    planId: fallback?.plan_id || null,
    status: fallback?.status || null,
    activeUntil: fallback?.active_until || null,
    accessUntil,
    renewalDueAt: fallback?.renewal_due_at || null,
    graceUntil: fallback?.grace_until || null,
    paymentDue,
    graceDaysRemaining: paymentDue ? daysRemaining : null,
    createdAt: fallback?.created_at || null,
    daysRemaining,
  }
}

export async function getSwipeLimitStatus(userId: string): Promise<UsageLimitStatus> {
  const isPremium = await isPremiumUser(userId)
  if (isPremium) return { allowed: true, isPremium }

  const { count, error } = await supabase
    .from("matrimony_swipe_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", windowStartIso())

  if (error) {
    if (!tableMissing(error)) {
      console.warn("[getSwipeLimitStatus] Unable to read swipe usage:", error.message)
    }
    return { allowed: true, isPremium: false }
  }

  const used = count || 0
  const remaining = Math.max(FREE_PLAN_LIMITS.swipeActions - used, 0)
  return {
    allowed: used < FREE_PLAN_LIMITS.swipeActions,
    isPremium: false,
    remaining,
    kind: used < FREE_PLAN_LIMITS.swipeActions ? undefined : "swipe",
    error: used < FREE_PLAN_LIMITS.swipeActions ? undefined : getLimitMessage("swipe"),
  }
}

export async function getMessageSendLimitStatus(senderId: string, receiverId: string): Promise<UsageLimitStatus> {
  const entitlement = await getUserEntitlementStatus(senderId)
  if (entitlement.isPremium) {
    const chatProfileLimit = getPlanChatProfileLimit(entitlement.planId)
    if (chatProfileLimit === null) return { allowed: true, isPremium: true }

    const { data: peopleRows, error: peopleError } = await supabase
      .from("messages")
      .select("receiver_id")
      .eq("sender_id", senderId)
      .gte("created_at", entitlement.createdAt || "1970-01-01T00:00:00.000Z")

    if (peopleError) {
      if (!tableMissing(peopleError)) {
        console.warn("[getMessageSendLimitStatus] Unable to read premium message usage:", peopleError.message)
      }
      return { allowed: true, isPremium: true }
    }

    const contactedPeople = new Set((peopleRows || []).map((row: { receiver_id: string }) => row.receiver_id))
    if (contactedPeople.size >= chatProfileLimit && !contactedPeople.has(receiverId)) {
      return {
        allowed: false,
        isPremium: true,
        remaining: 0,
        kind: "messagePeople",
        error: `${getSubscriptionPlan(entitlement.planId).name} includes chat with ${chatProfileLimit} profiles. Upgrade for unlimited chat.`,
      }
    }

    return {
      allowed: true,
      isPremium: true,
      remaining: Math.max(chatProfileLimit - contactedPeople.size, 0),
    }
  }

  const since = windowStartIso()
  const [{ count: samePersonCount, error: samePersonError }, { data: peopleRows, error: peopleError }] =
    await Promise.all([
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", senderId)
        .eq("receiver_id", receiverId)
        .gte("created_at", since),
      supabase
        .from("messages")
        .select("receiver_id")
        .eq("sender_id", senderId)
        .gte("created_at", since),
    ])

  if (samePersonError || peopleError) {
    const error = samePersonError || peopleError
    if (!tableMissing(error)) {
      console.warn("[getMessageSendLimitStatus] Unable to read message usage:", error?.message)
    }
    return { allowed: true, isPremium: false }
  }

  if ((samePersonCount || 0) >= FREE_PLAN_LIMITS.messagesPerPerson) {
    return {
      allowed: false,
      isPremium: false,
      remaining: 0,
      kind: "messagePerson",
      error: getLimitMessage("messagePerson"),
    }
  }

  const contactedPeople = new Set((peopleRows || []).map((row: { receiver_id: string }) => row.receiver_id))
  if (contactedPeople.size >= FREE_PLAN_LIMITS.messagePeople && !contactedPeople.has(receiverId)) {
    return {
      allowed: false,
      isPremium: false,
      remaining: 0,
      kind: "messagePeople",
      error: getLimitMessage("messagePeople"),
    }
  }

  return {
    allowed: true,
    isPremium: false,
    remaining: FREE_PLAN_LIMITS.messagesPerPerson - (samePersonCount || 0),
  }
}

export async function getShortlistLimitStatus(userId: string, targetUserId?: string): Promise<UsageLimitStatus> {
  const entitlement = await getUserEntitlementStatus(userId)
  const isPremium = entitlement.isPremium
  const shortlistLimit = isPremium ? getPlanShortlistLimit(entitlement.planId) : FREE_PLAN_LIMITS.shortlists
  if (isPremium && shortlistLimit === null) return { allowed: true, isPremium }

  if (targetUserId) {
    const { data: existing, error: existingError } = await supabase
      .from("shortlists")
      .select("id")
      .eq("user_id", userId)
      .eq("shortlisted_user_id", targetUserId)
      .maybeSingle()

    if (!existingError && existing) {
      return { allowed: true, isPremium: false }
    }

    if (existingError && existingError.code !== "PGRST116") {
      console.warn("[getShortlistLimitStatus] Unable to read existing shortlist:", existingError.message)
    }
  }

  const { count, error } = await supabase
    .from("shortlists")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) {
    if (!tableMissing(error)) {
      console.warn("[getShortlistLimitStatus] Unable to read shortlist usage:", error.message)
    }
    return { allowed: true, isPremium: false }
  }

  const used = count || 0
  const limit = shortlistLimit || FREE_PLAN_LIMITS.shortlists
  const remaining = Math.max(limit - used, 0)
  const planName = isPremium ? getSubscriptionPlan(entitlement.planId).name : "Free plan"
  return {
    allowed: used < limit,
    isPremium,
    remaining,
    kind: used < limit ? undefined : "shortlist",
    error: used < limit
      ? undefined
      : isPremium
        ? `${planName} shortlist limit reached. Your plan includes ${limit} shortlist saves.`
        : getLimitMessage("shortlist"),
  }
}

function monthStartIso() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

export async function getSuperLikeLimitStatus(userId: string): Promise<UsageLimitStatus> {
  const entitlement = await getUserEntitlementStatus(userId)
  if (!entitlement.isPremium) {
    return {
      allowed: false,
      isPremium: false,
      remaining: 0,
      kind: "superLike",
      error: getLimitMessage("superLike"),
    }
  }

  const monthlyLimit = getPlanMonthlySuperLikes(entitlement.planId)
  if (monthlyLimit === null) {
    return { allowed: true, isPremium: true }
  }

  const { count, error } = await supabase
    .from("matrimony_likes")
    .select("*", { count: "exact", head: true })
    .eq("liker_id", userId)
    .eq("action", "super_like")
    .gte("created_at", monthStartIso())

  if (error) {
    if (!tableMissing(error)) {
      console.warn("[getSuperLikeLimitStatus] Unable to read Super Like usage:", error.message)
    }
    return { allowed: true, isPremium: true, remaining: monthlyLimit }
  }

  const used = count || 0
  const remaining = Math.max(monthlyLimit - used, 0)
  return {
    allowed: used < monthlyLimit,
    isPremium: true,
    remaining,
    kind: used < monthlyLimit ? undefined : "superLike",
    error: used < monthlyLimit
      ? undefined
      : `Monthly Super Like allowance reached. Your plan includes ${monthlyLimit} Super Likes each month.`,
  }
}
