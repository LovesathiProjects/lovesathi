import { calculateAgeFromDate } from "@/lib/age"
import { formatLocationValue } from "@/lib/location"

export type ProfileForCompatibility = Record<string, any> | null | undefined

export interface PreferenceCompatibilityRow {
  id: string
  label: string
  preference: string
  matched: boolean
}

export interface PreferenceCompatibilitySummary {
  rows: PreferenceCompatibilityRow[]
  matched: number
  total: number
  possessiveLabel: "Her" | "His" | "Their"
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {}
}

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function valueToArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean)
  return [String(value).trim()].filter(Boolean)
}

function hasUsefulPreference(value: unknown) {
  const values = valueToArray(value).map(normalize).filter(Boolean)
  if (values.length === 0) return false
  return !values.every((item) =>
    ["any", "all", "open to all", "open to both", "does not matter", "doesnt matter", "no preference"].includes(item),
  )
}

function formatList(values: unknown, limit = 10) {
  const list = valueToArray(values)
  if (list.length <= limit) return list.join(", ")
  return `${list.slice(0, limit).join(", ")} ...View More`
}

function getPersonal(profile: ProfileForCompatibility) {
  return asRecord(profile?.personal)
}

function getCareer(profile: ProfileForCompatibility) {
  return asRecord(profile?.career)
}

function getCultural(profile: ProfileForCompatibility) {
  return asRecord(profile?.cultural)
}

function getFamily(profile: ProfileForCompatibility) {
  return asRecord(profile?.family)
}

