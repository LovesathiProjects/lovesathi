"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Crown, Eye, MessageCircle, Zap, Star, Check, ArrowLeft, Headphones, HeartHandshake } from "lucide-react"
import { cn } from "@/lib/utils"
import { getUserEntitlementStatus, type EntitlementStatus } from "@/lib/planLimits"
import { applyDiscountToPlan, type AppliedPricingDiscount } from "@/lib/pricingDiscounts"
import { supabase } from "@/lib/supabaseClient"
import { getSubscriptionPlan, SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans"

type PricingPlan = {
  planId: string
  durationLabel: string
  priceLabel: string
  priceAmount: number | null
  currency?: string | null
  basePriceLabel?: string
  effectivePriceLabel?: string
  discountSavingsLabel?: string | null
  appliedDiscount?: AppliedPricingDiscount | null
}

type PricingBanner = {
  id: string
  title: string
  bannerText: string
  bannerImageUrl: string | null
  discountPercent: number
  planIds: string[]
}

type UserDiscount = {
  id: string
  planId: string | null
  title: string
  discountPercent: number
}

const premiumFeatures = [
  {
    icon: Star,
    title: "Super Likes",
    description: "Send standout interest with plan-based monthly Super Like allowances",
  },
  {
    icon: Eye,
    title: "Contact Reveal",
    description: "Reveal masked phone numbers with plan-based contact view limits",
  },
  {
    icon: Zap,
    title: "Priority Discovery",
    description: "Stand out respectfully in high-intent discovery moments",
  },
  {
    icon: Star,
    title: "Profile Polish",
    description: "Prompts and signals that make your profile feel complete",
  },
  {
    icon: MessageCircle,
    title: "Controlled Conversations",
    description: "Chat access scales by plan, with unlimited chat on higher tiers",
  },
  {
    icon: Headphones,
    title: "Concierge Support",
    description: "Heritage includes an assigned Relationship Executive for guided matching",
  },
]

function formatEntitlementDate(value?: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value))
}

