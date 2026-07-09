"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StaticBackground } from "@/components/discovery/static-background"
import { ArrowLeft, Crown, Lock, Sparkles } from "lucide-react"
import { type AppliedPricingDiscount } from "@/lib/pricingDiscounts"
import { supabase } from "@/lib/supabaseClient"
import { getSubscriptionPlan } from "@/lib/subscriptionPlans"

type PricingPlan = {
  planId: string
  planName?: string
  durationLabel: string
  priceLabel: string
  priceAmount: number | null
  currency?: string | null
  basePriceLabel?: string
  effectivePriceLabel?: string
  discountSavingsLabel?: string | null
  appliedDiscount?: AppliedPricingDiscount | null
}

export function PaymentScreen({ planId, onCancel }: { planId: string; onSuccess?: () => void; onCancel?: () => void }) {
  const plan = getSubscriptionPlan(planId)
  const [pricingPlan, setPricingPlan] = useState<PricingPlan | null>(null)

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

      const currentPlan = (payload.plans || []).find((item: PricingPlan) => item.planId === plan.id)
      setPricingPlan(currentPlan || null)
    }

    void loadPricing()

    return () => {
      cancelled = true
    }
  }, [plan.id])

  const displayPrice = pricingPlan?.effectivePriceLabel || pricingPlan?.priceLabel || plan.priceLabel
  const basePrice = pricingPlan?.basePriceLabel || pricingPlan?.priceLabel || plan.priceLabel
  const appliedDiscount = pricingPlan?.appliedDiscount || null
  const hasDiscountedPrice = Boolean(appliedDiscount && displayPrice !== basePrice)
  const discountLabel = appliedDiscount?.source === "private" ? "Private offer" : "Published offer"

  return (
    <div className="luxe-light-page relative flex h-full min-h-screen flex-col">
      <StaticBackground />
      <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto p-6">
        <Card className="luxe-card w-full max-w-2xl rounded-[2rem] border-[#E83262]/24">
          <CardHeader>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E83262] text-white shadow-xl">
              <Crown className="h-7 w-7" />
            </div>
            <p className="luxe-kicker mb-3 text-[#E83262]">secure checkout</p>
            <CardTitle className="font-serif text-4xl tracking-[-0.05em] text-[#26364A] sm:text-5xl">
              {plan.name} checkout is ready for gateway connection.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-base leading-7 text-[#6F7C8B]">
              The selected plan is <span className="font-bold text-[#26364A]">{plan.name}</span> for{" "}
              <span className="font-bold text-[#26364A]">{displayPrice}</span>. Before launch, this screen should be connected to a real payment provider with subscriptions,
              invoices, refunds, and webhook-based entitlement updates. Until then, Lovesathi will not collect card details.
            </p>
            {appliedDiscount && (
              <div className="rounded-[1.5rem] border border-[#E83262]/20 bg-[#FFF4F7] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E83262]">{discountLabel}</p>
                    <p className="mt-1 font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">
                      {displayPrice}
                    </p>
                    {hasDiscountedPrice && (
                      <p className="mt-1 text-sm font-semibold text-[#8A96A6]">
                        Original price <span className="line-through">{basePrice}</span>
                      </p>
                    )}
                  </div>
                  <Badge className="rounded-full bg-[#E83262] px-3 py-1 text-white">
                    {appliedDiscount.discountPercent}% off
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#6F7C8B]">
                  {appliedDiscount.title}
                  {pricingPlan?.discountSavingsLabel ? ` - You save ${pricingPlan.discountSavingsLabel}.` : "."}
                </p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-[#482b1a]/10 bg-white/62 p-4">
                <Lock className="mb-3 h-5 w-5 text-[#E83262]" />
                <p className="font-bold text-[#26364A]">No dummy card capture</p>
                <p className="mt-1 text-sm leading-6 text-[#6F7C8B]">Safer for approval and user trust.</p>
              </div>
              <div className="rounded-3xl border border-[#482b1a]/10 bg-white/62 p-4">
                <Sparkles className="mb-3 h-5 w-5 text-[#E83262]" />
                <p className="font-bold text-[#26364A]">Gateway-ready next</p>
                <p className="mt-1 text-sm leading-6 text-[#6F7C8B]">Razorpay, Stripe, or Cashfree can be wired here.</p>
              </div>
            </div>
            <Button className="luxe-button w-full rounded-full" onClick={() => onCancel?.()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to premium plans
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
