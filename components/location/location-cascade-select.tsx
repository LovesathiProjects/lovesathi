"use client"

import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select"
import { formatLocationValue, type LocationValue } from "@/lib/location"

type LocationOption = {
  id: number
  name: string
  code?: string
}

async function loadLocationOptions(type: "countries" | "states" | "cities", params?: Record<string, string>) {
  const searchParams = new URLSearchParams({ type, ...(params || {}) })
  const response = await fetch(`/api/locations?${searchParams.toString()}`)
  if (!response.ok) return []
  const payload = (await response.json()) as { options?: LocationOption[] }
  return payload.options || []
}

function findByName(options: LocationOption[], name?: string) {
  if (!name) return undefined
  const normalized = name.trim().toLowerCase()
  return options.find((option) => option.name.trim().toLowerCase() === normalized)
}

function toSearchableOptions(options: LocationOption[]): SearchableOption[] {
  return options.map((option) => ({
    value: String(option.id),
    label: option.name,
    keywords: option.code ? [option.code] : undefined,
  }))
}

interface LocationCascadeSelectProps {
  value?: LocationValue
  onChange: (value: LocationValue) => void
  countryLabel?: string
  stateLabel?: string
  cityLabel?: string
  countryPlaceholder?: string
  statePlaceholder?: string
  cityPlaceholder?: string
  className?: string
}

export function LocationCascadeSelect({
  value,
  onChange,
  countryLabel = "Country",
  stateLabel = "State / Province",
  cityLabel = "City",
  countryPlaceholder = "Select country",
  statePlaceholder = "Select state",
  cityPlaceholder = "Select city",
  className = "grid grid-cols-1 gap-4 sm:grid-cols-3",
}: LocationCascadeSelectProps) {
  const [countries, setCountries] = useState<LocationOption[]>([])
  const [states, setStates] = useState<LocationOption[]>([])
  const [cities, setCities] = useState<LocationOption[]>([])
  const [countryId, setCountryId] = useState("")
  const [stateId, setStateId] = useState("")
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCountries() {
      setLoadingCountries(true)
      const options = await loadLocationOptions("countries")
      if (!cancelled) {
        setCountries(options)
        setLoadingCountries(false)
      }
    }

    void loadCountries()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!countries.length) return
    const match = findByName(countries, value?.country)
    setCountryId(match ? String(match.id) : "")
  }, [countries, value?.country])

  useEffect(() => {
    let cancelled = false

    async function loadStates() {
      setStates([])
      setCities([])
      setStateId("")
      if (!countryId) {
        setLoadingStates(false)
        return
      }

      setLoadingStates(true)
      const options = await loadLocationOptions("states", { countryId })
      if (!cancelled) {
        setStates(options)
        setLoadingStates(false)
      }
    }

    void loadStates()

    return () => {
      cancelled = true
    }
  }, [countryId])

  useEffect(() => {
    if (!states.length) return
    const match = findByName(states, value?.state)
    setStateId(match ? String(match.id) : "")
  }, [states, value?.state])

  useEffect(() => {
    let cancelled = false

    async function loadCities() {
      setCities([])
      if (!stateId) {
        setLoadingCities(false)
        return
      }

      setLoadingCities(true)
      const options = await loadLocationOptions("cities", { stateId })
      if (!cancelled) {
        setCities(options)
        setLoadingCities(false)
      }
    }

    void loadCities()

    return () => {
      cancelled = true
    }
  }, [stateId])

  const cityValue = useMemo(() => findByName(cities, value?.city), [cities, value?.city])

  function handleCountryChange(nextCountryId: string) {
    const country = countries.find((option) => String(option.id) === nextCountryId)
    setCountryId(nextCountryId)
    onChange({ country: country?.name || "", state: "", city: "" })
  }

  function handleStateChange(nextStateId: string) {
    const state = states.find((option) => String(option.id) === nextStateId)
    setStateId(nextStateId)
    onChange({ country: value?.country || "", state: state?.name || "", city: "" })
  }

  function handleCityChange(nextCityId: string) {
    const city = cities.find((option) => String(option.id) === nextCityId)
    onChange({ country: value?.country || "", state: value?.state || "", city: city?.name || "" })
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        <Label className="text-black">{countryLabel}</Label>
        <SearchableSelect
          value={countryId || undefined}
          onValueChange={handleCountryChange}
          disabled={loadingCountries}
          options={toSearchableOptions(countries)}
          placeholder={loadingCountries ? "Loading countries..." : countryPlaceholder}
          searchPlaceholder="Search country..."
          emptyMessage="No country found."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-black">{stateLabel}</Label>
        <SearchableSelect
          value={stateId || undefined}
          onValueChange={handleStateChange}
          disabled={!countryId || loadingStates || states.length === 0}
          options={toSearchableOptions(states)}
          placeholder={
            !countryId
              ? "Select country first"
              : loadingStates
                ? "Loading states..."
                : states.length === 0
                  ? "No states listed"
                  : statePlaceholder
          }
          searchPlaceholder="Search state..."
          emptyMessage="No state found."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-black">{cityLabel}</Label>
        <SearchableSelect
          value={cityValue ? String(cityValue.id) : undefined}
          onValueChange={handleCityChange}
          disabled={!stateId || loadingCities || cities.length === 0}
          options={toSearchableOptions(cities)}
          placeholder={
            !stateId
              ? "Select state first"
              : loadingCities
                ? "Loading cities..."
                : cities.length === 0
                  ? "No cities listed"
                  : cityPlaceholder
          }
          searchPlaceholder="Search city..."
          emptyMessage="No city found."
        />
      </div>
    </div>
  )
}

export function LocationPreferencePicker({
  value,
  onChange,
  label = "Preferred Locations",
}: {
  value?: string[]
  onChange: (value: string[]) => void
  label?: string
}) {
  const [draft, setDraft] = useState<LocationValue>({})
  const selected = value || []
  const draftLabel = formatLocationValue(draft)

  function addLocation() {
    if (!draft.city || !draft.state || !draft.country) return
    if (selected.includes(draftLabel)) return
    onChange([...selected, draftLabel])
    setDraft({})
  }

  return (
    <div className="space-y-3">
      <Label className="text-black">{label}</Label>
      <LocationCascadeSelect
        value={draft}
        onChange={setDraft}
        countryLabel="Country"
        stateLabel="State"
        cityLabel="City"
      />
      <Button
        type="button"
        variant="outline"
        className="rounded-full border-[#482b1a]/15 bg-white"
        onClick={addLocation}
        disabled={!draft.city || !draft.state || !draft.country}
      >
        Add location
      </Button>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((location) => (
            <Badge key={location} variant="outline" className="gap-2 rounded-full border-[#d8c79f]/40 bg-[#ffffff] px-3 py-1 text-[#18110d]">
              {location}
              <button
                type="button"
                aria-label={`Remove ${location}`}
                onClick={() => onChange(selected.filter((item) => item !== location))}
                className="rounded-full text-[#8f001c] hover:text-[#5f0012]"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