export function PremiumScreen({ onPlanSelect, onSubscribe, onBack }: { onPlanSelect?: (planId: string) => void; onSubscribe?: (planId: string) => void; onBack?: () => void; mode?: 'matrimony' }) {
  const [selectedPlan, setSelectedPlan] = useState<string>("basic")
  const [entitlement, setEntitlement] = useState<EntitlementStatus | null>(null)
  const [pricingPlans, setPricingPlans] = useState<Record<string, PricingPlan>>({})
  const [pricingBanners, setPricingBanners] = useState<PricingBanner[]>([])
  const [userDiscounts, setUserDiscounts] = useState<UserDiscount[]>([])
  const isMatrimony = true
  const activePlan = entitlement?.planId ? getSubscriptionPlan(entitlement.planId) : null
  const displayPlans = SUBSCRIPTION_PLANS.map((plan) => {
    const pricing = pricingPlans[plan.id]
    const effectivePricing = pricing?.effectivePriceLabel
      ? pricing
      : applyDiscountToPlan(
          {
            planId: plan.id,
            planName: plan.name,
            durationLabel: pricing?.durationLabel || plan.durationLabel,
            durationDays: plan.durationDays,
            priceLabel: pricing?.priceLabel || plan.priceLabel,
            priceAmount: pricing?.priceAmount ?? null,
            currency: pricing?.currency || "INR",
          },
          pricingBanners,
          userDiscounts,
        )

    return {
      ...plan,
      durationLabel: effectivePricing.durationLabel || plan.durationLabel,
      priceLabel: effectivePricing.effectivePriceLabel || effectivePricing.priceLabel,
      basePriceLabel: effectivePricing.basePriceLabel || effectivePricing.priceLabel,
      appliedDiscount: effectivePricing.appliedDiscount || null,
      discountSavingsLabel: effectivePricing.discountSavingsLabel || null,
    }
  })

  useEffect(() => {
    let cancelled = false

    async function loadEntitlement() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return
      const status = await getUserEntitlementStatus(user.id)
      if (!cancelled) setEntitlement(status)
    }

    void loadEntitlement()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPricing() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch("/api/pricing", {
        cache: "no-store",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (!response.ok) return
      const payload = await response.json()
      if (cancelled) return

      const planMap: Record<string, PricingPlan> = {}
      ;(payload.plans || []).forEach((plan: PricingPlan) => {
        planMap[plan.planId] = plan
      })
      setPricingPlans(planMap)
      setPricingBanners(payload.banners || [])
      setUserDiscounts(payload.userDiscounts || [])
    }

    void loadPricing()

    return () => {
      cancelled = true
    }
  }, [])

  const activeBanner = pricingBanners[0]

  return (
    <div className={cn("relative min-h-[100dvh] w-full max-w-full overflow-x-hidden", isMatrimony ? "luxe-light-page" : "bg-[#0E0F12]")}>
      {/* Header */}
      <div className={cn(
        "sticky top-0 z-10 border-b shadow-lg",
        isMatrimony
          ? "border-[#E5E5E5] bg-white"
          : "backdrop-blur-xl border-white/20 bg-[#14161B]/50"
      )}>
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:p-4">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "p-2 rounded-full border",
                isMatrimony
                  ? "hover:bg-gray-50 bg-white border-[#E5E5E5]"
                  : "hover:bg-white/10 bg-white/10 backdrop-blur-xl border-white/20"
              )}
              onClick={onBack}
            >
              <ArrowLeft className={cn("h-4 w-4 sm:mr-2", isMatrimony ? "text-black" : "text-white")} />
              <span className={cn("hidden sm:inline", isMatrimony ? "text-black" : "text-white")}>Back</span>
            </Button>
          )}
          {!onBack && <div className="w-10 sm:w-16"></div>}
          <h1 className={cn("min-w-0 truncate text-center font-serif text-2xl font-bold tracking-[-0.05em] sm:text-3xl", isMatrimony ? "text-[#26364A]" : "text-white")}>Lovesathi Premium</h1>
          <div className="w-10 sm:w-16"></div>
        </div>
      </div>

      <div className="overflow-x-hidden overflow-y-auto">
        {/* Hero Section */}
        <div className={cn(
          "w-full overflow-hidden bg-gradient-to-br from-[#26364A] via-[#5f0012] to-[#E83262] px-4 py-8 text-[#ffffff] shadow-[0_26px_80px_rgba(24,17,13,0.28)] sm:p-8",
          isMatrimony ? "" : "glass-apple"
        )}>
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <div className="flex justify-center">
              <Crown className="h-12 w-12 fill-current sm:h-16 sm:w-16" />
            </div>
            <div>
              <p className="luxe-kicker mb-3 text-[#E83262]">premium matrimony</p>
              <h1 className="mx-auto max-w-[18rem] font-serif text-4xl font-bold leading-[0.96] tracking-[-0.05em] text-[#ffffff] sm:max-w-2xl sm:text-5xl">
                A more intentional path to the right family.
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#f0d6a4] sm:text-lg">
                Unlock refined discovery, richer signals, and priority trust features without turning matrimony into noise.
              </p>
              <Badge className="mx-auto mt-4 max-w-full whitespace-normal rounded-full border border-[#E83262]/40 bg-[#ffffff]/14 px-4 py-2 text-center text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#fff7df] sm:text-sm sm:tracking-[0.18em]">
                Real prices, admin-approved offers only
              </Badge>
              {entitlement?.isPremium && activePlan && (
                <div className="mx-auto mt-5 max-w-xl rounded-[1.4rem] border border-[#E83262]/30 bg-white/12 p-4 text-left backdrop-blur-xl">
                  <p className="luxe-kicker text-[#E83262]">{entitlement.paymentDue ? "renewal payment due" : "currently active"}</p>
                  <p className="mt-1 font-serif text-2xl font-bold tracking-[-0.04em] text-white">{activePlan.name}</p>
                  <p className="mt-1 text-sm text-[#f2dfbd]">
                    {entitlement.paymentDue
                      ? `Premium continues during grace. Renew before ${formatEntitlementDate(entitlement.graceUntil || entitlement.accessUntil) || "the grace period ends"} to avoid automatic cancellation.`
                      : entitlement.daysRemaining === null
                      ? "Premium access is active."
                      : `${entitlement.daysRemaining} day${entitlement.daysRemaining === 1 ? "" : "s"} remaining.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Features Section */}
        <div className={cn("mx-auto w-full max-w-7xl space-y-6 px-5 py-6 sm:p-6", isMatrimony ? "bg-white/0" : "")}>
          <div className="space-y-4">
            <h2 className={cn("text-center font-serif text-4xl font-bold tracking-[-0.05em] sm:text-5xl", isMatrimony ? "text-[#26364A]" : "text-white")}>Premium Features</h2>
            <div className="grid min-w-0 gap-4">
              {premiumFeatures.map((feature, index) => (
                <div key={feature.title}>
                  <div className="flex min-w-0 items-start gap-4">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      isMatrimony ? "bg-[#E83262]/10" : "bg-[#E83262]/10"
                    )}>
                      <feature.icon className="w-5 h-5" style={{ color: '#E83262' }} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className={cn("font-semibold", isMatrimony ? "text-black" : "text-white")}>{feature.title}</h3>
                      <p className={cn("text-sm leading-6", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>{feature.description}</p>
                    </div>
                  </div>
                  {isMatrimony && index < premiumFeatures.length - 1 && (
                    <Separator className="bg-[#E5E5E5] mt-4" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator className={cn(isMatrimony ? "bg-[#E5E5E5]" : "bg-white/20")} />

          {/* Plans Section */}
          <div className="space-y-4">
            <div className="text-center">
              <p className="luxe-kicker text-[0.68rem] text-[#E83262]">premium plans</p>
              <h2 className={cn("font-serif text-4xl font-bold tracking-[-0.05em]", isMatrimony ? "text-[#26364A]" : "text-white")}>Choose Your Plan</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#6F7C8B]">
                Prices shown are the active Lovesathi plan prices. Any seasonal or private discount appears only when the admin team publishes one.
              </p>
            </div>
            {activeBanner && (
              <div className="overflow-hidden rounded-[1.5rem] border border-[#E83262]/28 bg-[#FFF4F7] text-[#26364A] shadow-[0_18px_55px_rgba(24,17,13,0.08)]">
                {activeBanner.bannerImageUrl && <img src={activeBanner.bannerImageUrl} alt="" className="h-36 w-full object-cover" />}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="luxe-kicker text-[#E83262]">{activeBanner.discountPercent}% admin offer</p>
                      <p className="mt-1 font-serif text-2xl font-bold tracking-[-0.04em]">{activeBanner.title}</p>
                    </div>
                    <Badge variant="outline" className="border-[#E83262]/24 bg-white text-[#C3264E]">
                      {activeBanner.planIds.length ? activeBanner.planIds.join(", ") : "All plans"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#6F7C8B]">{activeBanner.bannerText}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {displayPlans.map((plan) => {
                const appliedDiscount = plan.appliedDiscount
                const hasDiscountedPrice = Boolean(appliedDiscount && plan.priceLabel !== plan.basePriceLabel)
                const discountLabel = appliedDiscount?.source === "private" ? "Private offer" : "Published offer"
                return (
                <Card
                  key={plan.id}
                  className={cn(
                    "cursor-pointer transition-all h-full flex flex-col border",
                    isMatrimony
                      ? selectedPlan === plan.id
                        ? "luxe-card ring-2 ring-[#E83262] border-[#E83262]"
                        : "luxe-card border-[#E83262]/24 hover:border-[#E83262]/50"
                      : selectedPlan === plan.id
                        ? "ring-2 ring-[#E83262] border-[#E83262] bg-[#14161B]/50"
                        : "border-white/20 bg-[#14161B]/50 hover:border-[#E83262]/50",
                    plan.popular || plan.id === "heritage" ? "relative" : ""
                  )}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-[#E83262] text-white">
                      Most Popular
                    </Badge>
                  )}
                  {plan.id === "heritage" && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-[#2b211b] text-[#fff7df]">
                      Concierge
                    </Badge>
                  )}

                  <CardHeader className="pb-3">
                    <div className="space-y-4">
                      <div>
                        <CardTitle className={cn("text-lg", isMatrimony ? "text-black" : "text-white")}>{plan.name}</CardTitle>
                        <p className={cn("text-sm", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>{plan.durationLabel}</p>
                      </div>
                      <div>
                        {hasDiscountedPrice && (
                          <div className={cn("text-sm font-semibold line-through", isMatrimony ? "text-[#8A96A6]" : "text-white/55")}>
                            {plan.basePriceLabel}
                          </div>
                        )}
                        <div className={cn("text-2xl font-bold", isMatrimony ? "text-black" : "text-white")}>{plan.priceLabel}</div>
                        {appliedDiscount && (
                          <Badge variant="secondary" className="mt-2 bg-[#E83262]/10 text-[#E83262] border-[#E83262]/20">
                            {discountLabel}: {appliedDiscount.discountPercent}% off
                          </Badge>
                        )}
                        {appliedDiscount && (
                          <p className={cn("mt-2 text-xs leading-5", isMatrimony ? "text-[#6F7C8B]" : "text-white/65")}>
                            {appliedDiscount.title}
                            {plan.discountSavingsLabel ? ` - You save ${plan.discountSavingsLabel}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 flex-1 flex flex-col">
                    <div className="space-y-2 flex-1">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-center space-x-2">
                          <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#E83262' }} />
                          <span className={cn("text-sm", isMatrimony ? "text-black" : "text-white")}>{feature}</span>
                        </div>
                      ))}
                      {plan.concierge && (
                        <div className="mt-3 rounded-2xl border border-[#E83262]/30 bg-[#fffaf0] p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <HeartHandshake className="h-4 w-4 text-[#E83262]" />
                            <p className="text-sm font-black text-[#26364A]">{plan.concierge.title}</p>
                          </div>
                          <p className="text-xs leading-5 text-[#6F7C8B]">{plan.concierge.description}</p>
                          <div className="mt-3 space-y-2">
                            {plan.concierge.highlights.map((highlight) => (
                              <p key={highlight} className="text-xs leading-5 text-[#26364A]">
                                <Check className="mr-1 inline h-3.5 w-3.5 text-[#E83262]" />
                                {highlight}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="pt-2 mt-auto">
                        <Button
                          variant={selectedPlan === plan.id ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "w-full",
                            selectedPlan === plan.id
                              ? "bg-[#E83262] hover:bg-[#C3264E] text-white border-[#E83262]"
                              : isMatrimony
                                ? "bg-white border-[#E5E5E5] hover:bg-gray-50 text-black"
                                : "bg-white/10 border-white/20 hover:bg-white/20 text-white"
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPlan(plan.id)
                            onPlanSelect?.(plan.id)
                          }}
                        >
                          {selectedPlan === plan.id ? "Selected" : "Select"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )})}
            </div>
          </div>
        </div>

        {/* Bottom Action */}
        <div className={cn(
          "border-t p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6",
          isMatrimony
            ? "border-[#E5E5E5] bg-white"
            : "border-white/20 bg-[#14161B]/50 backdrop-blur-xl"
        )}>
          <div className="space-y-4">
            <Button
              size="lg"
              className="w-full bg-[#E83262] hover:bg-[#C3264E] text-white border-[#E83262]"
              onClick={() => onSubscribe?.(selectedPlan)}
            >
              <Crown className="w-5 h-5 mr-2" style={{ color: '#FFFFFF' }} />
              {entitlement?.paymentDue
                ? `Renew ${activePlan?.name || "premium"}`
                : entitlement?.isPremium
                  ? "Manage premium plan"
                  : `Subscribe to ${getSubscriptionPlan(selectedPlan).name}`}
            </Button>

            <div className="text-center space-y-2">
              <p className={cn("text-xs", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>
                Checkout is gateway-ready. No card details are collected until payment provider integration is connected.
              </p>
              <div className={cn("flex items-center justify-center space-x-4 text-xs", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>
                <Link href="/terms" className={cn("underline transition-colors", isMatrimony ? "hover:text-black" : "hover:text-white")}>Terms of Service</Link>
                <Link href="/privacy" className={cn("underline transition-colors", isMatrimony ? "hover:text-black" : "hover:text-white")}>Privacy Policy</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
