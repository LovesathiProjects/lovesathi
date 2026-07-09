export type PricingPlanInput = {
  planId: string
  planName?: string
  durationLabel: string
  durationDays?: number | null
  priceLabel: string
  priceAmount: number | null
  currency?: string | null
  isActive?: boolean
  displayOrder?: number | null
}

export type PricingBannerInput = {
  id: string
  title: string
  discountPercent: number
  planIds: string[]
}

export type UserDiscountInput = {
  id: string
  planId: string | null
  title: string
  discountPercent: number
}

export type AppliedPricingDiscount = {
  id: string
  title: string
  discountPercent: number
  source: "published" | "private"
}

export type EffectivePricingPlan<TPlan extends PricingPlanInput = PricingPlanInput> = TPlan & {
  basePriceLabel: string
  basePriceAmount: number | null
  effectivePriceLabel: string
  effectivePriceAmount: number | null
  discountSavingsLabel: string | null
  discountSavingsAmount: number | null
  appliedDiscount: AppliedPricingDiscount | null
}

export function parsePriceAmount(priceLabel?: string | null) {
  const amount = Number(String(priceLabel || "").replace(/[^0-9]/g, ""))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function formatPriceLabel(amount: number, currency = "INR") {
  return `${currency} ${amount.toLocaleString("en-IN")}`
}

export function normalizeDiscountPercent(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 0
  return Math.max(0, Math.min(100, Math.round(amount)))
}

function isPublicOfferForPlan(offer: PricingBannerInput, planId: string) {
  return !offer.planIds.length || offer.planIds.includes(planId)
}

function isPrivateOfferForPlan(offer: UserDiscountInput, planId: string) {
  return !offer.planId || offer.planId === planId
}

export function resolveAppliedDiscount(
  planId: string,
  banners: PricingBannerInput[],
  privateDiscounts: UserDiscountInput[],
) {
  const candidates: AppliedPricingDiscount[] = [
    ...privateDiscounts
      .filter((discount) => isPrivateOfferForPlan(discount, planId))
      .map((discount) => ({
        id: discount.id,
        title: discount.title || "Private discount",
        discountPercent: normalizeDiscountPercent(discount.discountPercent),
        source: "private" as const,
      })),
    ...banners
      .filter((banner) => isPublicOfferForPlan(banner, planId))
      .map((banner) => ({
        id: banner.id,
        title: banner.title || "Published offer",
        discountPercent: normalizeDiscountPercent(banner.discountPercent),
        source: "published" as const,
      })),
  ].filter((discount) => discount.discountPercent > 0)

  return candidates.sort((first, second) => {
    if (second.discountPercent !== first.discountPercent) {
      return second.discountPercent - first.discountPercent
    }
    return first.source === "private" ? -1 : 1
  })[0] || null
}

export function getDiscountedAmount(priceAmount: number, discountPercent: number) {
  return Math.max(0, Math.round((priceAmount * (100 - discountPercent)) / 100))
}

export function applyDiscountToPlan<TPlan extends PricingPlanInput>(
  plan: TPlan,
  banners: PricingBannerInput[],
  privateDiscounts: UserDiscountInput[] = [],
): EffectivePricingPlan<TPlan> {
  const currency = plan.currency || "INR"
  const basePriceLabel = plan.priceLabel
  const basePriceAmount = plan.priceAmount ?? parsePriceAmount(basePriceLabel)
  const appliedDiscount = resolveAppliedDiscount(plan.planId, banners, privateDiscounts)
  const effectivePriceAmount =
    basePriceAmount !== null && appliedDiscount
      ? getDiscountedAmount(basePriceAmount, appliedDiscount.discountPercent)
      : basePriceAmount
  const effectivePriceLabel =
    effectivePriceAmount !== null ? formatPriceLabel(effectivePriceAmount, currency) : basePriceLabel
  const discountSavingsAmount =
    basePriceAmount !== null && effectivePriceAmount !== null && appliedDiscount
      ? Math.max(0, basePriceAmount - effectivePriceAmount)
      : null

  return {
    ...plan,
    basePriceLabel,
    basePriceAmount,
    effectivePriceLabel,
    effectivePriceAmount,
    discountSavingsLabel:
      discountSavingsAmount !== null ? formatPriceLabel(discountSavingsAmount, currency) : null,
    discountSavingsAmount,
    appliedDiscount,
  }
}

export function applyDiscountsToPlans<TPlan extends PricingPlanInput>(
  plans: TPlan[],
  banners: PricingBannerInput[],
  privateDiscounts: UserDiscountInput[] = [],
) {
  return plans.map((plan) => applyDiscountToPlan(plan, banners, privateDiscounts))
}
