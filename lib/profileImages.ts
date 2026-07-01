const fallbackPalettes = [
  ["#ffffff", "#f8d7e1", "#26364a"],
  ["#fff4f7", "#E83262", "#172235"],
  ["#f8fafd", "#f1b7c7", "#26364a"],
  ["#ffffff", "#d9ad4f", "#5f0012"],
]

function hashSeed(seed: string) {
  return seed.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7)
}

export function getProfileInitials(name?: string | null) {
  const parts = String(name || "Lovesathi")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return "LS"
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function getProfileFallbackImage(name?: string | null, seed?: string | null) {
  const key = `${name || "Lovesathi"}:${seed || ""}`
  const palette = fallbackPalettes[hashSeed(key) % fallbackPalettes.length]
  const initials = getProfileInitials(name)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="920" viewBox="0 0 720 920">
      <defs>
        <radialGradient id="g" cx="32%" cy="18%" r="85%">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="58%" stop-color="${palette[1]}"/>
          <stop offset="100%" stop-color="${palette[2]}"/>
        </radialGradient>
        <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="30" stdDeviation="36" flood-color="#1a1714" flood-opacity="0.22"/>
        </filter>
      </defs>
      <rect width="720" height="920" fill="url(#g)"/>
      <path d="M118 185C202 102 314 82 424 125C530 166 604 266 610 386C616 513 548 617 438 682C329 746 192 743 116 655C40 566 36 267 118 185Z" fill="rgba(255,255,255,0.24)"/>
      <circle cx="360" cy="354" r="148" fill="rgba(255,255,255,0.38)" filter="url(#s)"/>
      <text x="360" y="406" text-anchor="middle" font-family="Georgia, serif" font-size="126" font-weight="700" fill="rgba(255,255,255,0.92)">${initials}</text>
      <rect x="130" y="638" width="460" height="54" rx="10" fill="rgba(255,255,255,0.28)"/>
      <text x="360" y="673" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="4" fill="rgba(255,255,255,0.9)">LOVESATHI PROFILE</text>
    </svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function getSafeProfilePhotos(photos?: string[] | null, name?: string | null, seed?: string | null, limit?: number) {
  const cleaned = Array.isArray(photos)
    ? photos.filter((photo): photo is string => typeof photo === "string" && photo.trim().length > 0)
    : []
  const safePhotos = cleaned.length > 0 ? cleaned : [getProfileFallbackImage(name, seed)]
  return typeof limit === "number" ? safePhotos.slice(0, Math.max(limit, 1)) : safePhotos
}
