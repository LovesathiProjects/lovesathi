"use client"

import { useEffect, useMemo, useState } from "react"
import { BadgeCheck, Crown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { LocationPreferencePicker } from "@/components/location/location-cascade-select"
import { SearchableMultiSelect } from "@/components/ui/searchable-select"
import { COMMUNITY_PREFERENCE_OPTIONS } from "@/lib/matrimonyOptions"
import { FREE_VERIFIED_FILTER_MATCH_LIMIT, useVerifiedFilterAllowance } from "@/hooks/useVerifiedFilterAllowance"
import { cn } from "@/lib/utils"

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

type FilterCategory =
  | "smart"
  | "posted"
  | "activity"
  | "religion"
  | "motherTongue"
  | "caste"
  | "location"
  | "income"
  | "education"
  | "occupation"
  | "photo"
  | "height"
  | "age"
  | "diet"
  | "marital"
  | "horoscope"

const defaultFilters: FilterState = {
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
}

const categories: Array<{ id: FilterCategory; label: string; badge?: (filters: FilterState) => number }> = [
  { id: "smart", label: "Smart Filters", badge: (filters) => Number(filters.verifiedOnly) + Number(filters.premiumOnly) },
  { id: "posted", label: "Profile posted by" },
  { id: "activity", label: "Activity on site" },
  { id: "religion", label: "Religion" },
  { id: "motherTongue", label: "Mother Tongue" },
  { id: "caste", label: "Caste Subcaste", badge: (filters) => filters.communities.length },
  { id: "location", label: "Location", badge: (filters) => filters.locations.length },
  { id: "income", label: "Income" },
  { id: "education", label: "Education", badge: (filters) => filters.educationPrefs.length },
  { id: "occupation", label: "Occupation", badge: (filters) => filters.professionPrefs.length },
  { id: "photo", label: "Photo" },
  { id: "height", label: "Height" },
  { id: "age", label: "Age" },
  { id: "diet", label: "Diet", badge: (filters) => filters.dietPrefs.length },
  { id: "marital", label: "Marital Status" },
  { id: "horoscope", label: "Horoscope" },
]

const checkboxGroups = {
  posted: ["All", "Self", "Parent", "Sibling"],
  activity: ["All", "Online", "Active in last week", "Active in last month", "Active in last 2 months"],
  religion: ["All", "Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Parsi", "Jewish", "Other"],
  motherTongue: ["All", "Hindi", "Marathi", "Urdu", "Gujarati", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Punjabi"],
  income: ["All", "Rs. 1 - 2 Lakh p.a", "Rs. 2 - 3 Lakh p.a", "Rs. 3 - 5 Lakh p.a", "Rs. 5 - 10 Lakh p.a", "Rs. 10 Lakh+ p.a"],
  photo: ["All", "With Photos", "Verified Photos", "Premium Profiles"],
  marital: ["All", "Never Married", "Divorced", "Widowed", "Awaiting Divorce"],
  horoscope: ["All", "Manglik", "Non-Manglik", "Horoscope available"],
}

const educationOptions = ["Any", "B.Com", "B.Sc", "B.E / B.Tech", "MBA", "MCA", "M.Sc", "M.A", "MBBS", "CA", "PhD"]
const occupationOptions = ["Any", "Administration", "Admin Professional", "Analyst", "Data Scientist", "Engineer", "HR Professional", "Marketing Manager", "Nurse", "Software & IT", "Teacher"]
const dietOptions = ["Any", "Vegetarian", "Eggetarian", "Non-vegetarian", "Pescatarian", "Vegan", "Jain", "Other"]
const lifestyleOptions = ["Any", "Non-smoker", "Non-drinker", "Smoker", "Drinker"]
const familyTypeOptions = ["Any", "Nuclear Family", "Joint Family", "Extended Family"]

function toggleArray(array: string[], value: string) {
  if (value === "Any" || value === "All") return array.includes(value) ? [] : [value]
  return array.includes(value) ? array.filter((item) => item !== value) : [...array.filter((item) => item !== "Any" && item !== "All"), value]
}

function CheckboxList({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="space-y-4">
      {options.map((option) => {
        const checked = selected.includes(option) || (selected.length === 0 && option === "All")
        return (
          <label key={option} className="flex cursor-pointer items-center gap-3 text-base font-bold text-[#5A6878]">
            <Checkbox
              checked={checked}
              onCheckedChange={() => onChange(toggleArray(selected, option))}
              className="h-5 w-5 rounded border-[#AEB8C5] data-[state=checked]:border-[#E83262] data-[state=checked]:bg-[#E83262]"
            />
            {option}
          </label>
        )
      })}
    </div>
  )
}

export function MatrimonyFilterSheet({ open, onOpenChange, onApplyFilters }: MatrimonyFilterSheetProps) {
  const { canUseVerifiedFilter, loading: verifiedFilterLoading, matchCount, isPremium } = useVerifiedFilterAllowance()
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [auxFilters, setAuxFilters] = useState<Record<string, string[]>>({})
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("posted")

  useEffect(() => {
    if (!canUseVerifiedFilter && filters.verifiedOnly) {
      setFilters((prev) => ({ ...prev, verifiedOnly: false }))
    }
  }, [canUseVerifiedFilter, filters.verifiedOnly])

  useEffect(() => {
    if (!isPremium && filters.premiumOnly) {
      setFilters((prev) => ({ ...prev, premiumOnly: false }))
    }
  }, [filters.premiumOnly, isPremium])

  const communityOptions = useMemo(() => ["Any", ...COMMUNITY_PREFERENCE_OPTIONS], [])
  const verifiedFilterDescription = isPremium
    ? "Premium active. Verified-only discovery is unlocked."
    : canUseVerifiedFilter
      ? `Free verified filter available for ${FREE_VERIFIED_FILTER_MATCH_LIMIT - matchCount} more match${FREE_VERIFIED_FILTER_MATCH_LIMIT - matchCount === 1 ? "" : "es"}.`
      : "Upgrade to keep verified-only discovery."

  const resetFilters = () => {
    setFilters(defaultFilters)
    setAuxFilters({})
  }
  const setAux = (key: FilterCategory, values: string[]) => {
    setAuxFilters((previous) => ({ ...previous, [key]: values }))
  }
  const applyFilters = () => {
    onApplyFilters?.(filters)
    onOpenChange(false)
  }

  const content = (() => {
    if (activeCategory === "smart") {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#E6EAF1] bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="verified-only" className="text-base font-black text-[#26364A]">Verified profiles only</Label>
                <p className="mt-1 text-sm font-semibold text-[#6F7C8B]">{verifiedFilterDescription}</p>
              </div>
              <Switch
                id="verified-only"
                checked={filters.verifiedOnly}
                disabled={verifiedFilterLoading || !canUseVerifiedFilter}
                onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, verifiedOnly: checked }))}
              />
            </div>
          </div>
          <div className="rounded-xl border border-[#E6EAF1] bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="premium-only" className="text-base font-black text-[#26364A]">Premium members only</Label>
                <p className="mt-1 text-sm font-semibold text-[#6F7C8B]">Available once a paid membership is active.</p>
              </div>
              <Switch
                id="premium-only"
                checked={filters.premiumOnly}
                disabled={!isPremium}
                onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, premiumOnly: checked }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E6EAF1] bg-white p-4">
              <BadgeCheck className="h-6 w-6 text-[#E83262]" />
              <p className="mt-3 text-sm font-bold text-[#26364A]">Trust-first matching</p>
            </div>
            <div className="rounded-xl border border-[#E6EAF1] bg-white p-4">
              <Crown className="h-6 w-6 text-[#E83262]" />
              <p className="mt-3 text-sm font-bold text-[#26364A]">Premium visibility</p>
            </div>
          </div>
        </div>
      )
    }

    if (activeCategory === "caste") {
      return (
        <SearchableMultiSelect
          values={filters.communities}
          onValuesChange={(communities) => setFilters((prev) => ({ ...prev, communities }))}
          options={communityOptions.map((community) => ({ value: community, label: community }))}
          placeholder="Select caste / subcaste"
          searchPlaceholder="Search caste, community, or denomination..."
          emptyMessage="No community found."
        />
      )
    }

    if (activeCategory === "location") {
      return (
        <LocationPreferencePicker
          value={filters.locations}
          onChange={(locations) => setFilters((prev) => ({ ...prev, locations }))}
          label="Location Preferences"
          cascadeClassName="grid grid-cols-1 gap-4"
        />
      )
    }

    if (activeCategory === "education") {
      return (
        <SearchableMultiSelect
          values={filters.educationPrefs}
          onValuesChange={(educationPrefs) => setFilters((prev) => ({ ...prev, educationPrefs }))}
          options={educationOptions.map((item) => ({ value: item, label: item }))}
          placeholder="Select education"
          searchPlaceholder="Search education..."
          emptyMessage="No education found."
        />
      )
    }

    if (activeCategory === "occupation") {
      return (
        <SearchableMultiSelect
          values={filters.professionPrefs}
          onValuesChange={(professionPrefs) => setFilters((prev) => ({ ...prev, professionPrefs }))}
          options={occupationOptions.map((item) => ({ value: item, label: item }))}
          placeholder="Select occupation"
          searchPlaceholder="Search occupation..."
          emptyMessage="No occupation found."
        />
      )
    }

    if (activeCategory === "height") {
      return (
        <div className="space-y-5">
          <Label className="text-base font-black text-[#26364A]">Height range: {filters.heightRange[0]} - {filters.heightRange[1]} cm</Label>
          <Slider value={filters.heightRange} onValueChange={(value) => setFilters((prev) => ({ ...prev, heightRange: value as [number, number] }))} max={250} min={90} step={1} />
        </div>
      )
    }

    if (activeCategory === "age") {
      return (
        <div className="space-y-5">
          <Label className="text-base font-black text-[#26364A]">Age range: {filters.ageRange[0]} - {filters.ageRange[1]} years</Label>
          <Slider value={filters.ageRange} onValueChange={(value) => setFilters((prev) => ({ ...prev, ageRange: value as [number, number] }))} max={60} min={18} step={1} />
        </div>
      )
    }

    if (activeCategory === "diet") {
      return <CheckboxList options={dietOptions} selected={filters.dietPrefs} onChange={(dietPrefs) => setFilters((prev) => ({ ...prev, dietPrefs }))} />
    }

    if (activeCategory === "posted") {
      return <CheckboxList options={checkboxGroups.posted} selected={auxFilters.posted || []} onChange={(values) => setAux("posted", values)} />
    }

    if (activeCategory === "activity") {
      return <CheckboxList options={checkboxGroups.activity} selected={auxFilters.activity || []} onChange={(values) => setAux("activity", values)} />
    }

    const group = checkboxGroups[activeCategory as keyof typeof checkboxGroups] || familyTypeOptions
    return <CheckboxList options={group} selected={auxFilters[activeCategory] || []} onChange={(values) => setAux(activeCategory, values)} />
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[min(calc(100svh-0.75rem),780px)] max-h-[calc(100svh-0.75rem)] w-[min(calc(100vw-0.75rem),780px)] max-w-none overflow-hidden rounded-[1.25rem] border-0 bg-white p-0 shadow-[0_30px_90px_rgba(31,44,60,0.28)] sm:h-[min(calc(100dvh-2rem),780px)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[1.6rem]" showCloseButton={false}>
        <div className="relative flex min-h-0 w-full flex-1 flex-col">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#26364A] shadow-lg transition hover:bg-[#F6F7FB] sm:-right-3 sm:-top-3 sm:h-11 sm:w-11"
            aria-label="Close filters"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center justify-between gap-4 border-b border-[#EEF1F6] px-4 py-4 pr-14 sm:px-7 sm:py-5">
            <h2 className="text-2xl font-black tracking-[-0.03em] text-[#26364A]">Refine Matches</h2>
            <button type="button" onClick={resetFilters} className="text-sm font-black text-[#E83262]">
              Reset
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[7.5rem_minmax(0,1fr)] overflow-hidden sm:grid-cols-[13rem_minmax(0,1fr)]">
            <nav className="min-h-0 overflow-y-auto overscroll-contain bg-[#F4F6FA] py-2">
              {categories.map((category) => {
                const selectedCount = category.badge?.(filters) || 0
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "flex min-h-12 w-full items-center justify-between gap-2 px-2.5 py-3 text-left text-[0.7rem] font-black leading-tight text-[#465568] transition sm:px-4 sm:text-sm",
                      activeCategory === category.id && "bg-white text-[#26364A] shadow-[inset_3px_0_0_#E83262]",
                    )}
                  >
                    <span>{category.label}</span>
                    {selectedCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E83262] px-1.5 text-[0.68rem] text-white">
                        {selectedCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            <section className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-7 sm:pb-7">
              {content}
            </section>
          </div>

          <div className="shrink-0 border-t border-[#EEF1F6] bg-white/96 px-4 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-7 sm:pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pt-4">
            <Button onClick={applyFilters} className="h-12 w-full rounded-xl bg-[#E83262] text-base font-black text-white shadow-[0_14px_30px_rgba(232,50,98,0.18)] hover:bg-[#C3264E]">
              Show Matches
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
