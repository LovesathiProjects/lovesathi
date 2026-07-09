"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BadgeCheck, HeartHandshake, MapPin, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { saveStep7 } from "@/lib/matrimonyService"
import { useMatrimonySetupStore } from "@/components/matrimony/store"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { LocationPreferencePicker } from "@/components/location/location-cascade-select"
import { COMMUNITY_PREFERENCE_OPTIONS, EDUCATION_PREFERENCE_OPTIONS } from "@/lib/matrimonyOptions"
import { SearchableMultiSelect } from "@/components/ui/searchable-select"

type PreferenceKey =
  | "dietPrefs"
  | "lifestylePrefs"
  | "educationPrefs"
  | "professionPrefs"
  | "locations"
  | "communities"
  | "familyTypePrefs"
  | "maritalStatusPrefs"
  | "incomePrefs"
  | "manglikPrefs"
  | "profileCreatedByPrefs"

const preferenceGroups: Array<{
  key: PreferenceKey
  title: string
  description: string
  options: string[]
}> = [
  {
    key: "maritalStatusPrefs",
    title: "Marital Status",
    description: "Set the relationship history your family is comfortable with.",
    options: ["Any", "Never Married", "Divorced", "Widowed", "Annulled", "Separated"],
  },
  {
    key: "incomePrefs",
    title: "Annual Income",
    description: "A broad financial comfort range, inspired by traditional matrimony search.",
    options: ["Any", "Open to all", "3-6 LPA", "6-10 LPA", "10-20 LPA", "20-35 LPA", "35-50 LPA", "50 LPA+"],
  },
  {
    key: "dietPrefs",
    title: "Diet",
    description: "Lifestyle alignment for family and daily life.",
    options: ["Any", "Vegetarian", "Eggetarian", "Non-vegetarian", "Vegan", "Jain"],
  },
  {
    key: "lifestylePrefs",
    title: "Lifestyle",
    description: "Optional boundaries for habits and comfort.",
    options: ["Any", "Non-smoker", "Non-drinker", "Open to both"],
  },
  {
    key: "familyTypePrefs",
    title: "Family Type",
    description: "Family environment that feels aligned.",
    options: ["Any", "Nuclear", "Joint", "Extended", "Single Parent"],
  },
  {
    key: "manglikPrefs",
    title: "Horoscope / Manglik",
    description: "Optional astrology preference for families who consider it important.",
    options: ["Any", "Manglik accepted", "Non-Manglik preferred", "Horoscope match required", "Does not matter"],
  },
  {
    key: "profileCreatedByPrefs",
    title: "Profile Managed By",
    description: "Choose whether self-managed or family-managed profiles are preferred.",
    options: ["Any", "Self", "Parent", "Sibling", "Family managed"],
  },
]

const PROFESSION_PREFERENCE_OPTIONS = [
  "Any",
  "Software Engineer",
  "Data Scientist",
  "Doctor",
  "Dentist",
  "Chartered Accountant",
  "Corporate Lawyer",
  "Civil Servant",
  "Government Employee",
  "Professor / Teacher",
  "Business Owner",
  "Founder",
  "Finance Professional",
  "Marketing Manager",
  "Product Manager",
  "Architect",
  "Designer",
  "Homemaker",
]

function toggleList(list: string[] | undefined, value: string) {
  const current = list || []
  if (value === "Any") return current.includes("Any") ? [] : ["Any"]
  const withoutAny = current.filter((item) => item !== "Any")
  return withoutAny.includes(value) ? withoutAny.filter((item) => item !== value) : [...withoutAny, value]
}

