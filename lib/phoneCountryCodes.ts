export interface PhoneCountryCodeOption {
  iso2: string
  country: string
  dialCode: string
  example: string
}

export const DEFAULT_PHONE_COUNTRY_CODE = "IN"

export const PHONE_COUNTRY_CODES: PhoneCountryCodeOption[] = [
  { iso2: "IN", country: "India", dialCode: "+91", example: "98765 43210" },
  { iso2: "US", country: "United States", dialCode: "+1", example: "555 123 4567" },
  { iso2: "AE", country: "United Arab Emirates", dialCode: "+971", example: "50 123 4567" },
  { iso2: "SA", country: "Saudi Arabia", dialCode: "+966", example: "50 123 4567" },
  { iso2: "GB", country: "United Kingdom", dialCode: "+44", example: "7400 123456" },
  { iso2: "CA", country: "Canada", dialCode: "+1", example: "555 123 4567" },
  { iso2: "AU", country: "Australia", dialCode: "+61", example: "412 345 678" },
  { iso2: "NZ", country: "New Zealand", dialCode: "+64", example: "21 123 4567" },
  { iso2: "PK", country: "Pakistan", dialCode: "+92", example: "300 1234567" },
  { iso2: "BD", country: "Bangladesh", dialCode: "+880", example: "1712 345678" },
  { iso2: "LK", country: "Sri Lanka", dialCode: "+94", example: "71 234 5678" },
  { iso2: "NP", country: "Nepal", dialCode: "+977", example: "984 1234567" },
  { iso2: "SG", country: "Singapore", dialCode: "+65", example: "8123 4567" },
  { iso2: "MY", country: "Malaysia", dialCode: "+60", example: "12 345 6789" },
  { iso2: "ID", country: "Indonesia", dialCode: "+62", example: "812 3456 7890" },
  { iso2: "TH", country: "Thailand", dialCode: "+66", example: "81 234 5678" },
  { iso2: "PH", country: "Philippines", dialCode: "+63", example: "917 123 4567" },
  { iso2: "VN", country: "Vietnam", dialCode: "+84", example: "91 234 5678" },
  { iso2: "CN", country: "China", dialCode: "+86", example: "131 2345 6789" },
  { iso2: "HK", country: "Hong Kong", dialCode: "+852", example: "5123 4567" },
  { iso2: "JP", country: "Japan", dialCode: "+81", example: "90 1234 5678" },
  { iso2: "KR", country: "South Korea", dialCode: "+82", example: "10 1234 5678" },
  { iso2: "ZA", country: "South Africa", dialCode: "+27", example: "82 123 4567" },
  { iso2: "NG", country: "Nigeria", dialCode: "+234", example: "802 123 4567" },
  { iso2: "KE", country: "Kenya", dialCode: "+254", example: "712 345678" },
  { iso2: "EG", country: "Egypt", dialCode: "+20", example: "100 123 4567" },
  { iso2: "TR", country: "Turkey", dialCode: "+90", example: "532 123 4567" },
  { iso2: "QA", country: "Qatar", dialCode: "+974", example: "3312 3456" },
  { iso2: "KW", country: "Kuwait", dialCode: "+965", example: "500 12345" },
  { iso2: "BH", country: "Bahrain", dialCode: "+973", example: "3600 1234" },
  { iso2: "OM", country: "Oman", dialCode: "+968", example: "9123 4567" },
  { iso2: "FR", country: "France", dialCode: "+33", example: "6 12 34 56 78" },
  { iso2: "DE", country: "Germany", dialCode: "+49", example: "151 23456789" },
  { iso2: "IT", country: "Italy", dialCode: "+39", example: "312 345 6789" },
  { iso2: "ES", country: "Spain", dialCode: "+34", example: "612 345 678" },
  { iso2: "PT", country: "Portugal", dialCode: "+351", example: "912 345 678" },
  { iso2: "NL", country: "Netherlands", dialCode: "+31", example: "6 12345678" },
  { iso2: "BE", country: "Belgium", dialCode: "+32", example: "470 12 34 56" },
  { iso2: "CH", country: "Switzerland", dialCode: "+41", example: "76 123 45 67" },
  { iso2: "SE", country: "Sweden", dialCode: "+46", example: "70 123 45 67" },
  { iso2: "NO", country: "Norway", dialCode: "+47", example: "406 12 345" },
  { iso2: "DK", country: "Denmark", dialCode: "+45", example: "20 12 34 56" },
  { iso2: "IE", country: "Ireland", dialCode: "+353", example: "85 123 4567" },
  { iso2: "BR", country: "Brazil", dialCode: "+55", example: "11 91234 5678" },
  { iso2: "MX", country: "Mexico", dialCode: "+52", example: "55 1234 5678" },
  { iso2: "AR", country: "Argentina", dialCode: "+54", example: "9 11 1234 5678" },
  { iso2: "CL", country: "Chile", dialCode: "+56", example: "9 6123 4567" },
  { iso2: "CO", country: "Colombia", dialCode: "+57", example: "300 1234567" },
  { iso2: "PE", country: "Peru", dialCode: "+51", example: "912 345 678" },
  { iso2: "RU", country: "Russia", dialCode: "+7", example: "912 345 67 89" },
  { iso2: "UA", country: "Ukraine", dialCode: "+380", example: "50 123 4567" },
  { iso2: "PL", country: "Poland", dialCode: "+48", example: "512 345 678" },
  { iso2: "RO", country: "Romania", dialCode: "+40", example: "712 345 678" },
  { iso2: "GR", country: "Greece", dialCode: "+30", example: "691 234 5678" },
  { iso2: "IL", country: "Israel", dialCode: "+972", example: "50 123 4567" },
  { iso2: "IR", country: "Iran", dialCode: "+98", example: "912 345 6789" },
  { iso2: "IQ", country: "Iraq", dialCode: "+964", example: "770 123 4567" },
  { iso2: "JO", country: "Jordan", dialCode: "+962", example: "79 123 4567" },
  { iso2: "LB", country: "Lebanon", dialCode: "+961", example: "71 123 456" },
  { iso2: "MA", country: "Morocco", dialCode: "+212", example: "612 345678" },
  { iso2: "DZ", country: "Algeria", dialCode: "+213", example: "551 234 567" },
  { iso2: "TN", country: "Tunisia", dialCode: "+216", example: "20 123 456" },
  { iso2: "GH", country: "Ghana", dialCode: "+233", example: "24 123 4567" },
  { iso2: "TZ", country: "Tanzania", dialCode: "+255", example: "712 345 678" },
  { iso2: "UG", country: "Uganda", dialCode: "+256", example: "712 345678" },
  { iso2: "ET", country: "Ethiopia", dialCode: "+251", example: "91 123 4567" },
]

