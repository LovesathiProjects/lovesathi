"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Users, Filter, Heart } from "lucide-react"
import { StaticBackground } from "@/components/discovery/static-background"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/hooks/use-toast"
import { LocationPreferencePicker } from "@/components/location/location-cascade-select"
import { COMMUNITY_PREFERENCE_OPTIONS } from "@/lib/matrimonyOptions"
import { FREE_VERIFIED_FILTER_MATCH_LIMIT, useVerifiedFilterAllowance } from "@/hooks/useVerifiedFilterAllowance"

interface MatrimonyPreferences {
  ageRange: [number, number]
  heightRange: [number, number]
  locations: string[]
  educationPrefs: string[]
  professionPrefs: string[]
  communities: string[]
  familyTypePrefs: string[]
  dietPrefs: string[]
  lifestylePrefs: string[]
  verifiedOnly: boolean
  premiumOnly: boolean
}

const educationOptions = [
  "Any professional degree", "MBA", "B.Tech", "MBBS", "CA", "CS", 
  "Ph.D", "Masters", "Bachelors", "Diploma", "Any"
]

const professionOptions = [
  "IT background", "Same profession", "Business", "Doctor", "Engineer", 
  "Teacher", "Government job", "Private sector", "Entrepreneur", "Any"
]

const communityOptions = ["Any", ...COMMUNITY_PREFERENCE_OPTIONS]

const familyTypeOptions = [
  "Nuclear", "Joint", "Any"
]

const dietOptions = [
  "Open to both", "Strictly vegetarian", "Non-vegetarian", "Jain vegetarian", "Any"
]

const lifestyleOptions = [
  "Non-smoker", "Non-drinker", "Occasional drinker", "Social drinker", "Any"
]

interface MatrimonyPreferencesSettingsProps {
  onBack?: () => void
}

