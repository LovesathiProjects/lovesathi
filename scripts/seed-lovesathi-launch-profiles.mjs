import dotenv from "dotenv"
import { randomUUID } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local", quiet: true })
dotenv.config({ quiet: true })

const shouldApply = process.argv.includes("--apply")
const shouldSkipAuthDelete = process.argv.includes("--keep-auth")
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const seedPassword = process.env.LOVESATHI_SEED_PASSWORD || `Ls-${randomUUID()}-Seed9!`

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

const femaleFirstNames = [
  "Aarohi", "Aditi", "Ahana", "Ananya", "Anika", "Anushka", "Avni", "Bhavika", "Diya", "Eesha",
  "Ira", "Ishita", "Jhanvi", "Kavya", "Kiara", "Mahi", "Meera", "Myra", "Naina", "Navya",
  "Neha", "Pari", "Prisha", "Radhika", "Rhea", "Riya", "Saanvi", "Samaira", "Sanika", "Sara",
  "Shanaya", "Shruti", "Siya", "Tanvi", "Tara", "Trisha", "Vanya", "Vedika", "Ayesha", "Inaya",
  "Mira", "Pooja", "Sakshi", "Sanjana", "Nikita", "Mitali", "Prachi", "Vaidehi", "Aaradhya", "Devika",
  "Garima", "Harini", "Janvi", "Kashish", "Lavanya", "Manya", "Niyati", "Ojasvi", "Palak", "Reva",
  "Saisha", "Tisha", "Urvi", "Yamini", "Zoya", "Charvi", "Dhriti", "Esha", "Hiral", "Ketki",
]

const maleFirstNames = [
  "Aarav", "Aditya", "Akash", "Aman", "Arjun", "Atharv", "Dev", "Dhruv", "Ishaan", "Kabir",
  "Karan", "Kunal", "Manav", "Neel", "Nikhil", "Pranav", "Rahul", "Rohan", "Rudra", "Samar",
  "Shaan", "Siddharth", "Tanay", "Vihaan", "Vikram", "Yash", "Zain", "Abhay", "Aniket", "Darsh",
  "Harsh", "Jay", "Krish", "Mihir", "Naman", "Omkar", "Parth", "Raghav", "Reyansh", "Sahil",
  "Sarthak", "Shreyas", "Tanish", "Varun", "Vivaan", "Advait", "Aryan", "Kartik", "Ritvik", "Vedant",
]

const lastNames = [
  "Agarwal", "Bansal", "Batra", "Chopra", "Desai", "Gokhale", "Gupta", "Iyer", "Jadhav", "Jain",
  "Joshi", "Kapoor", "Khan", "Kulkarni", "Malhotra", "Mehta", "Menon", "Nair", "Patel", "Rao",
  "Reddy", "Saxena", "Shah", "Sharma", "Singh", "Trivedi", "Varma", "Vaidya", "Apte", "Bhonsle",
]

const communities = [
  "Maratha", "Brahmin", "Agarwal", "Jain", "CKP", "Khatri", "Kayastha", "Patel", "Sunni", "Punjabi",
  "Sindhi", "Gujarati", "Konkani", "Maharashtrian", "Rajput",
]

const motherTongues = ["Marathi", "Hindi", "Gujarati", "Punjabi", "Urdu", "Konkani", "Sindhi"]

const educations = [
  "MBA, NMIMS Mumbai",
  "B.Tech, COEP Pune",
  "M.Com, University of Mumbai",
  "MBBS, BJ Medical College Pune",
  "CA, ICAI",
  "M.Des, IDC Mumbai",
  "LLB, Government Law College Mumbai",
  "M.Sc Data Science, Pune University",
  "B.Arch, Sir JJ College of Architecture",
  "M.Tech, VJTI Mumbai",
]

const professions = [
  "Product Manager",
  "Doctor",
  "Chartered Accountant",
  "UX Designer",
  "Software Engineer",
  "Finance Analyst",
  "Marketing Manager",
  "Corporate Lawyer",
  "Data Scientist",
  "Architect",
  "Founder",
  "Consultant",
  "Professor",
  "Operations Lead",
]

const incomeBands = [
  "Rs. 5 - 10 Lakh p.a",
  "Rs. 10 - 15 Lakh p.a",
  "Rs. 15 - 20 Lakh p.a",
  "Rs. 20 - 30 Lakh p.a",
]

