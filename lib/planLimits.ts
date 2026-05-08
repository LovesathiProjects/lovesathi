import { supabase } from "@/lib/supabaseClient"
import { getPlanMonthlySuperLikes } from "@/lib/subscriptionPlans"

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
  const { data, error } = await supabase
    .from("user_entitlements")
    .select("plan_id,status,active_until,updated_at")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("updated_at", { ascending: false })
    .limit(5)

  if (error) {
    if (!tableMissing(error)) {
      console.warn("[getUserEntitlementStatus] Unable to read entitlement:", error.message)
    }
    return { isPremium: false, planId: null, status: null, activeUntil: null, daysRemaining: null }
  }

  const now = Date.now()
  const active = (data || []).find((row) => {
    const validStatus = row.status === "active" || row.status === "trialing"
    const activeUntil = row.active_until ? new Date(row.active_until).getTime() : null
    return validStatus && (!activeUntil || activeUntil > now)
  })
  const fallback = active || data?.[0]
  const activeUntilMs = fallback?.active_until ? new Date(fallback.active_until).getTime() : null

  return {
    isPremium: Boolean(active),
    planId: fallback?.plan_id || null,
    status: fallback?.status || null,
    activeUntil: fallback?.active_until || null,
    daysRemaining: activeUntilMs ? Math.max(0, Math.ceil((activeUntilMs - now) / 86400000)) : active ? null : 0,
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
  const isPremium = await isPremiumUser(senderId)
  if (isPremium) return { allowed: true, isPremium }

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
  const isPremium = await isPremiumUser(userId)
  if (isPremium) return { allowed: true, isPremium }

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
  const remaining = Math.max(FREE_PLAN_LIMITS.shortlists - used, 0)
  return {
    allowed: used < FREE_PLAN_LIMITS.shortlists,
    isPremium: false,
    remaining,
    kind: used < FREE_PLAN_LIMITS.shortlists ? undefined : "shortlist",
    error: used < FREE_PLAN_LIMITS.shortlists ? undefined : getLimitMessage("shortlist"),
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
