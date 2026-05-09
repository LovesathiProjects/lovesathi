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
import { supabase } from "@/lib/supabaseClient"
import { getSubscriptionPlan, SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans"

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
  const [selectedPlan, setSelectedPlan] = useState<string>("essential")
  const [entitlement, setEntitlement] = useState<EntitlementStatus | null>(null)
  const isMatrimony = true
  const activePlan = entitlement?.planId ? getSubscriptionPlan(entitlement.planId) : null

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

  return (
    <div className={cn("relative min-h-screen", isMatrimony ? "luxe-light-page" : "bg-[#0E0F12]")}>
      {/* Header */}
      <div className={cn(
        "sticky top-0 border-b shadow-lg z-10",
        isMatrimony
          ? "border-[#E5E5E5] bg-white"
          : "backdrop-blur-xl border-white/20 bg-[#14161B]/50"
      )}>
        <div className="flex items-center justify-between p-4">
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
              <ArrowLeft className={cn("w-4 h-4 mr-2", isMatrimony ? "text-black" : "text-white")} />
              <span className={cn(isMatrimony ? "text-black" : "text-white")}>Back</span>
            </Button>
          )}
          {!onBack && <div className="w-16"></div>}
          <h1 className={cn("font-serif text-3xl font-bold tracking-[-0.05em]", isMatrimony ? "text-[#3A2B24]" : "text-white")}>Lovesathi Signature</h1>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="overflow-y-auto">
        {/* Hero Section */}
        <div className={cn(
          "bg-gradient-to-br from-[#3A2B24] via-[#5f0012] to-[#C2A574] p-8 text-[#ffffff] shadow-[0_26px_80px_rgba(24,17,13,0.28)]",
          isMatrimony ? "" : "glass-apple"
        )}>
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Crown className="w-16 h-16 fill-current" />
            </div>
            <div>
              <p className="luxe-kicker mb-3 text-[#C2A574]">premium matrimony</p>
              <h1 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#ffffff]">A more intentional path to the right family.</h1>
              <p className="mx-auto mt-4 max-w-xl text-[#C2A574]">Unlock refined discovery, richer signals, and priority trust features without turning matrimony into noise.</p>
              <Badge className="mt-4 border border-[#C2A574]/40 bg-[#ffffff]/14 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#fff7df]">
                Every plan includes 70% off forever
              </Badge>
              {entitlement?.isPremium && activePlan && (
                <div className="mx-auto mt-5 max-w-xl rounded-[1.4rem] border border-[#C2A574]/30 bg-white/12 p-4 text-left backdrop-blur-xl">
                  <p className="luxe-kicker text-[#C2A574]">{entitlement.paymentDue ? "renewal payment due" : "currently active"}</p>
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
        <div className={cn("p-6 space-y-6", isMatrimony ? "bg-white" : "")}>
          <div className="space-y-4">
            <h2 className={cn("text-center font-serif text-4xl font-bold tracking-[-0.05em]", isMatrimony ? "text-[#3A2B24]" : "text-white")}>Premium Features</h2>
            <div className="grid gap-4">
              {premiumFeatures.map((feature, index) => (
                <div key={feature.title}>
                  <div className="flex items-start space-x-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      isMatrimony ? "bg-[#C2A574]/10" : "bg-[#C2A574]/10"
                    )}>
                      <feature.icon className="w-5 h-5" style={{ color: '#C2A574' }} />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className={cn("font-semibold", isMatrimony ? "text-black" : "text-white")}>{feature.title}</h3>
                      <p className={cn("text-sm", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>{feature.description}</p>
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
              <p className="luxe-kicker text-[0.68rem] text-[#C2A574]">launch offer</p>
              <h2 className={cn("font-serif text-4xl font-bold tracking-[-0.05em]", isMatrimony ? "text-[#3A2B24]" : "text-white")}>Choose Your Plan</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#8B7B70]">
                The 70% launch discount is locked forever for every tier. Upgrade later if your search needs more contact reveals, shortlist capacity, or concierge support.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <Card
                  key={plan.id}
                  className={cn(
                    "cursor-pointer transition-all h-full flex flex-col border",
                    isMatrimony
                      ? selectedPlan === plan.id
                        ? "luxe-card ring-2 ring-[#C2A574] border-[#C2A574]"
                        : "luxe-card border-[#C2A574]/24 hover:border-[#C2A574]/50"
                      : selectedPlan === plan.id
                        ? "ring-2 ring-[#C2A574] border-[#C2A574] bg-[#14161B]/50"
                        : "border-white/20 bg-[#14161B]/50 hover:border-[#C2A574]/50",
                    plan.popular || plan.id === "heritage" ? "relative" : ""
                  )}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-[#C2A574] text-[#3A2B24]">
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
                        <div className={cn("text-2xl font-bold", isMatrimony ? "text-black" : "text-white")}>{plan.priceLabel}</div>
                        {plan.originalPriceLabel && (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <div className={cn("text-sm line-through", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>{plan.originalPriceLabel}</div>
                            <Badge variant="secondary" className="text-xs bg-[#C2A574]/10 text-[#C2A574] border-[#C2A574]/20">
                              {plan.discountLabel}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 flex-1 flex flex-col">
                    <div className="space-y-2 flex-1">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-center space-x-2">
                          <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#C2A574' }} />
                          <span className={cn("text-sm", isMatrimony ? "text-black" : "text-white")}>{feature}</span>
                        </div>
                      ))}
                      {plan.concierge && (
                        <div className="mt-3 rounded-2xl border border-[#C2A574]/30 bg-[#fffaf0] p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <HeartHandshake className="h-4 w-4 text-[#C2A574]" />
                            <p className="text-sm font-black text-[#3A2B24]">{plan.concierge.title}</p>
                          </div>
                          <p className="text-xs leading-5 text-[#8B7B70]">{plan.concierge.description}</p>
                          <div className="mt-3 space-y-2">
                            {plan.concierge.highlights.map((highlight) => (
                              <p key={highlight} className="text-xs leading-5 text-[#3A2B24]">
                                <Check className="mr-1 inline h-3.5 w-3.5 text-[#C2A574]" />
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
                              ? "bg-[#C2A574] hover:bg-[#B9975E] text-[#3A2B24] border-[#C2A574]"
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
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Action */}
        <div className={cn(
          "p-6 border-t",
          isMatrimony
            ? "border-[#E5E5E5] bg-white"
            : "border-white/20 bg-[#14161B]/50 backdrop-blur-xl"
        )}>
          <div className="space-y-4">
            <Button
              size="lg"
              className="w-full bg-[#C2A574] hover:bg-[#B9975E] text-[#3A2B24] border-[#C2A574]"
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
