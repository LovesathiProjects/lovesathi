"use client"

import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
        <Select value={countryId || undefined} onValueChange={handleCountryChange} disabled={loadingCountries}>
          <SelectTrigger className="h-12 rounded-xl border-black/20 bg-white text-base text-[#111] focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20">
            <SelectValue placeholder={loadingCountries ? "Loading countries..." : countryPlaceholder} />
          </SelectTrigger>
          <SelectContent position="popper" className="z-50 max-h-80 border border-black/20 bg-white text-black">
            {countries.map((country) => (
              <SelectItem key={country.id} value={String(country.id)} className="text-black">
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-black">{stateLabel}</Label>
        <Select
          value={stateId || undefined}
          onValueChange={handleStateChange}
          disabled={!countryId || loadingStates || states.length === 0}
        >
          <SelectTrigger className="h-12 rounded-xl border-black/20 bg-white text-base text-[#111] focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20">
            <SelectValue
              placeholder={
                !countryId
                  ? "Select country first"
                  : loadingStates
                    ? "Loading states..."
                    : states.length === 0
                      ? "No states listed"
                      : statePlaceholder
              }
            />
          </SelectTrigger>
          <SelectContent position="popper" className="z-50 max-h-80 border border-black/20 bg-white text-black">
            {states.map((state) => (
              <SelectItem key={state.id} value={String(state.id)} className="text-black">
                {state.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-black">{cityLabel}</Label>
        <Select
          value={cityValue ? String(cityValue.id) : undefined}
          onValueChange={handleCityChange}
          disabled={!stateId || loadingCities || cities.length === 0}
        >
          <SelectTrigger className="h-12 rounded-xl border-black/20 bg-white text-base text-[#111] focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20">
            <SelectValue
              placeholder={
                !stateId
                  ? "Select state first"
                  : loadingCities
                    ? "Loading cities..."
                    : cities.length === 0
                      ? "No cities listed"
                      : cityPlaceholder
              }
            />
          </SelectTrigger>
          <SelectContent position="popper" className="z-50 max-h-80 border border-black/20 bg-white text-black">
            {cities.map((city) => (
              <SelectItem key={city.id} value={String(city.id)} className="text-black">
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            <Badge key={location} variant="outline" className="gap-2 rounded-full border-[#d9b978]/40 bg-[#fffaf2] px-3 py-1 text-[#18110d]">
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