const mumbaiAreas = [
  "Bandra", "Powai", "Andheri West", "Dadar", "Chembur", "Goregaon", "Thane", "Navi Mumbai",
  "Mulund", "Worli", "Borivali", "Kandivali", "Vikhroli", "Lower Parel",
]

const puneAreas = [
  "Koregaon Park", "Kothrud", "Baner", "Aundh", "Viman Nagar", "Hinjawadi", "Wakad", "Shivajinagar",
  "Magarpatta", "Pimple Saudagar", "Hadapsar", "Kalyani Nagar",
]

const lifestyleTraits = [
  "family-first",
  "calm and practical",
  "career-focused",
  "community-oriented",
  "thoughtful and grounded",
  "warm, organised, and future-ready",
]

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "LS"
}

function profileVisual(profile) {
  const palette = profile.gender === "Female"
    ? ["#fff7fb", "#f7bfd0", "#E83262", "#5f0012"]
    : ["#f7fbff", "#bdd7f7", "#26364A", "#172235"]
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="920" viewBox="0 0 720 920">
  <defs>
    <radialGradient id="bg" cx="28%" cy="18%" r="92%">
      <stop offset="0%" stop-color="${palette[0]}"/>
      <stop offset="52%" stop-color="${palette[1]}"/>
      <stop offset="100%" stop-color="${palette[3]}"/>
    </radialGradient>
    <linearGradient id="card" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.82)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.2)"/>
    </linearGradient>
  </defs>
  <rect width="720" height="920" fill="url(#bg)"/>
  <circle cx="560" cy="124" r="118" fill="#d9ad4f" opacity="0.26"/>
  <circle cx="136" cy="740" r="190" fill="#ffffff" opacity="0.16"/>
  <path d="M110 250C170 154 284 120 404 152C530 185 612 294 602 424C592 552 495 648 360 670C231 691 122 620 82 500C52 408 58 332 110 250Z" fill="url(#card)" opacity="0.76"/>
  <circle cx="360" cy="356" r="136" fill="rgba(255,255,255,0.72)"/>
  <text x="360" y="405" text-anchor="middle" font-family="Georgia, serif" font-size="118" font-weight="700" fill="${palette[2]}">${initials(profile.name)}</text>
  <text x="360" y="642" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${profile.publicId}</text>
  <text x="360" y="688" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="3" fill="rgba(255,255,255,0.88)">${profile.city.toUpperCase()} MATRIMONY PROFILE</text>
