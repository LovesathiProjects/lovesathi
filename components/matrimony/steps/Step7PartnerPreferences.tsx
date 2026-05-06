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

type PreferenceKey =
  | "dietPrefs"
  | "lifestylePrefs"
  | "educationPrefs"
  | "professionPrefs"
  | "locations"
  | "communities"
  | "familyTypePrefs"

const preferenceGroups: Array<{
  key: PreferenceKey
  title: string
  description: string
  options: string[]
}> = [
  {
    key: "educationPrefs",
    title: "Education",
    description: "Academic background you would like to prioritize.",
    options: ["Any", "Bachelor's Degree", "Master's Degree", "MBA", "PhD", "Doctor", "Engineer"],
  },
  {
    key: "professionPrefs",
    title: "Profession",
    description: "Career paths that feel compatible with your expectations.",
    options: ["Any", "Software Engineer", "Doctor", "Business Owner", "Civil Servant", "Teacher", "Finance"],
  },
  {
    key: "locations",
    title: "Location",
    description: "Preferred cities or regions for serious conversations.",
    options: ["Any", "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Dubai", "USA"],
  },
  {
    key: "communities",
    title: "Community",
    description: "Keep this broad if you are open to wider matches.",
    options: ["Any", "Brahmin", "Kshatriya", "Vaishya", "Jain", "Muslim", "Christian", "Sikh"],
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
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d9b978]/35 bg-[#fffaf2]/74 px-4 py-2 text-[#8f001c] shadow-sm">
          <Sparkles className="h-4 w-4" />
          <span className="luxe-kicker">curated matching</span>
        </div>
        <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#18110d] sm:text-5xl">
          Tell us what a good match should feel like.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[#6c5a4a]">
          These preferences help Lovesathi move from simple browsing to refined matrimony recommendations.
          You can edit them anytime.
        </p>
      </div>

      <section className="luxe-card rounded-[2rem] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8f001c] text-[#fffaf2]">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#18110d]">Core range</h2>
            <p className="text-sm text-[#6c5a4a]">Start broad; we can refine later.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-[#482b1a]/10 bg-white/58 p-4">
            <Label className="text-[#18110d]">Age range</Label>
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
            <Label className="text-[#18110d]">Height range in cm</Label>
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

      <div className="grid gap-4">
        {preferenceGroups.map((group) => (
          <section key={group.key} className="rounded-[1.75rem] border border-[#d9b978]/24 bg-[#fffaf2]/76 p-5 shadow-[0_18px_55px_rgba(24,17,13,0.08)] backdrop-blur">
            <div className="mb-4 flex items-start gap-3">
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#8f001c]/10 text-[#8f001c]">
                {group.key === "locations" ? <MapPin className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#18110d]">{group.title}</h3>
                <p className="text-sm leading-6 text-[#6c5a4a]">{group.description}</p>
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
                        ? "border-[#8f001c] bg-[#8f001c] text-[#fffaf2] shadow-[0_12px_30px_rgba(143,0,28,0.22)]"
                        : "border-[#482b1a]/12 bg-white/70 text-[#6c5a4a] hover:border-[#b9904d] hover:text-[#18110d]",
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
        <Button type="button" variant="ghost" onClick={onBack} disabled={isLoading} className="text-[#18110d] hover:text-[#8f001c]">
          Back
        </Button>
        <Button type="button" disabled={isLoading} onClick={handleSave} className="luxe-button rounded-full px-7">
          {isLoading ? "Saving..." : "Complete profile"}
        </Button>
      </div>
    </div>
  )
}
