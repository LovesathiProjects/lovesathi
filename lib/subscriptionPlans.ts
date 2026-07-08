export type SubscriptionPlanId = "basic" | "essential" | "signature" | "heritage"

export const SUBSCRIPTION_GRACE_DAYS = 15

export type SubscriptionPlan = {
  id: SubscriptionPlanId
  name: string
  durationLabel: string
  durationDays: number
  priceLabel: string
  popular?: boolean
  monthlySuperLikes: number | null
  shortlistLimit: number | null
  contactViewLimit: number | null
  chatProfileLimit: number | null
  canSeeWhoShortlistedYou: boolean
  concierge?: {
    title: string
    description: string
    highlights: string[]
  }
  features: string[]
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic",
    durationLabel: "3 months",
    durationDays: 90,
    priceLabel: "INR 2,329",
    monthlySuperLikes: 5,
    shortlistLimit: 30,
    contactViewLimit: 15,
    chatProfileLimit: 50,
    canSeeWhoShortlistedYou: false,
    features: [
      "30 shortlist saves",
      "5 Super Likes every month",
      "15 contact reveals",
      "Chat with up to 50 profiles",
      "Verified-only discovery after free allowance",
      "Who shortlisted you is not included",
    ],
  },
  {
    id: "essential",
    name: "Essential",
    durationLabel: "6 months",
    durationDays: 180,
    priceLabel: "INR 4,997",
    popular: true,
    monthlySuperLikes: 15,
    shortlistLimit: 70,
    contactViewLimit: 70,
    chatProfileLimit: null,
    canSeeWhoShortlistedYou: true,
    features: [
      "70 shortlist saves",
      "15 Super Likes every month",
      "70 contact reveals",
      "Unlimited chat access",
      "See who shortlisted you",
      "Premium-only discovery filter",
      "Priority discovery placement",
    ],
  },
  {
    id: "signature",
    name: "Signature",
    durationLabel: "12 months",
    durationDays: 365,
    priceLabel: "INR 8,329",
    monthlySuperLikes: 30,
    shortlistLimit: 400,
    contactViewLimit: 700,
    chatProfileLimit: null,
    canSeeWhoShortlistedYou: true,
    features: [
      "400 shortlist saves",
      "30 Super Likes every month",
      "700 contact reveals",
      "Unlimited chat for a year",
      "See who shortlisted you",
      "First-priority support within 5 minutes",
      "Premium-only discovery filter",
    ],
  },
  {
    id: "heritage",
    name: "Heritage",
    durationLabel: "Lifetime concierge",
    durationDays: 3650,
    priceLabel: "INR 19,997",
    monthlySuperLikes: null,
    shortlistLimit: null,
    contactViewLimit: null,
    chatProfileLimit: null,
    canSeeWhoShortlistedYou: true,
    concierge: {
      title: "Premium Support Concierge",
      description:
        "Heritage includes an assigned Relationship Executive who works like a private match advisor for your family.",
      highlights: [
        "Learns your family priorities, culture, lifestyle, and non-negotiables before recommending profiles.",
        "Finds and shortlists verified, high-compatibility matches on your behalf every month.",
        "Coordinates introductions with discretion, timing, and follow-up support.",
        "Handled 100+ successful introductions across serious matrimony searches.",
      ],
    },
    features: [
      "Everything unlimited",
      "Assigned Relationship Executive",
      "10 handpicked 100% matching verified profiles every month",
      "Unlimited Super Likes",
      "Unlimited contact reveals",
      "Unlimited shortlist saves",
      "Unlimited chat",
      "Premium concierge support",
    ],
  },
]

export function getSubscriptionPlan(planId?: string | null) {
  const normalizedPlanId = normalizeSubscriptionPlanId(planId)
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === normalizedPlanId) || SUBSCRIPTION_PLANS[1]
}

export function getPlanActiveUntil(planId?: string | null, from = new Date()) {
  const plan = getSubscriptionPlan(planId)
  const activeUntil = new Date(from)
  activeUntil.setDate(activeUntil.getDate() + plan.durationDays)
  return activeUntil
}

export function getPlanGraceUntil(renewalDueAt: Date) {
  const graceUntil = new Date(renewalDueAt)
  graceUntil.setDate(graceUntil.getDate() + SUBSCRIPTION_GRACE_DAYS)
  return graceUntil
}

export function getPlanMonthlySuperLikes(planId?: string | null) {
  return getSubscriptionPlan(planId).monthlySuperLikes
}

export function normalizeSubscriptionPlanId(planId?: string | null): SubscriptionPlanId {
  if (planId === "monthly") return "essential"
  if (planId === "quarterly") return "signature"
  if (planId === "yearly") return "heritage"
  if (planId === "basic" || planId === "essential" || planId === "signature" || planId === "heritage") {
    return planId
  }
  return "essential"
}

export function getPlanShortlistLimit(planId?: string | null) {
  return getSubscriptionPlan(planId).shortlistLimit
}

export function getPlanContactViewLimit(planId?: string | null) {
  return getSubscriptionPlan(planId).contactViewLimit
}

export function getPlanChatProfileLimit(planId?: string | null) {
  return getSubscriptionPlan(planId).chatProfileLimit
}
