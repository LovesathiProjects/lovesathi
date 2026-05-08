export type SubscriptionPlanId = "monthly" | "quarterly" | "yearly"

export type SubscriptionPlan = {
  id: SubscriptionPlanId
  name: string
  durationLabel: string
  durationDays: number
  priceLabel: string
  originalPriceLabel?: string
  discountLabel?: string
  popular?: boolean
  features: string[]
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "monthly",
    name: "Essential",
    durationLabel: "1 month",
    durationDays: 30,
    priceLabel: "INR 999",
    features: [
      "Unlimited swipes and interests",
      "Unlimited shortlist saves",
      "Verified-only discovery after free allowance",
      "Unlimited conversations within matches",
      "See who shortlisted you",
      "Priority support queue",
    ],
  },
  {
    id: "quarterly",
    name: "Signature",
    durationLabel: "3 months",
    durationDays: 90,
    priceLabel: "INR 2,499",
    originalPriceLabel: "INR 2,997",
    discountLabel: "Save 17%",
    popular: true,
    features: [
      "Everything in Essential",
      "Priority discovery placement ready",
      "Premium-only discovery filter",
      "Family-ready profile prompts",
      "Contact intent insights ready",
      "VIP customer support",
    ],
  },
  {
    id: "yearly",
    name: "Heritage",
    durationLabel: "12 months",
    durationDays: 365,
    priceLabel: "INR 7,999",
    originalPriceLabel: "INR 11,988",
    discountLabel: "Save 33%",
    features: [
      "Everything in Signature",
      "Annual premium access",
      "Top Picks ready",
      "Advanced compatibility signals ready",
      "Priority verification review",
      "Premium support concierge",
    ],
  },
]

export function getSubscriptionPlan(planId?: string | null) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) || SUBSCRIPTION_PLANS[1]
}

export function getPlanActiveUntil(planId?: string | null, from = new Date()) {
  const plan = getSubscriptionPlan(planId)
  const activeUntil = new Date(from)
  activeUntil.setDate(activeUntil.getDate() + plan.durationDays)
  return activeUntil
}
