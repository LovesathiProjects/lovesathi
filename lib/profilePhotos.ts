export const MAX_PROFILE_PHOTO_BYTES = 10 * 1024 * 1024

const photoExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
}

export function validateProfilePhoto(file: { type: string; size: number }) {
  const extension = photoExtensions[file.type.toLowerCase()]
  if (!extension) throw new Error("Choose a JPG, PNG, WebP, GIF or AVIF photo.")
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error("This photo is empty. Please choose another photo.")
  if (file.size > MAX_PROFILE_PHOTO_BYTES) throw new Error("Each photo must be 10 MB or smaller.")
  return extension
}

export function isSavedProfilePhoto(url: string) {
  try {
    const parsed = new URL(url)
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && !parsed.username && !parsed.password
  } catch {
    return false
  }
}

export function validateSavedProfilePhotos(photos: string[]) {
  if (photos.length < 2 || photos.length > 6) throw new Error("Please keep between 2 and 6 profile photos.")
  if (!photos.every(isSavedProfilePhoto)) throw new Error("Some photos were not uploaded successfully. Remove them and upload them again.")
}
