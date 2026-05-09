import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local", quiet: true })
dotenv.config({ quiet: true })

const shouldApply = process.argv.includes("--apply")
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = "123456"

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const firstNames = [
  "Aarohi",
  "Aditi",
  "Ahana",
  "Ananya",
  "Anika",
  "Avni",
  "Bhavya",
  "Diya",
  "Eesha",
  "Ira",
  "Ishita",
  "Jhanvi",
  "Kavya",
  "Kiara",
  "Mahi",
  "Meera",
  "Myra",
  "Naina",
  "Navya",
  "Neha",
  "Pari",
  "Prisha",
  "Radhika",
  "Rhea",
  "Riya",
  "Saanvi",
  "Samaira",
  "Sanika",
  "Sara",
  "Shanaya",
  "Shruti",
  "Siya",
  "Tanvi",
  "Tara",
  "Trisha",
  "Vanya",
  "Vedika",
  "Zara",
  "Ayesha",
  "Inaya",
]

const communities = ["Maratha", "Brahmin", "Agarwal", "Jain", "Sunni", "Patel", "Khatri", "Kayastha"]
const educations = ["MBA", "B.Tech", "M.Com", "MBBS", "CA", "M.Des", "LLB", "M.Sc Data Science"]
const professions = [
  "Product Manager",
  "Doctor",
  "Chartered Accountant",
  "UX Designer",
  "Software Engineer",
  "Finance Analyst",
  "Marketing Manager",
  "Corporate Lawyer",
]
const motherTongues = ["Marathi", "Hindi", "Gujarati", "Urdu", "Punjabi"]

function profileFor(index, name) {
  const city = index % 2 === 0 ? "Mumbai" : "Pune"
  const age = 24 + (index % 9)
  const heightCm = 154 + (index % 18)
  const community = communities[index % communities.length]
  const education = educations[(index * 3) % educations.length]
  const profession = professions[(index * 5) % professions.length]
  const motherTongue = motherTongues[index % motherTongues.length]
  const portraitIndex = 20 + index
  const phoneSuffix = String(510000 + index * 137).slice(-6)

  return {
    email: `lovesathi.demo.${String(index + 1).padStart(2, "0")}@example.com`,
    phone: `+9198${phoneSuffix}`,
    name,
    age,
    city,
    community,
    education,
    profession,
    motherTongue,
    photo: `https://randomuser.me/api/portraits/women/${portraitIndex}.jpg`,
    heightCm,
  }
}

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < 100) return null
  }
  return null
}

async function ensureAuthUser(profile) {
  const existingUser = await findUserByEmail(profile.email)
  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      phone: profile.phone,
      user_metadata: {
        name: profile.name,
        gender: "Female",
        phone: profile.phone,
        seeded_profile: true,
      },
    })
    if (error) throw error
    return data.user
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: profile.email,
    password,
    email_confirm: true,
    phone: profile.phone,
    phone_confirm: true,
    user_metadata: {
      name: profile.name,
      gender: "Female",
      phone: profile.phone,
      seeded_profile: true,
    },
  })
  if (error) throw error
  return data.user
}

async function upsertProfile(user, profile, index) {
  const now = new Date().toISOString()

  const { error: userProfileError } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      gender: "female",
      phone: profile.phone,
      date_of_birth: `${new Date().getFullYear() - profile.age}-01-15`,
      onboarding_matrimony: true,
      updated_at: now,
    },
    { onConflict: "user_id" },
  )
  if (userProfileError) throw userProfileError

  const { error: matrimonyError } = await supabase.from("matrimony_profile_full").upsert(
    {
      user_id: user.id,
      name: profile.name,
      age: profile.age,
      gender: "Female",
      created_by: index % 3 === 0 ? "Parent" : "Self",
      photos: [profile.photo],
      personal: {
        height_cm: profile.heightCm,
        height_unit: "cm",
        diet: index % 4 === 0 ? "Vegetarian" : "Non-vegetarian",
        smoker: false,
        drinker: false,
        marital_status: "Never Married",
      },
      career: {
        highest_education: profile.education,
        job_title: profile.profession,
        annual_income: index % 3 === 0 ? "10-20 LPA" : "6-10 LPA",
        work_location: {
          city: profile.city,
          state: "Maharashtra",
          country: "India",
        },
      },
      family: {
        family_type: index % 2 === 0 ? "Nuclear" : "Joint",
        family_values: "Moderate",
        father_occupation: "Business / Service",
        mother_occupation: "Homemaker",
        brothers: index % 2,
        sisters: (index + 1) % 2,
        show_on_profile: true,
      },
      cultural: {
        religion: index % 5 === 4 ? "Muslim" : "Hindu",
        mother_tongue: profile.motherTongue,
        community: profile.community,
        place_of_birth: `${profile.city}, Maharashtra, India`,
      },
      bio: `${profile.name} is a ${profile.profession.toLowerCase()} based in ${profile.city}, balancing ambition, family values, and a calm approach to marriage.`,
      partner_preferences: {
        min_age: 26,
        max_age: 36,
        min_height_cm: 165,
        max_height_cm: 190,
        locations: ["Mumbai, Maharashtra, India", "Pune, Maharashtra, India"],
        communities: ["Any"],
        education_prefs: ["Any"],
        profession_prefs: ["Any"],
        marital_status_prefs: ["Never Married"],
      },
      step1_completed: true,
      step2_completed: true,
      step3_completed: true,
      step4_completed: true,
      step5_completed: true,
      step6_completed: true,
      step7_completed: true,
      profile_completed: true,
      is_seeded_profile: true,
      admin_review_status: "approved",
      updated_at: now,
    },
    { onConflict: "user_id" },
  )
  if (matrimonyError) throw matrimonyError
}

const profiles = firstNames.map((name, index) => profileFor(index, name))

if (!shouldApply) {
  console.log("Dry run only. Re-run with --apply to create/update these 40 seeded Lovesathi profiles.")
  console.table(profiles.map(({ email, name, city, photo }) => ({ email, name, city, photo })))
  process.exit(0)
}

for (let index = 0; index < profiles.length; index += 1) {
  const profile = profiles[index]
  const user = await ensureAuthUser(profile)
  await upsertProfile(user, profile, index)
  console.log(`Seeded ${profile.name} <${profile.email}>`)
}

console.log("Done. Password for all seeded demo accounts: 123456")
