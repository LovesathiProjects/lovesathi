export function formatPublicProfileName(value?: string | null) {
  const parts = (value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return "Profile"
  if (parts.length === 1) return parts[0]

  const initial = parts[1]?.charAt(0).toUpperCase()
  return initial ? `${parts[0]} ${initial}` : parts[0]
}

export function getDisplayInitial(value?: string | null) {
  return formatPublicProfileName(value).charAt(0).toUpperCase() || "?"
}

