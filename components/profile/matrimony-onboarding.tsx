"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { MatrimonyPreferences } from "@/components/profile/matrimony-preferences"
import { useState } from "react"
import { StaticBackground } from "@/components/discovery/static-background"
import { LocationPreferencePicker } from "@/components/location/location-cascade-select"

interface MatrimonyOnboardingProps {
  onComplete?: () => void
}

export function MatrimonyOnboarding({ onComplete }: MatrimonyOnboardingProps) {
  const [step, setStep] = useState(0)
  const [preferredLocations, setPreferredLocations] = useState<string[]>([])
  const totalSteps = 2
  const progress = ((step + 1) / totalSteps) * 100

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(step + 1)
    else onComplete?.()
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <StaticBackground />
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Step {step + 1} of {totalSteps}
              </span>
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>
          <CardTitle className="text-xl">Matrimony Setup</CardTitle>
          <CardDescription>Provide your preferences for better matrimonial matches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 0 && (
            <div className="space-y-4">
              <CardTitle className="text-base">Cultural & Family Preferences</CardTitle>
              <MatrimonyPreferences />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <CardTitle className="text-base">Location & Education Preferences</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <LocationPreferencePicker
                    value={preferredLocations}
                    onChange={setPreferredLocations}
                    label="Preferred Locations"
                    allowOpenToAll
                  />
                </div>
                <div>
                  <label className="text-sm block mb-1">Education</label>
                  <input className="w-full h-10 rounded-md border bg-background px-3 text-sm" placeholder="Bachelor's, Master's, etc." />
                </div>
                <div>
                  <label className="text-sm block mb-1">Profession</label>
                  <input className="w-full h-10 rounded-md border bg-background px-3 text-sm" placeholder="e.g., Software Engineer" />
                </div>
                <div>
                  <label className="text-sm block mb-1">Age Range</label>
                  <input className="w-full h-10 rounded-md border bg-background px-3 text-sm" placeholder="e.g., 25-32" />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={handleBack} disabled={step === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button onClick={handleNext}>
              {step < totalSteps - 1 ? (
                <>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                "Finish"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
