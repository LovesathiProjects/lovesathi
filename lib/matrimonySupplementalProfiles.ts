import type { MatrimonyProfile } from "@/lib/mockMatrimonyProfiles"

type ViewerGender = string | null | undefined
type SupplementalGender = "male" | "female"

const FEMALE_FIRST_NAMES = [
  "Aarohi",
  "Aditi",
  "Aisha",
  "Ananya",
  "Anika",
  "Avni",
  "Diya",
  "Divya",
  "Ira",
  "Ishita",
  "Kavya",
  "Kiara",
  "Meera",
  "Naina",
  "Neha",
  "Priya",
  "Rhea",
  "Riya",
  "Saanvi",
  "Sanya",
  "Shruti",
  "Simran",
  "Tanvi",
  "Trisha",
  "Zara",
]

const MALE_FIRST_NAMES = [
  "Aarav",
  "Aditya",
  "Akash",
  "Aman",
  "Arjun",
  "Dev",
  "Ishaan",
  "Kabir",
  "Karan",
  "Kunal",
  "Manav",
  "Neel",
  "Nikhil",
  "Pranav",
  "Rahul",
  "Rohan",
  "Rudra",
  "Samar",
  "Shaan",
  "Siddharth",
  "Tanay",
  "Vihaan",
  "Vikram",
  "Yash",
  "Zain",
]

const LAST_NAMES = [
  "Agarwal",
  "Bansal",
  "Batra",
  "Chopra",
  "Desai",
  "Gupta",
  "Iyer",
  "Jain",
  "Kapoor",
  "Khan",
  "Krishnan",
  "Malhotra",
  "Mehta",
  "Menon",
  "Nair",
  "Patel",
  "Rao",
  "Reddy",
  "Saxena",
  "Shah",
  "Sharma",
  "Singh",
  "Trivedi",
  "Varma",
]

const LOCATIONS = [
  "Mumbai, Maharashtra, India",
  "Delhi, Delhi, India",
  "Bengaluru, Karnataka, India",
  "Hyderabad, Telangana, India",
  "Pune, Maharashtra, India",
  "Chennai, Tamil Nadu, India",
  "Kolkata, West Bengal, India",
  "Ahmedabad, Gujarat, India",
  "Jaipur, Rajasthan, India",
  "Lucknow, Uttar Pradesh, India",
  "Kochi, Kerala, India",
  "Indore, Madhya Pradesh, India",
]

const COMMUNITIES = [
  "Agarwal",
  "Brahmin",
  "Kayastha",
  "Khatri",
  "Maratha",
  "Nair",
  "Patel",
  "Rajput",
  "Reddy",
  "Shia",
  "Sunni",
  "Syrian Christian",
  "Vanniyar",
  "Vokkaliga",
]

const EDUCATION = [
  "MBA, IIM",
  "B.Tech, IIT",
  "M.Tech, NIT",
  "CA, ICAI",
  "MBBS, AIIMS",
  "M.Des, NID",
  "M.A. Economics",
  "LLB, National Law School",
  "M.Sc. Data Science",
]

const PROFESSIONS = [
  "Product Manager",
  "Software Engineer",
  "Doctor",
  "Chartered Accountant",
  "Data Scientist",
  "Corporate Lawyer",
  "UX Designer",
  "Marketing Manager",
  "Business Analyst",
  "Research Scientist",
  "Founder",
  "Finance Consultant",
]

const INTERESTS = [
  ["Travel", "Family", "Fitness", "Music"],
  ["Reading", "Cooking", "Cinema", "Yoga"],
  ["Startups", "Photography", "Food", "Cricket"],
  ["Design", "Dance", "Volunteering", "Culture"],
  ["Finance", "Hiking", "Classical Music", "Technology"],
]

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function targetGendersForViewer(gender: ViewerGender): SupplementalGender[] {
  const normalizedGender = String(gender || "").toLowerCase()
  if (normalizedGender === "male") return ["female"]
  if (normalizedGender === "female") return ["male"]
  return ["female", "male"]
}

function portraitUrl(gender: SupplementalGender, index: number) {
  const portraitGender = gender === "female" ? "women" : "men"
  if (index < 100) return `https://randomuser.me/api/portraits/${portraitGender}/${index}.jpg`
  return `https://i.pravatar.cc/640?u=lovesathi-${gender}-${index}`
}

function buildProfile(gender: SupplementalGender, index: number): MatrimonyProfile {
  const firstNames = gender === "female" ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES
  const firstName = firstNames[index % firstNames.length]
  const lastName = LAST_NAMES[(index * 5 + (gender === "female" ? 3 : 7)) % LAST_NAMES.length]
  const name = `${firstName} ${lastName}`
  const age = gender === "female" ? 24 + (index % 9) : 27 + (index % 10)
  const education = EDUCATION[(index * 3) % EDUCATION.length]
  const profession = PROFESSIONS[(index * 4 + (gender === "female" ? 2 : 0)) % PROFESSIONS.length]
  const location = LOCATIONS[(index * 2 + (gender === "female" ? 1 : 0)) % LOCATIONS.length]
  const community = COMMUNITIES[(index * 7) % COMMUNITIES.length]
  const heightCm = gender === "female" ? 154 + (index % 19) : 168 + (index % 20)
  const interestSet = INTERESTS[index % INTERESTS.length]

  return {
    id: `demo-${gender}-${index}-${slug(name)}`,
    name,
    age,
    education,
    profession,
    location,
    community,
    photos: [portraitUrl(gender, index)],
    bio: `${profession} based in ${location.split(",")[0]}, balancing ambition with family values. Looking for a thoughtful partner and a calm, future-ready relationship.`,
    interests: interestSet,
    verified: true,
    premium: index % 4 === 0,
    demo: true,
    height: `${heightCm} cm`,
    phoneMasked: `+** ******${String(3100 + (index * 37) % 6800).padStart(4, "0")}`,
    canRevealPhone: false,
  }
}

export function buildSupplementalMatrimonyProfiles({
  currentUserGender,
  excludedIds,
  excludedNames,
  targetCount = 240,
}: {
  currentUserGender?: ViewerGender
  excludedIds: Set<string>
  excludedNames: Set<string>
  targetCount?: number
}) {
  const profiles: MatrimonyProfile[] = []
  const genders = targetGendersForViewer(currentUserGender)
  const perGenderCount = 360

  for (const gender of genders) {
    for (let index = 0; index < perGenderCount; index += 1) {
      const profile = buildProfile(gender, index)
      if (excludedIds.has(profile.id)) continue
      if (excludedNames.has(profile.name.toLowerCase())) continue
      profiles.push(profile)
      if (profiles.length >= targetCount) return profiles
    }
  }

  return profiles
}
