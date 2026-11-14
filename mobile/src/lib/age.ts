// A date of birth is a calendar date, not a UTC timestamp.
function parseCalendarDate(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

export function calculateAgeFromDate(dateString?: string | null, today = new Date()) {
  const birth = parseCalendarDate(dateString)
  if (!birth || birth > today) return null
  let age = today.getFullYear() - birth.getFullYear()
  const monthDelta = today.getMonth() - birth.getMonth()

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }

  return age
}

export function getMinimumBirthDate(minimumAge = 18, today = new Date()) {
  const year = today.getFullYear() - minimumAge
  const month = today.getMonth()
  // Clamp February 29 when the target year is not a leap year.
  const day = Math.min(today.getDate(), new Date(year, month + 1, 0).getDate())
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function formatDateForDisplay(dateString?: string | null) {
  const date = parseCalendarDate(dateString)
  if (!date) return null

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}
