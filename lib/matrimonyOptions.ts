export const EDUCATION_OPTIONS = [
  "High School",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "MBA",
  "PhD",
  "Medical Degree",
  "Law Degree",
  "Chartered Accountant",
  "Professional Degree",
  "Other",
] as const

export const PROFESSION_OPTIONS = [
  "Software Engineer",
  "Data Scientist",
  "Product Manager",
  "Business Analyst",
  "Consultant",
  "Doctor",
  "Engineer",
  "Teacher",
  "Professor",
  "Lawyer",
  "Accountant",
  "Architect",
  "Designer",
  "Marketing Manager",
  "Sales Manager",
  "HR Manager",
  "Operations Manager",
  "Financial Analyst",
  "Investment Banker",
  "Entrepreneur",
  "Business Owner",
  "Nurse",
  "Pharmacist",
  "Dentist",
  "Scientist",
  "Researcher",
  "Journalist",
  "Writer",
  "Artist",
  "Chef",
  "Pilot",
  "Civil Servant",
  "Government Employee",
  "Student",
  "Homemaker",
  "Retired",
  "Other",
] as const

export const INCOME_OPTIONS = [
  "Prefer not to say",
  "Student / Not working",
  "Below 3 LPA",
  "3-5 LPA",
  "5-10 LPA",
  "10-15 LPA",
  "15-25 LPA",
  "25-50 LPA",
  "50 LPA-1 Cr",
  "1 Cr+",
  "Other",
] as const

export const COMPLEXION_OPTIONS = ["Fair", "Wheatish", "Dusky", "Dark"] as const

export const BODY_TYPE_OPTIONS = ["Slim", "Athletic", "Average", "Plus-size"] as const

export const DIET_OPTIONS = [
  "Vegetarian",
  "Eggetarian",
  "Non-vegetarian",
  "Pescatarian",
  "Vegan",
  "Jain",
  "Other",
] as const

export const MARITAL_STATUS_OPTIONS = ["Never Married", "Divorced", "Widowed", "Annulled", "Separated"] as const

export const FAMILY_TYPE_OPTIONS = ["Joint", "Nuclear", "Extended", "Single Parent"] as const

export const FAMILY_VALUES_OPTIONS = ["Traditional", "Moderate", "Modern", "Progressive"] as const

export const SIBLINGS_MARRIED_OPTIONS = ["None", "Some", "All", "Mostly Married", "Mostly Single"] as const

export const RELIGION_OPTIONS = [
  "Hinduism",
  "Islam",
  "Christianity",
  "Sikhism",
  "Buddhism",
  "Jainism",
  "Judaism",
  "Zoroastrianism",
  "Bahai",
  "Atheist",
  "Agnostic",
  "Spiritual",
  "Other",
] as const

export const MOTHER_TONGUE_OPTIONS = [
  "Hindi",
  "English",
  "Bengali",
  "Telugu",
  "Marathi",
  "Tamil",
  "Gujarati",
  "Urdu",
  "Kannada",
  "Odia",
  "Malayalam",
  "Punjabi",
  "Assamese",
  "Sanskrit",
  "Kashmiri",
  "Sindhi",
  "Konkani",
  "Manipuri",
  "Nepali",
  "Bodo",
  "Santhali",
  "Maithili",
  "Dogri",
  "Other",
] as const

export const COMMUNITY_OPTIONS = [
  "Open to all",
  "Brahmin",
  "Kshatriya",
  "Vaishya",
  "Jain",
  "Muslim",
  "Christian",
  "Sikh",
  "Other",
] as const

export const STAR_RAASHI_OPTIONS = [
  "Not sure",
  "Aries / Mesh",
  "Taurus / Vrishabh",
  "Gemini / Mithun",
  "Cancer / Kark",
  "Leo / Singh",
  "Virgo / Kanya",
  "Libra / Tula",
  "Scorpio / Vrischik",
  "Sagittarius / Dhanu",
  "Capricorn / Makar",
  "Aquarius / Kumbh",
  "Pisces / Meen",
  "Other",
] as const

export function withoutOther(options: readonly string[]) {
  return options.filter((option) => option !== "Other")
}
