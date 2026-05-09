"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StaticBackground } from "@/components/discovery/static-background"
import { ArrowLeft, Crown, Lock, Sparkles } from "lucide-react"
import { getSubscriptionPlan } from "@/lib/subscriptionPlans"

export function PaymentScreen({ planId, onCancel }: { planId: string; onSuccess?: () => void; onCancel?: () => void }) {
  const plan = getSubscriptionPlan(planId)

  return (
    <div className="luxe-light-page relative flex h-full min-h-screen flex-col">
      <StaticBackground />
      <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto p-6">
        <Card className="luxe-card w-full max-w-2xl rounded-[2rem] border-[#C2A574]/24">
          <CardHeader>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#C2A574] text-[#3A2B24] shadow-xl">
              <Crown className="h-7 w-7" />
            </div>
            <p className="luxe-kicker mb-3 text-[#C2A574]">secure checkout</p>
            <CardTitle className="font-serif text-4xl tracking-[-0.05em] text-[#3A2B24] sm:text-5xl">
              {plan.name} checkout is ready for gateway connection.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-base leading-7 text-[#8B7B70]">
              The selected plan is <span className="font-bold text-[#3A2B24]">{plan.name}</span> for{" "}
              <span className="font-bold text-[#3A2B24]">{plan.priceLabel}</span> with the 70% forever discount. Before launch, this screen should be connected to a real payment provider with subscriptions,
              invoices, refunds, and webhook-based entitlement updates. Until then, Lovesathi will not collect card details.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-[#482b1a]/10 bg-white/62 p-4">
                <Lock className="mb-3 h-5 w-5 text-[#C2A574]" />
                <p className="font-bold text-[#3A2B24]">No dummy card capture</p>
                <p className="mt-1 text-sm leading-6 text-[#8B7B70]">Safer for approval and user trust.</p>
              </div>
              <div className="rounded-3xl border border-[#482b1a]/10 bg-white/62 p-4">
                <Sparkles className="mb-3 h-5 w-5 text-[#C2A574]" />
                <p className="font-bold text-[#3A2B24]">Gateway-ready next</p>
                <p className="mt-1 text-sm leading-6 text-[#8B7B70]">Razorpay, Stripe, or Cashfree can be wired here.</p>
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
