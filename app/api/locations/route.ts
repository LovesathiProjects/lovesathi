import { NextRequest, NextResponse } from "next/server"
import csc from "countries-states-cities"

type LocationOption = {
  id: number
  name: string
  code?: string
}

const countryCache: LocationOption[] = csc
  .getAllCountries()
  .map((country) => ({
    id: country.id,
    name: country.name,
    code: country.iso2,
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

const stateCache = new Map<number, LocationOption[]>()
const cityCache = new Map<number, LocationOption[]>()

function getStates(countryId: number) {
  if (!stateCache.has(countryId)) {
    stateCache.set(
      countryId,
      csc
        .getStatesOfCountry(countryId)
        .map((state) => ({
          id: state.id,
          name: state.name,
          code: state.state_code,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    )
  }

  return stateCache.get(countryId) || []
}

function getCities(stateId: number) {
  if (!cityCache.has(stateId)) {
    cityCache.set(
      stateId,
      csc
        .getCitiesOfState(stateId)
        .map((city) => ({
          id: city.id,
          name: city.name,
          code: city.state_code,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    )
  }

  return cityCache.get(stateId) || []
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  if (type === "countries") {
    return NextResponse.json({ options: countryCache })
  }

  if (type === "states") {
    const countryId = Number(searchParams.get("countryId"))
    if (!Number.isFinite(countryId)) {
      return NextResponse.json({ options: [] }, { status: 400 })
    }

    return NextResponse.json({ options: getStates(countryId) })
  }

  if (type === "cities") {
    const stateId = Number(searchParams.get("stateId"))
    if (!Number.isFinite(stateId)) {
      return NextResponse.json({ options: [] }, { status: 400 })
    }

    return NextResponse.json({ options: getCities(stateId) })
  }

  return NextResponse.json({ error: "Unknown location request." }, { status: 400 })
}
