export interface LocationValue {
  country?: string
  state?: string
  city?: string
}

export function formatLocationValue(value?: LocationValue | null) {
  if (!value) return ""
  return [value.city, value.state, value.country].filter(Boolean).join(", ")
}

export function parseLocationValue(value?: string | null): LocationValue {
  const parts = (value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 3) {
    return {
      city: parts[0],
      state: parts[1],
      country: parts.slice(2).join(", "),
    }
  }

  if (parts.length === 2) {
    return {
      city: parts[0],
      country: parts[1],
    }
  }

  return {
    city: parts[0] || "",
    state: "",
    country: "",
  }
}

export function getLocationCity(value: string) {
  return parseLocationValue(value).city || value
}
