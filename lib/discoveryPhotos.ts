import type { MatrimonyProfile } from "@/lib/mockMatrimonyProfiles"

const FALLBACK_DISCOVERY_PHOTOS = [
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/65.jpg",
  "https://randomuser.me/api/portraits/men/75.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/41.jpg",
  "https://randomuser.me/api/portraits/women/21.jpg",
  "https://randomuser.me/api/portraits/men/14.jpg",
  "https://randomuser.me/api/portraits/women/12.jpg",
  "https://randomuser.me/api/portraits/men/52.jpg",
  "https://randomuser.me/api/portraits/women/39.jpg",
  "https://randomuser.me/api/portraits/men/47.jpg",
  "https://randomuser.me/api/portraits/women/57.jpg",
  "https://randomuser.me/api/portraits/men/23.jpg",
  "https://randomuser.me/api/portraits/women/29.jpg",
  "https://randomuser.me/api/portraits/men/58.jpg",
  "https://randomuser.me/api/portraits/women/76.jpg",
  "https://randomuser.me/api/portraits/men/71.jpg",
  "https://randomuser.me/api/portraits/women/82.jpg",
  "https://randomuser.me/api/portraits/men/81.jpg",
  "https://randomuser.me/api/portraits/women/90.jpg",
  "https://randomuser.me/api/portraits/men/91.jpg",
  "https://randomuser.me/api/portraits/women/5.jpg",
  "https://randomuser.me/api/portraits/men/5.jpg",
  "https://randomuser.me/api/portraits/women/18.jpg",
  "https://randomuser.me/api/portraits/men/18.jpg",
  "https://randomuser.me/api/portraits/women/33.jpg",
  "https://randomuser.me/api/portraits/men/33.jpg",
  "https://randomuser.me/api/portraits/women/49.jpg",
  "https://randomuser.me/api/portraits/men/49.jpg",
]

function normalizePhotoUrl(photo: string) {
  return photo.trim()
}

export function withUniqueDiscoveryPhotos(profiles: MatrimonyProfile[]) {
  const usedPhotos = new Set<string>()
  let fallbackIndex = 0

  return profiles.map((profile) => {
    const uniquePhotos = profile.photos
      .map(normalizePhotoUrl)
      .filter(Boolean)
      .filter((photo) => {
        if (usedPhotos.has(photo)) return false
        usedPhotos.add(photo)
        return true
      })

    if (uniquePhotos.length > 0) {
      return { ...profile, photos: uniquePhotos }
    }

    const fallbackPhoto =
      FALLBACK_DISCOVERY_PHOTOS.find((photo) => !usedPhotos.has(photo)) ||
      `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(profile.id)}`

    usedPhotos.add(fallbackPhoto)
    fallbackIndex += 1

    return {
      ...profile,
      photos: [fallbackPhoto || FALLBACK_DISCOVERY_PHOTOS[fallbackIndex % FALLBACK_DISCOVERY_PHOTOS.length]],
    }
  })
}