export function Step7PartnerPreferences({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { preferences, setPartial } = useMatrimonySetupStore()
  const [isLoading, setIsLoading] = React.useState(false)
  const [values, setValues] = React.useState({
    ageRange: preferences.ageRange || ([22, 34] as [number, number]),
    heightRangeCm: preferences.heightRangeCm || ([150, 190] as [number, number]),
    dietPrefs: preferences.dietPrefs || [],
    lifestylePrefs: preferences.lifestylePrefs || [],
    educationPrefs: preferences.educationPrefs || [],
    professionPrefs: preferences.professionPrefs || [],
    locations: preferences.locations || [],
    communities: preferences.communities || [],
    familyTypePrefs: preferences.familyTypePrefs || [],
    maritalStatusPrefs: preferences.maritalStatusPrefs || [],
    incomePrefs: preferences.incomePrefs || [],
    manglikPrefs: preferences.manglikPrefs || [],
    profileCreatedByPrefs: preferences.profileCreatedByPrefs || [],
  })

  const setRangeValue = (key: "ageRange" | "heightRangeCm", index: 0 | 1, nextValue: number) => {
    setValues((prev) => {
      const nextRange = [...prev[key]] as [number, number]
      nextRange[index] = nextValue
      const next = { ...prev, [key]: nextRange }
      setPartial("preferences", next)
      return next
    })
  }

  const togglePreference = (key: PreferenceKey, option: string) => {
    setValues((prev) => {
      const next = { ...prev, [key]: toggleList(prev[key], option) }
      setPartial("preferences", next)
      return next
    })
  }

  const setLocations = (locations: string[]) => {
    setValues((prev) => {
      const next = { ...prev, locations }
      setPartial("preferences", next)
      return next
    })
  }

  const setCommunities = (communities: string[]) => {
    setValues((prev) => {
      const next = { ...prev, communities }
      setPartial("preferences", next)
      return next
    })
  }

  const setSearchablePreference = (key: PreferenceKey, selectedValues: string[]) => {
    setValues((prev) => {
      const cleanedValues = selectedValues.includes("Any") && selectedValues.length > 1 ? ["Any"] : selectedValues
      const next = { ...prev, [key]: cleanedValues }
      setPartial("preferences", next)
      return next
    })
  }

  const handleSave = async () => {
    if (values.ageRange[0] > values.ageRange[1]) {
      toast.error("Minimum age cannot be higher than maximum age.")
      return
    }
    if (values.heightRangeCm[0] > values.heightRangeCm[1]) {
      toast.error("Minimum height cannot be higher than maximum height.")
      return
    }

    setIsLoading(true)
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        toast.error("Please sign in to continue")
        return
      }

      const result = await saveStep7(user.id, values)
      if (!result.success) {
        throw new Error(result.error || "Failed to save partner preferences")
      }

      setPartial("preferences", values)
      toast.success("Your partner preferences are saved.")
      onNext()
    } catch (error: any) {
      console.error("Error saving partner preferences:", error)
      toast.error(error.message || "Failed to save. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#E83262]/35 bg-[#ffffff]/74 px-4 py-2 text-[#E83262] shadow-sm">
          <Sparkles className="h-4 w-4" />
          <span className="luxe-kicker">curated matching</span>
        </div>
        <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A] sm:text-5xl">
          Build your partner search with matrimony-grade clarity.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[#6F7C8B]">
          Inspired by serious matrimony search flows, this keeps core filters structured while letting you stay flexible where family compatibility matters more than a checkbox.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Must-have", "Age, height, location, community"],
          ["Preferred", "Education, profession, income, family context"],
          ["Flexible", "Lifestyle and horoscope comfort"],
        ].map(([title, copy]) => (
          <div key={title} className="rounded-[1.4rem] border border-[#E83262]/30 bg-[#FFFFFF]/80 p-4 shadow-[0_14px_38px_rgba(58,43,36,0.06)]">
            <p className="luxe-kicker text-[0.58rem] text-[#E83262]">{title}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#26364A]">{copy}</p>
          </div>
        ))}
      </section>

      <section className="luxe-card rounded-[2rem] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E83262] text-white">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">Core range</h2>
            <p className="text-sm text-[#6F7C8B]">Start broad; we can refine later.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-[#482b1a]/10 bg-white/58 p-4">
            <Label className="text-[#26364A]">Age range</Label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={18}
                max={80}
                value={values.ageRange[0]}
                onChange={(event) => setRangeValue("ageRange", 0, Number(event.target.value))}
                className="rounded-2xl"
              />
              <Input
                type="number"
                min={18}
                max={80}
                value={values.ageRange[1]}
                onChange={(event) => setRangeValue("ageRange", 1, Number(event.target.value))}
                className="rounded-2xl"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-[#482b1a]/10 bg-white/58 p-4">
            <Label className="text-[#26364A]">Height range in cm</Label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={90}
                max={250}
                value={values.heightRangeCm[0]}
                onChange={(event) => setRangeValue("heightRangeCm", 0, Number(event.target.value))}
                className="rounded-2xl"
              />
              <Input
                type="number"
                min={90}
                max={250}
                value={values.heightRangeCm[1]}
                onChange={(event) => setRangeValue("heightRangeCm", 1, Number(event.target.value))}
                className="rounded-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[#E83262]/24 bg-[#ffffff]/76 p-5 shadow-[0_18px_55px_rgba(24,17,13,0.08)] backdrop-blur">
        <div className="mb-4 flex items-start gap-3">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#E83262]/10 text-[#E83262]">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">Location</h3>
            <p className="text-sm leading-6 text-[#6F7C8B]">
              Choose Open to all or add preferred cities by country, state, and city.
            </p>
          </div>
        </div>
        <LocationPreferencePicker
          value={values.locations}
          onChange={setLocations}
          label="Preferred Cities"
          allowOpenToAll
        />
      </section>

      <section className="rounded-[1.75rem] border border-[#E83262]/24 bg-[#ffffff]/76 p-5 shadow-[0_18px_55px_rgba(24,17,13,0.08)] backdrop-blur">
        <div className="mb-4 flex items-start gap-3">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#E83262]/10 text-[#E83262]">
            <BadgeCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">Community</h3>
            <p className="text-sm leading-6 text-[#6F7C8B]">
              Search a broad community list instead of scrolling through dozens of chips.
            </p>
          </div>
        </div>
        <SearchableMultiSelect
          values={values.communities}
          onValuesChange={setCommunities}
          options={["Any", ...COMMUNITY_PREFERENCE_OPTIONS].map((option) => ({ value: option, label: option }))}
          placeholder="Select preferred communities"
          searchPlaceholder="Search community, caste, or denomination..."
          emptyMessage="No community found."
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-[#E83262]/24 bg-[#FFFFFF]/76 p-5 shadow-[0_18px_55px_rgba(58,43,36,0.08)] backdrop-blur">
          <h3 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">Education Preference</h3>
          <p className="mb-4 mt-1 text-sm leading-6 text-[#6F7C8B]">Search and select one or more education signals.</p>
          <SearchableMultiSelect
            values={values.educationPrefs}
            onValuesChange={(nextValues) => setSearchablePreference("educationPrefs", nextValues)}
            options={EDUCATION_PREFERENCE_OPTIONS.map((option) => ({ value: option, label: option }))}
            placeholder="Select education preference"
            searchPlaceholder="Search education..."
          />
        </div>
        <div className="rounded-[1.75rem] border border-[#E83262]/24 bg-[#FFFFFF]/76 p-5 shadow-[0_18px_55px_rgba(58,43,36,0.08)] backdrop-blur">
          <h3 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">Profession Preference</h3>
          <p className="mb-4 mt-1 text-sm leading-6 text-[#6F7C8B]">Prioritize compatible career paths without forcing one job title.</p>
          <SearchableMultiSelect
            values={values.professionPrefs}
            onValuesChange={(nextValues) => setSearchablePreference("professionPrefs", nextValues)}
            options={PROFESSION_PREFERENCE_OPTIONS.map((option) => ({ value: option, label: option }))}
            placeholder="Select profession preference"
            searchPlaceholder="Search profession..."
          />
        </div>
      </section>

      <div className="grid gap-4">
        {preferenceGroups.map((group) => (
          <section key={group.key} className="rounded-[1.75rem] border border-[#E83262]/24 bg-[#ffffff]/76 p-5 shadow-[0_18px_55px_rgba(24,17,13,0.08)] backdrop-blur">
            <div className="mb-4 flex items-start gap-3">
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#E83262]/10 text-[#E83262]">
                {group.key === "locations" ? <MapPin className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">{group.title}</h3>
                <p className="text-sm leading-6 text-[#6F7C8B]">{group.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const selected = values[group.key].includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => togglePreference(group.key, option)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-bold transition",
                      selected
                        ? "border-[#E83262] bg-[#E83262] text-white shadow-[0_12px_30px_rgba(194,165,116,0.22)]"
                        : "border-[#482b1a]/12 bg-white/70 text-[#6F7C8B] hover:border-[#E83262] hover:text-[#26364A]",
                    )}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isLoading} className="text-[#26364A] hover:text-[#E83262]">
          Back
        </Button>
        <Button type="button" disabled={isLoading} onClick={handleSave} className="luxe-button rounded-full px-7">
          {isLoading ? "Saving..." : "Complete profile"}
        </Button>
      </div>
    </div>
  )
}
