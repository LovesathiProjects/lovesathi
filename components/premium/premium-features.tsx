"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StaticBackground } from "@/components/discovery/static-background"

export function PremiumFeatures({ onBack }: { onBack?: () => void }) {
  const features = [
    "Unlimited discovery swipes and interests",
    "Unlimited shortlist saves",
    "Verified-only filter after the free allowance",
    "Unlimited conversations within matches",
    "Premium-only discovery filter",
  ]

  return (
    <div className="min-h-screen relative">
      <StaticBackground />
      <div className="sticky top-0 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Premium Features</h1>
          <div className="w-16"></div>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Included Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {features.map((f) => (
              <div key={f} className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span>{f}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