export function MatrimonyPreferencesSettings({ onBack }: MatrimonyPreferencesSettingsProps) {
  const { canUseVerifiedFilter, loading: verifiedFilterLoading, matchCount, remainingFreeUses } = useVerifiedFilterAllowance()
  const [settings, setSettings] = useState<MatrimonyPreferences>({
    ageRange: [21, 35],
    heightRange: [150, 190],
    locations: [],
    educationPrefs: [],
    professionPrefs: [],
    communities: [],
    familyTypePrefs: [],
    dietPrefs: [],
    lifestylePrefs: [],
    verifiedOnly: false,
    premiumOnly: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadPreferences()
  }, [])

  useEffect(() => {
    if (!canUseVerifiedFilter && settings.verifiedOnly) {
      setSettings((prev) => ({ ...prev, verifiedOnly: false }))
    }
  }, [canUseVerifiedFilter, settings.verifiedOnly])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load preferences from matrimony_profile_full
      const { data: profile, error } = await supabase
        .from('matrimony_profile_full')
        .select('partner_preferences')
        .eq('user_id', user.id)
        .single()

      if (!error && profile?.partner_preferences) {
        const prefs = profile.partner_preferences as any
        setSettings({
          ageRange: [prefs.min_age || 21, prefs.max_age || 35],
          heightRange: [prefs.min_height_cm || 150, prefs.max_height_cm || 190],
          locations: prefs.locations || [],
          educationPrefs: prefs.education_prefs || [],
          professionPrefs: prefs.profession_prefs || [],
          communities: prefs.communities || [],
          familyTypePrefs: prefs.family_type_prefs || [],
          dietPrefs: prefs.diet_prefs || [],
          lifestylePrefs: prefs.lifestyle_prefs || [],
          verifiedOnly: false,
          premiumOnly: false,
        })
      }
    } catch (error) {
      console.error("Error loading preferences:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Error",
          description: "Please log in to save preferences",
          variant: "destructive",
        })
        return
      }

      const preferences = {
        min_age: settings.ageRange[0],
        max_age: settings.ageRange[1],
        min_height_cm: settings.heightRange[0],
        max_height_cm: settings.heightRange[1],
        locations: settings.locations,
        education_prefs: settings.educationPrefs,
        profession_prefs: settings.professionPrefs,
        communities: settings.communities,
        family_type_prefs: settings.familyTypePrefs,
        diet_prefs: settings.dietPrefs,
        lifestyle_prefs: settings.lifestylePrefs,
      }

      const { error } = await supabase
        .from('matrimony_profile_full')
        .update({ partner_preferences: preferences })
        .eq('user_id', user.id)

      if (error) throw error

      toast({
        title: "Preferences Saved",
        description: "Your partner preferences have been updated successfully.",
      })

      onBack?.()
    } catch (error: any) {
      console.error("Error saving preferences:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleArrayToggle = (key: keyof MatrimonyPreferences, value: string) => {
    const currentArray = settings[key] as string[]
    if (value === "Any") {
      setSettings((prev) => ({
        ...prev,
        [key]: currentArray.includes("Any") ? [] : ["Any"],
      }))
      return
    }

    setSettings((prev) => ({
      ...prev,
      [key]: currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray.filter((item) => item !== "Any"), value],
    }))
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full relative">
        <StaticBackground />
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      </div>
    )
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
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5" />
            <h1 className="text-xl font-semibold">Partner Preferences</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Age Range */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Age Range</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label className="text-sm font-medium">
              Age Range: {settings.ageRange[0]} - {settings.ageRange[1]} years
            </Label>
            <Slider
              value={settings.ageRange}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, ageRange: [value[0], value[1]] }))}
              min={18}
              max={60}
              step={1}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Height Range */}
        <Card>
          <CardHeader>
            <CardTitle>Height Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label className="text-sm font-medium">
              Height Range: {settings.heightRange[0]} - {settings.heightRange[1]} cm
            </Label>
            <Slider
              value={settings.heightRange}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, heightRange: [value[0], value[1]] }))}
              min={90}
              max={250}
              step={1}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Location Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Location Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LocationPreferencePicker
              value={settings.locations}
              onChange={(locations) => setSettings((prev) => ({ ...prev, locations }))}
              label="Preferred Cities"
            />
          </CardContent>
        </Card>

        {/* Education Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Education Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {educationOptions.map((education) => (
                <Button
                  key={education}
                  variant={settings.educationPrefs.includes(education) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleArrayToggle("educationPrefs", education)}
                >
                  {education}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Profession Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Profession Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {professionOptions.map((profession) => (
                <Button
                  key={profession}
                  variant={settings.professionPrefs.includes(profession) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleArrayToggle("professionPrefs", profession)}
                >
                  {profession}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Community Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Community/Caste Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {communityOptions.map((community) => (
                <Button
                  key={community}
                  variant={settings.communities.includes(community) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleArrayToggle("communities", community)}
                >
                  {community}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Family Type Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Family Type Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {familyTypeOptions.map((familyType) => (
                <Button
                  key={familyType}
                  variant={settings.familyTypePrefs.includes(familyType) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleArrayToggle("familyTypePrefs", familyType)}
                >
                  {familyType}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dietary Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Dietary Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {dietOptions.map((diet) => (
                <Button
                  key={diet}
                  variant={settings.dietPrefs.includes(diet) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleArrayToggle("dietPrefs", diet)}
                >
                  {diet}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lifestyle Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Lifestyle Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lifestyleOptions.map((lifestyle) => (
                <Button
                  key={lifestyle}
                  variant={settings.lifestylePrefs.includes(lifestyle) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleArrayToggle("lifestylePrefs", lifestyle)}
                >
                  {lifestyle}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Account Type Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Additional Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Verified profiles only</Label>
                <p className="text-sm text-muted-foreground">
                  {canUseVerifiedFilter
                    ? `${remainingFreeUses} of ${FREE_VERIFIED_FILTER_MATCH_LIMIT} free-match verified filters remaining`
                    : `Premium unlock required after ${matchCount} active matches`}
                </p>
              </div>
              <Switch
                checked={settings.verifiedOnly}
                disabled={verifiedFilterLoading || !canUseVerifiedFilter}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, verifiedOnly: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Premium members only</Label>
                <p className="text-sm text-muted-foreground">Show only premium members</p>
              </div>
              <Switch
                checked={settings.premiumOnly}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, premiumOnly: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button size="lg" className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  )
}