</svg>`.trim()
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}

function cityFor(gender, index) {
  const useMumbai = (index * 7 + (gender === "Female" ? 3 : 5)) % 11 < 6
  const city = useMumbai ? "Mumbai" : "Pune"
  const areaList = useMumbai ? mumbaiAreas : puneAreas
  const area = areaList[(index * 5 + (gender === "Female" ? 2 : 4)) % areaList.length]
  return { city, area }
}

function phoneFor(gender, index) {
  const prefix = gender === "Female" ? "91755" : "91844"
  const suffix = String(10000 + index * 73 + (gender === "Female" ? 17 : 31)).slice(-5)
  return `+91${prefix}${suffix}`
}

function buildProfile(gender, index) {
  const firstNames = gender === "Female" ? femaleFirstNames : maleFirstNames
  const firstName = firstNames[index]
  const lastName = lastNames[(index * 7 + (gender === "Female" ? 4 : 11)) % lastNames.length]
  const { city, area } = cityFor(gender, index)
  const cityCode = city === "Mumbai" ? "MUM" : "PUN"
  const genderCode = gender === "Female" ? "F" : "M"
  const sequence = String(index + 1).padStart(3, "0")
  const age = gender === "Female" ? 24 + (index % 10) : 27 + (index % 11)
  const heightCm = gender === "Female" ? 153 + (index % 19) : 168 + (index % 21)
  const education = educations[(index * 3 + (gender === "Female" ? 1 : 0)) % educations.length]
  const profession = professions[(index * 5 + (gender === "Female" ? 3 : 6)) % professions.length]
  const community = communities[(index * 4 + (gender === "Female" ? 1 : 2)) % communities.length]
  const motherTongue = motherTongues[(index * 3 + (city === "Mumbai" ? 1 : 0)) % motherTongues.length]
  const income = incomeBands[(index * 2 + (gender === "Female" ? 0 : 1)) % incomeBands.length]
  const name = `${firstName} ${lastName}`
  const publicId = `LS${cityCode}${genderCode}${sequence}`
  const trait = lifestyleTraits[index % lifestyleTraits.length]

  const profile = {
    email: `seed.${gender.toLowerCase()}.${sequence}@lovesathi.example`,
    phone: phoneFor(gender, index),
    name,
    age,
    city,
    area,
    publicId,
    gender,
    community,
    education,
    profession,
    motherTongue,
    income,
    heightCm,
  }

  return {
    ...profile,
    photo: profileVisual(profile),
    bio: `${name} is a ${trait} ${profession.toLowerCase()} based around ${area}, ${city}. The family is looking for a respectful match with shared values, emotional maturity, and a clear readiness for marriage.`,
  }
}

function buildProfiles() {
  return [
    ...femaleFirstNames.map((_, index) => buildProfile("Female", index)),
    ...maleFirstNames.map((_, index) => buildProfile("Male", index)),
  ]
}

function isSeededAuthUser(user) {
  const email = String(user.email || "").toLowerCase()
  return Boolean(user.user_metadata?.seeded_profile) ||
    email.startsWith("lovesathi.demo.") ||
    email.startsWith("seed.female.") ||
    email.startsWith("seed.male.")
}

async function listAllAuthUsers() {
  const users = []
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 100) break
  }
  return users
}

async function deleteWhereIn(table, column, userIds) {
  if (userIds.length === 0) return
  const { error } = await supabase.from(table).delete().in(column, userIds)
  if (error) {
    console.warn(`Unable to clean ${table}.${column}: ${error.message}`)
  }
}

async function cleanupSeededProfiles() {
  const [{ data: seededRows, error: seededRowsError }, authUsers] = await Promise.all([
    supabase.from("matrimony_profile_full").select("user_id").eq("is_seeded_profile", true),
    listAllAuthUsers(),
  ])
  if (seededRowsError) throw seededRowsError

  const seededAuthUsers = authUsers.filter(isSeededAuthUser)
  const seededUserIds = Array.from(
    new Set([
      ...(seededRows || []).map((row) => row.user_id),
      ...seededAuthUsers.map((user) => user.id),
    ].filter(Boolean)),
  )

  await deleteWhereIn("messages", "sender_id", seededUserIds)
  await deleteWhereIn("messages", "receiver_id", seededUserIds)
  await deleteWhereIn("matrimony_likes", "liker_id", seededUserIds)
  await deleteWhereIn("matrimony_likes", "liked_id", seededUserIds)
  await deleteWhereIn("matrimony_matches", "user1_id", seededUserIds)
  await deleteWhereIn("matrimony_matches", "user2_id", seededUserIds)
  await deleteWhereIn("matrimony_profile_views", "viewer_id", seededUserIds)
  await deleteWhereIn("matrimony_profile_views", "viewed_user_id", seededUserIds)
  await deleteWhereIn("shortlists", "user_id", seededUserIds)
  await deleteWhereIn("shortlists", "shortlisted_user_id", seededUserIds)
  await deleteWhereIn("id_verifications", "user_id", seededUserIds)
  await deleteWhereIn("user_entitlements", "user_id", seededUserIds)
  await deleteWhereIn("matrimony_profile_full", "user_id", seededUserIds)
  await deleteWhereIn("user_profiles", "user_id", seededUserIds)

  if (!shouldSkipAuthDelete) {
    for (const user of seededAuthUsers) {
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      if (error) {
        console.warn(`Unable to delete seeded auth user ${user.email}: ${error.message}`)
      }
    }
  }

  return seededUserIds.length
}

async function ensureAuthUser(profile) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: profile.email,
    password: seedPassword,
    email_confirm: true,
    phone: profile.phone,
    phone_confirm: true,
    user_metadata: {
      name: profile.name,
      gender: profile.gender,
      phone: profile.phone,
      seeded_profile: true,
      public_profile_id: profile.publicId,
    },
    app_metadata: {
      seeded_profile: true,
    },
  })

  if (error) throw error
  return data.user
}

async function upsertProfile(user, profile, index) {
  const now = new Date().toISOString()
  const dateOfBirthYear = new Date().getFullYear() - profile.age
  const religion = profile.community === "Sunni" ? "Islam" : "Hindu"
  const oppositeGender = profile.gender === "Female" ? "Male" : "Female"

  const { error: userProfileError } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      gender: profile.gender.toLowerCase(),
      phone: profile.phone,
      date_of_birth: `${dateOfBirthYear}-${String((index % 12) + 1).padStart(2, "0")}-15`,
      selected_path: "matrimony",
      onboarding_completed: true,
      onboarding_matrimony: true,
      onboarding_completed_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  )
  if (userProfileError) throw userProfileError

  const { error: matrimonyError } = await supabase.from("matrimony_profile_full").upsert(
    {
      user_id: user.id,
      public_profile_id: profile.publicId,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      created_by: index % 7 === 0 ? "Parent" : index % 11 === 0 ? "Sibling" : "Self",
      photos: [profile.photo],
      personal: {
        height_cm: profile.heightCm,
        height_unit: "cm",
        diet: index % 5 === 0 ? "Vegetarian" : index % 7 === 0 ? "Jain vegetarian" : "Non-vegetarian",
        smoker: false,
        drinker: index % 9 === 0,
        body_type: "Average",
        marital_status: "Never Married",
      },
      career: {
        highest_education: profile.education,
        job_title: profile.profession,
        annual_income: profile.income,
        work_location: {
          area: profile.area,
          city: profile.city,
          state: "Maharashtra",
          country: "India",
        },
      },
      family: {
        family_type: index % 3 === 0 ? "Joint Family" : "Nuclear Family",
        family_values: index % 4 === 0 ? "Traditional" : "Moderate",
        father_occupation: index % 2 === 0 ? "Business" : "Service",
        mother_occupation: index % 3 === 0 ? "Teacher" : "Homemaker",
        brothers: index % 3,
        sisters: (index + 1) % 3,
        show_on_profile: true,
      },
      cultural: {
        religion,
        mother_tongue: profile.motherTongue,
        community: profile.community,
        place_of_birth: `${profile.city}, Maharashtra, India`,
      },
      bio: profile.bio,
      partner_preferences: {
        preferred_gender: oppositeGender,
        min_age: profile.gender === "Female" ? profile.age : Math.max(21, profile.age - 5),
        max_age: profile.gender === "Female" ? profile.age + 7 : profile.age + 2,
        min_height_cm: profile.gender === "Female" ? 165 : 150,
        max_height_cm: profile.gender === "Female" ? 190 : 178,
        locations: ["Mumbai, Maharashtra, India", "Pune, Maharashtra, India"],
        communities: ["Open to all"],
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
      profile_hidden: false,
      is_seeded_profile: true,
      profile_visibility_label: null,
      admin_review_status: "approved",
      admin_review_notes: "Seeded Mumbai/Pune launch profile.",
      admin_reviewed_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  )
  if (matrimonyError) throw matrimonyError

  const { error: verificationError } = await supabase.from("id_verifications").upsert(
    {
      user_id: user.id,
      document_type: "aadhar",
      document_file_name: `${profile.publicId}-verified-placeholder`,
      document_file_size: 0,
      verification_status: "approved",
      verification_notes: "Seeded launch profile marked as admin reviewed.",
      verified_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  )
  if (verificationError) throw verificationError
}

const profiles = buildProfiles()

if (!shouldApply) {
  console.log("Dry run only. Re-run with --apply to replace seeded Lovesathi profiles.")
  console.log(`Will seed ${profiles.filter((profile) => profile.gender === "Female").length} female profiles.`)
  console.log(`Will seed ${profiles.filter((profile) => profile.gender === "Male").length} male profiles.`)
  console.table(profiles.slice(0, 12).map(({ publicId, email, name, gender, city, area }) => ({ publicId, email, name, gender, city, area })))
  process.exit(0)
}

const removedCount = await cleanupSeededProfiles()
console.log(`Removed ${removedCount} existing seeded or legacy preview user records.`)

for (let index = 0; index < profiles.length; index += 1) {
  const profile = profiles[index]
  const user = await ensureAuthUser(profile)
  await upsertProfile(user, profile, index)
  console.log(`Seeded ${profile.publicId} ${profile.name} (${profile.gender}, ${profile.city})`)
}

console.log(`Done. Seeded ${profiles.length} Mumbai/Pune launch profiles.`)
