type BioSource = {
  name?: string | null
  career?: Record<string, any> | null
  cultural?: Record<string, any> | null
  family?: Record<string, any> | null
  personal?: Record<string, any> | null
}

function firstValue(source: Record<string, any> | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = source?.[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

export function generateSmartBioSuggestions({ name, career, cultural, family, personal }: BioSource) {
  const cleanName = name?.trim()
  const subject = cleanName || "I"
  const verb = cleanName ? "is" : "am"
  const role = firstValue(career, "jobTitle", "job_title") || "a grounded professional"
  const education = firstValue(career, "highestEducation", "highest_education")
  const workLocation = career?.workLocation || career?.work_location || {}
  const city = firstValue(workLocation, "city")
  const religion = firstValue(cultural, "religion")
  const familyValues = firstValue(family, "familyValues", "family_values")
  const diet = firstValue(personal, "diet")
  const faith = religion ? `${religion.toLowerCase()} values` : "family values"
  const familyTone = familyValues ? `${familyValues.toLowerCase()} family values` : "warm family values"
  const lifestyle = diet ? `${diet.toLowerCase()} lifestyle` : "balanced lifestyle"

  return [
    `${subject} ${verb} ${role}${education ? ` with a ${education} background` : ""}${city ? ` based in ${city}` : ""}, known for a calm, sincere nature and ${familyTone}. Looking for a life partner who values respect, loyalty, and meaningful family bonds.`,
    `I believe marriage is built on trust, patience, and shared growth. My life is guided by ${faith}, a ${lifestyle}, and the hope of building a peaceful home with the right person.`,
    `A thoughtful and family-oriented person, I value honest conversations, emotional maturity, and mutual support. I am looking for someone kind, grounded, and ready for a serious commitment.`,
  ].map((item) => item.slice(0, 300))
}