export function getDefaultPhoneCountryCode() {
  return PHONE_COUNTRY_CODES.find((option) => option.iso2 === DEFAULT_PHONE_COUNTRY_CODE) || PHONE_COUNTRY_CODES[0]
}

export function getPhoneCountryCodeByIso(iso2: string) {
  return PHONE_COUNTRY_CODES.find((option) => option.iso2 === iso2) || getDefaultPhoneCountryCode()
}

export function getDialCodeDigits(dialCode: string) {
  return dialCode.replace(/\D/g, "")
}

export function composeInternationalPhoneNumber(country: PhoneCountryCodeOption, nationalNumber: string) {
  const digits = nationalNumber.replace(/\D/g, "")
  if (!digits) return ""
  return `${country.dialCode}${digits}`
}

export function splitInternationalPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "")
  const defaultCountry = getDefaultPhoneCountryCode()
  if (!digits) {
    return { country: defaultCountry, nationalNumber: "" }
  }

  const matchedCountry =
    [...PHONE_COUNTRY_CODES]
      .sort((left, right) => getDialCodeDigits(right.dialCode).length - getDialCodeDigits(left.dialCode).length)
      .find((option) => digits.startsWith(getDialCodeDigits(option.dialCode))) || defaultCountry

  const dialDigits = getDialCodeDigits(matchedCountry.dialCode)
  const nationalNumber = digits.startsWith(dialDigits) ? digits.slice(dialDigits.length) : digits

  return { country: matchedCountry, nationalNumber }
}