function getPreferences(profile: ProfileForCompatibility) {
  return asRecord(profile?.partner_preferences || profile?.partnerPreferences)
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null
  const parsed = Number(value.replace(/[^\d.]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function getAge(profile: ProfileForCompatibility) {
  const directAge = toNumber(profile?.age)
  if (directAge) return directAge
  const cultural = getCultural(profile)
  return calculateAgeFromDate(cultural.date_of_birth || cultural.dob) || null
}

function parseHeightToCm(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (!value) return null
  const raw = String(value).toLowerCase()
  const cm = raw.match(/(\d+(?:\.\d+)?)\s*cm/)
  if (cm) return Math.round(Number(cm[1]))
  const feetInches = raw.match(/(\d+)\s*(?:ft|')\s*(\d+)?/)
  if (feetInches) {
    const feet = Number(feetInches[1])
    const inches = Number(feetInches[2] || 0)
    return Math.round((feet * 12 + inches) * 2.54)
  }
  return toNumber(value)
}

function getHeightCm(profile: ProfileForCompatibility) {
  const personal = getPersonal(profile)
  return parseHeightToCm(personal.height_cm || personal.heightCm || profile?.height)
}

function formatHeight(cm: number | null | undefined) {
  return cm ? `${cm} cm` : "Any"
}

function getProfileLocations(profile: ProfileForCompatibility) {
  const locations = valueToArray(profile?.location)
  const career = getCareer(profile)
  const cultural = getCultural(profile)
  const workLocation = formatLocationValue(asRecord(career.work_location))
  if (workLocation) locations.push(workLocation)
  if (typeof cultural.place_of_birth === "string") locations.push(cultural.place_of_birth)
  const birthLocation = formatLocationValue({
    city: cultural.birth_city || cultural.birthCity,
    state: cultural.birth_state || cultural.birthState,
    country: cultural.birth_country || cultural.birthCountry,
  })
  if (birthLocation) locations.push(birthLocation)
  return locations
}

function locationTokens(values: string[]) {
  return values.flatMap((value) => {
    const parts = value.split(",").map((part) => normalize(part)).filter(Boolean)
    return [normalize(value), ...parts]
  })
}

function matchesLocation(preferences: unknown, viewerLocations: string[]) {
  const preferred = valueToArray(preferences)
  if (!hasUsefulPreference(preferred)) return true
  const preferredTokens = locationTokens(preferred)
  const viewerTokens = locationTokens(viewerLocations)
  return preferredTokens.some((preferredToken) =>
    viewerTokens.some(
      (viewerToken) =>
        preferredToken === viewerToken ||
        (preferredToken.length > 2 && viewerToken.includes(preferredToken)) ||
        (viewerToken.length > 2 && preferredToken.includes(viewerToken)),
    ),
  )
}

function matchesAnyPreference(preferences: unknown, viewerValues: unknown[]) {
  const preferred = valueToArray(preferences)
  if (!hasUsefulPreference(preferred)) return true
  const normalizedViewerValues = viewerValues.flatMap(valueToArray).map(normalize).filter(Boolean)
  if (normalizedViewerValues.length === 0) return false
  return preferred.map(normalize).some((preferredValue) =>
    normalizedViewerValues.some(
      (viewerValue) =>
        preferredValue === viewerValue ||
        viewerValue.includes(preferredValue) ||
        preferredValue.includes(viewerValue),
    ),
  )
}

function matchesLifestyle(preferences: unknown, viewerProfile: ProfileForCompatibility) {
  const preferred = valueToArray(preferences)
  if (!hasUsefulPreference(preferred)) return true
  const personal = getPersonal(viewerProfile)
  return preferred.every((preference) => {
    const normalized = normalize(preference)
    if (normalized === "non smoker") return personal.smoker === false
    if (normalized === "smoker") return personal.smoker === true
    if (normalized === "non drinker") return personal.drinker === false
    if (normalized.includes("drinker")) return personal.drinker === true
    return true
  })
}

function getPossessiveLabel(profile: ProfileForCompatibility): "Her" | "His" | "Their" {
  const gender = normalize(profile?.gender || getPersonal(profile).gender)
  if (gender === "female") return "Her"
  if (gender === "male") return "His"
  return "Their"
}

export function buildPreferenceCompatibility(
  targetProfile: ProfileForCompatibility,
  viewerProfile: ProfileForCompatibility,
): PreferenceCompatibilitySummary {
  const preferences = getPreferences(targetProfile)
  const viewerPersonal = getPersonal(viewerProfile)
  const viewerCareer = getCareer(viewerProfile)
  const viewerCultural = getCultural(viewerProfile)
  const viewerFamily = getFamily(viewerProfile)
  const rows: PreferenceCompatibilityRow[] = []

  const viewerAge = getAge(viewerProfile)
  const minAge = toNumber(preferences.min_age || preferences.minAge)
  const maxAge = toNumber(preferences.max_age || preferences.maxAge)
  if (minAge || maxAge) {
    rows.push({
      id: "age",
      label: "Age",
      preference: `${minAge || "Any"} to ${maxAge || "Any"} Years`,
      matched: Boolean(viewerAge && (!minAge || viewerAge >= minAge) && (!maxAge || viewerAge <= maxAge)),
    })
  }

  const viewerHeight = getHeightCm(viewerProfile)
  const minHeight = parseHeightToCm(preferences.min_height_cm || preferences.min_height || preferences.minHeightCm || preferences.minHeight)
  const maxHeight = parseHeightToCm(preferences.max_height_cm || preferences.max_height || preferences.maxHeightCm || preferences.maxHeight)
  if (minHeight || maxHeight) {
    rows.push({
      id: "height",
      label: "Height",
      preference: `${formatHeight(minHeight)} to ${formatHeight(maxHeight)}`,
      matched: Boolean(viewerHeight && (!minHeight || viewerHeight >= minHeight) && (!maxHeight || viewerHeight <= maxHeight)),
    })
  }

  const preferenceRows: Array<{
    id: string
    label: string
    preference: unknown
    viewerValues: unknown[]
  }> = [
    {
      id: "marital-status",
      label: "Marital Status",
      preference: preferences.marital_status_prefs || preferences.maritalStatusPrefs,
      viewerValues: [viewerPersonal.marital_status, viewerProfile?.maritalStatus],
    },
    {
      id: "community",
      label: "Community / Caste",
      preference: preferences.communities || preferences.community_prefs || preferences.communityPrefs,
      viewerValues: [viewerCultural.community, viewerCultural.sub_caste, viewerProfile?.community],
    },
    {
      id: "mother-tongue",
      label: "Mother Tongue",
      preference: preferences.mother_tongue_prefs || preferences.motherTonguePrefs,
      viewerValues: [viewerCultural.mother_tongue],
    },
    {
      id: "education",
      label: "Education",
      preference: preferences.education_prefs || preferences.educationPrefs,
      viewerValues: [viewerCareer.highest_education, viewerProfile?.education],
    },
    {
      id: "profession",
      label: "Profession",
      preference: preferences.profession_prefs || preferences.professionPrefs,
      viewerValues: [viewerCareer.job_title, viewerProfile?.profession],
    },
    {
      id: "income",
      label: "Income",
      preference: preferences.income_prefs || preferences.incomePrefs,
      viewerValues: [viewerCareer.annual_income, viewerProfile?.income],
    },
    {
      id: "diet",
      label: "Diet",
      preference: preferences.diet_prefs || preferences.dietPrefs,
      viewerValues: [viewerPersonal.diet],
    },
    {
      id: "family-type",
      label: "Family Type",
      preference: preferences.family_type_prefs || preferences.familyTypePrefs,
      viewerValues: [viewerFamily.family_type],
    },
    {
      id: "profile-created-by",
      label: "Profile Posted By",
      preference: preferences.profile_created_by_prefs || preferences.profileCreatedByPrefs,
      viewerValues: [viewerProfile?.created_by, viewerProfile?.createdBy],
    },
  ]

  const locations = preferences.locations || preferences.location_prefs || preferences.locationPrefs
  if (hasUsefulPreference(locations)) {
    rows.push({
      id: "location",
      label: "Location",
      preference: formatList(locations),
      matched: matchesLocation(locations, getProfileLocations(viewerProfile)),
    })
  }

  preferenceRows.forEach((row) => {
    if (!hasUsefulPreference(row.preference)) return
    rows.push({
      id: row.id,
      label: row.label,
      preference: formatList(row.preference),
      matched: matchesAnyPreference(row.preference, row.viewerValues),
    })
  })

  const lifestyle = preferences.lifestyle_prefs || preferences.lifestylePrefs
  if (hasUsefulPreference(lifestyle)) {
    rows.push({
      id: "lifestyle",
      label: "Lifestyle",
      preference: formatList(lifestyle),
      matched: matchesLifestyle(lifestyle, viewerProfile),
    })
  }

  const matched = rows.filter((row) => row.matched).length
  return {
    rows,
    matched,
    total: rows.length,
    possessiveLabel: getPossessiveLabel(targetProfile),
  }
}
