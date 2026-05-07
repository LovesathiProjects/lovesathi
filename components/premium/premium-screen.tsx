"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Crown, Eye, MessageCircle, Zap, Star, Check, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface PremiumPlan {
  id: string
  name: string
  duration: string
  price: string
  originalPrice?: string
  discount?: string
  features: string[]
  isPopular?: boolean
}

const premiumPlans: PremiumPlan[] = [
  {
    id: "monthly",
    name: "Essential",
    duration: "1 Month",
    price: "INR 999",
    features: [
      "Unlimited profile interests",
      "See who shortlisted you",
      "Advanced partner filters",
      "Verified profile priority",
      "Read receipts",
      "Priority support queue",
    ],
  },
  {
    id: "quarterly",
    name: "Signature",
    duration: "3 Months",
    price: "INR 2,499",
    originalPrice: "INR 2,997",
    discount: "Save 17%",
    features: [
      "Everything in Essential",
      "Priority discovery placement",
      "Private photo reveal controls",
      "Contact intent insights",
      "Family-ready profile prompts",
      "VIP customer support",
    ],
    isPopular: true,
  },
  {
    id: "yearly",
    name: "Heritage",
    duration: "12 Months",
    price: "INR 7,999",
    originalPrice: "INR 11,988",
    discount: "Save 33%",
    features: [
      "Everything in Signature",
      "Top Picks feature",
      "Advanced compatibility signals",
      "Priority verification review",
      "Premium support concierge",
      "Exclusive event readiness",
    ],
  },
]

const premiumFeatures = [
  {
    icon: Star,
    title: "Unlimited Interests",
    description: "Express interest in serious profiles without daily limits",
  },
  {
    icon: Eye,
    title: "See Who Shortlisted You",
    description: "Understand who is already considering your profile",
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
    title: "Advanced Filters",
    description: "Filter by education, lifestyle, family context, and preferences",
  },
]

export function PremiumScreen({ onPlanSelect, onSubscribe, onBack }: { onPlanSelect?: (planId: string) => void; onSubscribe?: (planId: string) => void; onBack?: () => void; mode?: 'matrimony' }) {
  const [selectedPlan, setSelectedPlan] = useState<string>("quarterly")
  const isMatrimony = true

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
          <h1 className={cn("font-serif text-3xl font-bold tracking-[-0.05em]", isMatrimony ? "text-[#18110d]" : "text-white")}>Lovesathi Signature</h1>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="overflow-y-auto">
        {/* Hero Section */}
        <div className={cn(
          "bg-gradient-to-br from-[#18110d] via-[#5f0012] to-[#8f001c] p-8 text-[#ffffff] shadow-[0_26px_80px_rgba(24,17,13,0.28)]",
          isMatrimony ? "" : "glass-apple"
        )}>
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Crown className="w-16 h-16 fill-current" />
            </div>
            <div>
              <p className="luxe-kicker mb-3 text-[#d8c79f]">premium matrimony</p>
              <h1 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#ffffff]">A more intentional path to the right family.</h1>
              <p className="mx-auto mt-4 max-w-xl text-[#d8c79f]">Unlock refined discovery, richer signals, and priority trust features without turning matrimony into noise.</p>
            </div>
          </div>
        </div>
        {/* Features Section */}
        <div className={cn("p-6 space-y-6", isMatrimony ? "bg-white" : "")}>
          <div className="space-y-4">
            <h2 className={cn("text-center font-serif text-4xl font-bold tracking-[-0.05em]", isMatrimony ? "text-[#18110d]" : "text-white")}>Premium Features</h2>
            <div className="grid gap-4">
              {premiumFeatures.map((feature, index) => (
                <div key={feature.title}>
                  <div className="flex items-start space-x-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      isMatrimony ? "bg-[#97011A]/10" : "bg-[#97011A]/10"
                    )}>
                      <feature.icon className="w-5 h-5" style={{ color: '#97011A' }} />
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
            <h2 className={cn("text-center font-serif text-4xl font-bold tracking-[-0.05em]", isMatrimony ? "text-[#18110d]" : "text-white")}>Choose Your Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {premiumPlans.map((plan) => (
                <Card
                  key={plan.id}
                  className={cn(
                    "cursor-pointer transition-all h-full flex flex-col border",
                    isMatrimony
                      ? selectedPlan === plan.id
                        ? "luxe-card ring-2 ring-[#97011A] border-[#97011A]"
                        : "luxe-card border-[#d8c79f]/24 hover:border-[#97011A]/50"
                      : selectedPlan === plan.id
                        ? "ring-2 ring-[#97011A] border-[#97011A] bg-[#14161B]/50"
                        : "border-white/20 bg-[#14161B]/50 hover:border-[#97011A]/50",
                    plan.isPopular ? "relative" : ""
                  )}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.isPopular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-[#97011A] text-white">
                      Most Popular
                    </Badge>
                  )}

                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className={cn("text-lg", isMatrimony ? "text-black" : "text-white")}>{plan.name}</CardTitle>
                        <p className={cn("text-sm", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>{plan.duration}</p>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-2xl font-bold", isMatrimony ? "text-black" : "text-white")}>{plan.price}</div>
                        {plan.originalPrice && (
                          <div className="space-y-1">
                            <div className={cn("text-sm line-through", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>{plan.originalPrice}</div>
                            <Badge variant="secondary" className="text-xs bg-[#97011A]/10 text-[#97011A] border-[#97011A]/20">
                              {plan.discount}
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
                          <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#97011A' }} />
                          <span className={cn("text-sm", isMatrimony ? "text-black" : "text-white")}>{feature}</span>
                        </div>
                      ))}
                      <div className="pt-2 mt-auto">
                        <Button
                          variant={selectedPlan === plan.id ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "w-full",
                            selectedPlan === plan.id
                              ? "bg-[#97011A] hover:bg-[#7A0115] text-white border-[#97011A]"
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
              className="w-full bg-[#97011A] hover:bg-[#7A0115] text-white border-[#97011A]" 
              onClick={() => onSubscribe?.(selectedPlan)}
            >
              <Crown className="w-5 h-5 mr-2" style={{ color: '#FFFFFF' }} />
              Subscribe to {premiumPlans.find((p) => p.id === selectedPlan)?.name}
            </Button>

            <div className="text-center space-y-2">
              <p className={cn("text-xs", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>Cancel anytime. Terms and conditions apply.</p>
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
