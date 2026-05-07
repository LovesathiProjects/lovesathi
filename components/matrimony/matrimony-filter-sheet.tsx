"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { BadgeCheck, Crown, Sparkles, X } from "lucide-react"
import { LocationPreferencePicker } from "@/components/location/location-cascade-select"
import { COMMUNITY_PREFERENCE_OPTIONS } from "@/lib/matrimonyOptions"
import { FREE_VERIFIED_FILTER_MATCH_LIMIT, useVerifiedFilterAllowance } from "@/hooks/useVerifiedFilterAllowance"
import { SearchableMultiSelect } from "@/components/ui/searchable-select"

export interface FilterState {
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

interface MatrimonyFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyFilters?: (filters: FilterState) => void
}

export function MatrimonyFilterSheet({ open, onOpenChange, onApplyFilters }: MatrimonyFilterSheetProps) {
  const { canUseVerifiedFilter, loading: verifiedFilterLoading, matchCount, isPremium } = useVerifiedFilterAllowance()
  const [filters, setFilters] = useState<FilterState>({
    ageRange: [21, 35],
    heightRange: [150, 190], // in cm
    locations: [] as string[],
    educationPrefs: [] as string[],
    professionPrefs: [] as string[],
    communities: [] as string[],
    familyTypePrefs: [] as string[],
    dietPrefs: [] as string[],
    lifestylePrefs: [] as string[],
    verifiedOnly: false,
    premiumOnly: false,
  })

  const communityOptions = ["Any", ...COMMUNITY_PREFERENCE_OPTIONS]

  useEffect(() => {
    if (!canUseVerifiedFilter && filters.verifiedOnly) {
      setFilters((prev) => ({ ...prev, verifiedOnly: false }))
    }
  }, [canUseVerifiedFilter, filters.verifiedOnly])

  // Family Type options from matrimony onboarding (matrimony-preferences.tsx)
  const familyTypeOptions = [
    "Any", "Nuclear Family", "Joint Family", "Extended Family"
  ]

  // Dietary options from matrimony onboarding (Step2PersonalPhysical.tsx)
  const dietOptions = [
    "Any", "Vegetarian", "Eggetarian", "Non-vegetarian", "Pescatarian", "Vegan", "Jain", "Other"
  ]

  // Lifestyle options based on matrimony onboarding (Step2PersonalPhysical.tsx - smoker/drinker)
  const lifestyleOptions = [
    "Any", "Non-smoker", "Non-drinker", "Smoker", "Drinker"
  ]

  const handleArrayToggle = (array: string[], item: string, setter: (value: string[]) => void) => {
    if (item === "Any") {
      setter(array.includes("Any") ? [] : ["Any"])
      return
    }

    if (array.includes(item)) {
      setter(array.filter(i => i !== item))
    } else {
      setter([...array.filter(i => i !== "Any"), item])
    }
  }

  const handleReset = () => {
    setFilters({
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
  }

  const handleApply = () => {
    // Call the callback to apply filters
    if (onApplyFilters) {
      onApplyFilters(filters)
    }
    onOpenChange(false)
  }

  const verifiedFilterDescription = isPremium
    ? "Premium active. Verified-only discovery is unlocked without the free-match limit."
    : canUseVerifiedFilter
      ? `Included for your first ${FREE_VERIFIED_FILTER_MATCH_LIMIT} active matches. Current: ${matchCount}/${FREE_VERIFIED_FILTER_MATCH_LIMIT}.`
      : `Upgrade to keep verified-only discovery after ${matchCount} active matches.`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="matrimony-filter-sheet flex w-full min-w-0 flex-col overflow-hidden border-l border-[#d9b978]/24 bg-[linear-gradient(145deg,#fffdf8,#fffaf1_48%,#f8eddc)] sm:w-[520px]">
        <SheetHeader className="shrink-0 space-y-3 px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-6 sm:pt-6">
          <div className="flex min-w-0 items-center justify-between gap-3 pr-16 sm:pr-12">
            <SheetTitle className="matrimony-filter-title min-w-0 flex-1 truncate font-serif text-[1.8rem] leading-none tracking-[-0.05em] text-[#18110d] sm:text-3xl">Refine Matches</SheetTitle>
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-11 shrink-0 rounded-full border border-[#d9b978]/30 bg-white/78 px-5 text-[#18110d] shadow-[0_10px_24px_rgba(24,17,13,0.06)] hover:bg-white sm:h-12 sm:px-6">
              Reset
            </Button>
          </div>
          <SheetDescription className="text-[#6c5a4a]">Tune discovery by age, height, location, family context, and lifestyle.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-28 pt-2 sm:px-6">
          <div className="rounded-[1.7rem] border border-[#d9b978]/28 bg-white/72 p-4 shadow-[0_18px_52px_rgba(24,17,13,0.08)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d9b978]/36 bg-[#fff7e8] text-[#8f001c] shadow-inner">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="luxe-kicker text-[0.62rem] text-[#8f001c]">premium discovery suite</p>
                <p className="mt-1 text-sm leading-6 text-[#6c5a4a]">Filter with intention, then keep the experience calm and family-ready.</p>
              </div>
            </div>
          </div>

          {/* Age Range */}
          <div className="space-y-4">
            <Label className="text-black">
              Age range: {filters.ageRange[0]} - {filters.ageRange[1]} years
            </Label>
            <Slider
              value={filters.ageRange}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, ageRange: value as [number, number] }))}
              max={60}
              min={18}
              step={1}
              className="w-full"
            />
          </div>

          <Separator className="bg-[#E5E5E5]" />

          {/* Height Range */}
          <div className="space-y-4">
            <Label className="text-black">
              Height range: {filters.heightRange[0]} - {filters.heightRange[1]} cm
            </Label>
            <Slider
              value={filters.heightRange}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, heightRange: value as [number, number] }))}
              max={250}
              min={90}
              step={1}
              className="w-full"
            />
          </div>

          <Separator className="bg-[#E5E5E5]" />

          {/* Locations */}
          <div className="space-y-4">
            <LocationPreferencePicker
              value={filters.locations}
              onChange={(locations) => setFilters((prev) => ({ ...prev, locations }))}
              label="Location Preferences"
            />
          </div>

          <Separator className="bg-[#E5E5E5]" />

          {/* Advanced Filters - Premium */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-black">Advanced Filters</h3>
              <Badge variant="secondary" className="text-xs bg-gray-100 text-black border-[#E5E5E5]">Premium</Badge>
            </div>

            {/* Community Preferences */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-black">Community/Caste Preferences</h4>
                <span className="text-sm text-[#444444]">{filters.communities.length} selected</span>
              </div>
              <SearchableMultiSelect
                values={filters.communities}
                onValuesChange={(communities) => setFilters((prev) => ({ ...prev, communities }))}
                options={communityOptions.map((community) => ({ value: community, label: community }))}
                placeholder="Select preferred communities"
                searchPlaceholder="Search community, caste, or denomination..."
                emptyMessage="No community found."
              />
            </div>

            <Separator className="bg-[#E5E5E5]" />

            {/* Family Type Preferences */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-black">Family Type Preferences</h4>
                <span className="text-sm text-[#444444]">{filters.familyTypePrefs.length} selected</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {familyTypeOptions.map((familyType) => (
                  <Badge
                    key={familyType}
                    variant={filters.familyTypePrefs.includes(familyType) ? "default" : "outline"}
                    className={filters.familyTypePrefs.includes(familyType) 
                      ? "cursor-pointer bg-[#97011A] text-white border-[#97011A]/50 hover:bg-[#7A0115]" 
                      : "cursor-pointer bg-gray-100 border-[#E5E5E5] text-black hover:bg-gray-200"}
                    onClick={() => handleArrayToggle(filters.familyTypePrefs, familyType, (value) => setFilters(prev => ({ ...prev, familyTypePrefs: value })))}
                  >
                    {familyType}
                    {filters.familyTypePrefs.includes(familyType) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator className="bg-[#E5E5E5]" />

          {/* Dietary Preferences */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-black">Dietary Preferences</h3>
              <span className="text-sm text-[#444444]">{filters.dietPrefs.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {dietOptions.map((diet) => (
                <Badge
                  key={diet}
                  variant={filters.dietPrefs.includes(diet) ? "default" : "outline"}
                  className={filters.dietPrefs.includes(diet) 
                    ? "cursor-pointer bg-[#97011A] text-white border-[#97011A]/50 hover:bg-[#7A0115]" 
                    : "cursor-pointer bg-gray-100 border-[#E5E5E5] text-black hover:bg-gray-200"}
                  onClick={() => handleArrayToggle(filters.dietPrefs, diet, (value) => setFilters(prev => ({ ...prev, dietPrefs: value })))}
                >
                  {diet}
                  {filters.dietPrefs.includes(diet) && <X className="w-3 h-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-[#E5E5E5]" />

          {/* Lifestyle Preferences */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-black">Lifestyle Preferences</h3>
              <span className="text-sm text-[#444444]">{filters.lifestylePrefs.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {lifestyleOptions.map((lifestyle) => (
                <Badge
                  key={lifestyle}
                  variant={filters.lifestylePrefs.includes(lifestyle) ? "default" : "outline"}
                  className={filters.lifestylePrefs.includes(lifestyle) 
                    ? "cursor-pointer bg-[#97011A] text-white border-[#97011A]/50 hover:bg-[#7A0115]" 
                    : "cursor-pointer bg-gray-100 border-[#E5E5E5] text-black hover:bg-gray-200"}
                  onClick={() => handleArrayToggle(filters.lifestylePrefs, lifestyle, (value) => setFilters(prev => ({ ...prev, lifestylePrefs: value })))}
                >
                  {lifestyle}
                  {filters.lifestylePrefs.includes(lifestyle) && <X className="w-3 h-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-[#E5E5E5]" />

          {/* Account Type */}
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-bold tracking-[-0.05em] text-[#18110d]">Account Type</h3>
            <div className="space-y-3">
              <div className="rounded-[1.6rem] border border-[#d9b978]/30 bg-white/78 p-4 shadow-[0_18px_48px_rgba(24,17,13,0.07)]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8f001c]/10 text-[#8f001c]">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Label htmlFor="verified-only" className="text-base font-bold text-[#18110d]">Verified profiles only</Label>
                        {isPremium && <Badge className="border-[#d9b978]/40 bg-[#fff7e8] text-[#8f001c]">Premium</Badge>}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#6c5a4a]">{verifiedFilterDescription}</p>
                    </div>
                  </div>
                  <Switch
                    id="verified-only"
                    className="h-7 w-12 data-[state=checked]:bg-[linear-gradient(135deg,#8f001c,#b9904d)]"
                    checked={filters.verifiedOnly}
                    disabled={verifiedFilterLoading || !canUseVerifiedFilter}
                    onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, verifiedOnly: checked }))}
                  />
                </div>
              </div>
              <div className="rounded-[1.6rem] border border-[#482b1a]/10 bg-white/52 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d9b978]/18 text-[#8a641f]">
                      <Crown className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <Label htmlFor="premium-only" className="text-base font-bold text-[#18110d]">Premium members only</Label>
                      <p className="mt-1 text-xs leading-5 text-[#6c5a4a]">Queued until member entitlement display is connected.</p>
                    </div>
                  </div>
                  <Switch
                    id="premium-only"
                    className="h-7 w-12"
                    checked={false}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <div className="shrink-0 border-t border-[#482b1a]/10 bg-[#fffdf8]/94 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-6 sm:py-5">
          <Button onClick={handleApply} className="luxe-button w-full rounded-full" size="lg">
            Apply Matrimony Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
