"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Users, Filter } from "lucide-react"
import { StaticBackground } from "@/components/discovery/static-background"
import { RELIGION_OPTIONS } from "@/lib/matrimonyOptions"

interface DiscoverySettingsProps {
  onBack?: () => void
}

interface DiscoverySettings {
  ageRange: [number, number]
  maxDistance: number
  showMe: "women" | "men" | "everyone"
  onlyVerified: boolean
  onlyWithPhotos: boolean
  recentlyActive: boolean
  education: string[]
  religion: string[]
  lifestyle: string[]
}

const educationOptions = ["High School", "Bachelor's Degree", "Master's Degree", "PhD", "Trade School", "Some College"]

const religionOptions = ["Prefer not to say", ...RELIGION_OPTIONS]

const lifestyleOptions = [
  "Non-smoker",
  "Social drinker",
  "Non-drinker",
  "Vegetarian",
  "Vegan",
  "Fitness enthusiast",
  "Pet lover",
]

export function DiscoverySettings({ onBack }: DiscoverySettingsProps = {}) {
  const [settings, setSettings] = useState<DiscoverySettings>({
    ageRange: [22, 35],
    maxDistance: 50,
    showMe: "women",
    onlyVerified: false,
    onlyWithPhotos: true,
    recentlyActive: false,
    education: [],
    religion: [],
    lifestyle: [],
  })

  const handleAgeRangeChange = (value: number[]) => {
    setSettings((prev) => ({ ...prev, ageRange: [value[0], value[1]] }))
  }

  const handleDistanceChange = (value: number[]) => {
    setSettings((prev) => ({ ...prev, maxDistance: value[0] }))
  }

  const handleToggle = (key: keyof DiscoverySettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleArrayToggle = (key: "education" | "religion" | "lifestyle", value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((item) => item !== value) : [...prev[key], value],
    }))
  }

  return (
    <div className="flex flex-col h-full relative">
      <StaticBackground />
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button variant="ghost" size="sm" className="p-2" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-xl font-semibold">Discovery Settings</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Location & Age</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Age Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Age Range: {settings.ageRange[0]} - {settings.ageRange[1]}
              </Label>
              <Slider
                value={settings.ageRange}
                onValueChange={handleAgeRangeChange}
                min={18}
                max={60}
                step={1}
                className="w-full"
              />
            </div>

            <Separator />

            {/* Distance */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Maximum Distance: {settings.maxDistance} km</Label>
              <Slider
                value={[settings.maxDistance]}
                onValueChange={handleDistanceChange}
                min={1}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Show Me */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Show Me</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "women", label: "Women" },
                { value: "men", label: "Men" },
                { value: "everyone", label: "Everyone" },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={settings.showMe === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings((prev) => ({ ...prev, showMe: option.value as any }))}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Only show verified profiles</Label>
                <p className="text-sm text-muted-foreground">Profiles with photo verification</p>
              </div>
              <Switch checked={settings.onlyVerified} onCheckedChange={() => handleToggle("onlyVerified")} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Only show profiles with photos</Label>
                <p className="text-sm text-muted-foreground">Hide profiles without photos</p>
              </div>
              <Switch checked={settings.onlyWithPhotos} onCheckedChange={() => handleToggle("onlyWithPhotos")} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Recently active</Label>
                <p className="text-sm text-muted-foreground">Active in the last 7 days</p>
              </div>
              <Switch checked={settings.recentlyActive} onCheckedChange={() => handleToggle("recentlyActive")} />
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Advanced Filters</span>
              <Badge variant="secondary" className="text-xs">
                Premium
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Education */}
            <div className="space-y-3">
              <Label className="font-medium">Education</Label>
              <div className="flex flex-wrap gap-2">
                {educationOptions.map((option) => (
                  <Button
                    key={option}
                    variant={settings.education.includes(option) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleArrayToggle("education", option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Religion */}
            <div className="space-y-3">
              <Label className="font-medium">Religion</Label>
              <div className="flex flex-wrap gap-2">
                {religionOptions.map((option) => (
                  <Button
                    key={option}
                    variant={settings.religion.includes(option) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleArrayToggle("religion", option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Lifestyle */}
            <div className="space-y-3">
              <Label className="font-medium">Lifestyle</Label>
              <div className="flex flex-wrap gap-2">
                {lifestyleOptions.map((option) => (
                  <Button
                    key={option}
                    variant={settings.lifestyle.includes(option) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleArrayToggle("lifestyle", option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button size="lg" className="w-full">
          Save Settings
        </Button>
      </div>
    </div>
  )
}
