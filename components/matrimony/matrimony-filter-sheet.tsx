"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { LocationPreferencePicker } from "@/components/location/location-cascade-select"

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

  // Community/Caste options from matrimony onboarding (matrimony-preferences.tsx)
  const communityOptions = [
    "Any", "Brahmin", "Kshatriya", "Vaishya", "Shudra", "Other"
  ]

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
    if (array.includes(item)) {
      setter(array.filter(i => i !== item))
    } else {
      setter([...array, item])
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="matrimony-filter-sheet flex w-full flex-col overflow-y-auto border-l border-[#d9b978]/24 bg-[#fffaf2] sm:w-[520px]">
        <SheetHeader className="space-y-3">
          <div className="flex items-center justify-between pr-12">
            <SheetTitle className="matrimony-filter-title font-serif text-3xl tracking-[-0.05em] text-[#18110d]">Refine Matches</SheetTitle>
            <Button variant="ghost" size="sm" onClick={handleReset} className="rounded-full border border-[#d9b978]/30 bg-white/70 text-[#18110d] hover:bg-white">
              Reset
            </Button>
          </div>
          <SheetDescription className="text-[#6c5a4a]">Tune discovery by age, height, location, family context, and lifestyle.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 pb-6">
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
              <div className="flex flex-wrap gap-2.5">
                {communityOptions.map((community) => (
                  <Badge
                    key={community}
                    variant={filters.communities.includes(community) ? "default" : "outline"}
                    className={filters.communities.includes(community) 
                      ? "cursor-pointer bg-[#97011A] text-white border-[#97011A]/50 hover:bg-[#7A0115]" 
                      : "cursor-pointer bg-gray-100 border-[#E5E5E5] text-black hover:bg-gray-200"}
                    onClick={() => handleArrayToggle(filters.communities, community, (value) => setFilters(prev => ({ ...prev, communities: value })))}
                  >
                    {community}
                    {filters.communities.includes(community) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
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
            <h3 className="font-semibold text-black">Account Type</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="verified-only" className="text-black">Verified profiles only</Label>
                <Switch
                  id="verified-only"
                  checked={filters.verifiedOnly}
                  onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, verifiedOnly: checked }))}
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label htmlFor="premium-only" className="text-black">Premium members only</Label>
                  <p className="text-xs text-[#6c5a4a]">Queued until subscription entitlements are connected.</p>
                </div>
                <Switch
                  id="premium-only"
                  checked={false}
                  disabled
                />
              </div>
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <div className="sticky bottom-0 border-t border-[#482b1a]/10 bg-[#fffaf2]/92 px-6 py-5 backdrop-blur-xl">
          <Button onClick={handleApply} className="luxe-button w-full rounded-full" size="lg">
            Apply Matrimony Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
