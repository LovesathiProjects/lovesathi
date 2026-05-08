export function normalizePhoneNumber(value: string) {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, "")
  if (!digits) return ""
  return trimmed.startsWith("+") ? `+${digits}` : digits
}

export function getPhoneDigits(value: string) {
  return value.replace(/\D/g, "")
}

export function isValidPhoneNumber(value: string) {
  const digits = getPhoneDigits(value)
  return digits.length >= 8 && digits.length <= 15
}

export function getPhoneValidationMessage(value: string) {
  if (!value.trim()) return "Phone number is required."
  if (!isValidPhoneNumber(value)) return "Please enter a valid phone number."
  return null
}
