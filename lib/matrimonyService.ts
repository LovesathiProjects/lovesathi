import { supabase } from './supabaseClient'
import type { MatrimonyProfile, MatrimonyPreferences, VerificationPayload } from "@/lib/types"

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Consolidated matrimony profile type - matches matrimony_profile_full table
 */
export interface MatrimonyProfileFull {
  id?: string
  user_id: string
  name: string
  age?: number | null
  gender?: 'Male' | 'Female' | 'Other' | null
  created_by?: 'Self' | 'Parent' | 'Sibling' | 'Other' | null
  photos?: string[] // Array of photo URLs
  personal?: {
    height_cm?: number
    height_unit?: string
    complexion?: string
    body_type?: string
    diet?: string
    smoker?: boolean
    drinker?: boolean
    marital_status?: string
  }
  career?: {
    highest_education?: string
    college?: string
    job_title?: string
    company?: string
    annual_income?: string
    work_location?: {
      city?: string
      state?: string
      country?: string
    }
  }
  family?: {
    family_type?: string
    family_values?: string
    father_occupation?: string
    father_company?: string
    mother_occupation?: string
    mother_company?: string
    brothers?: number
    sisters?: number
    siblings_married?: string
    show_on_profile?: boolean
  }
  cultural?: {
    religion?: string
    mother_tongue?: string
    community?: string
    sub_caste?: string
    date_of_birth?: string
    time_of_birth?: string
    place_of_birth?: string
    star_raashi?: string
    gotra?: string
  }
  bio?: string | null
  partner_preferences?: {
    min_age?: number
    max_age?: number
    min_height_cm?: number
    max_height_cm?: number
    diet_prefs?: string[]
    lifestyle_prefs?: string[]
    education_prefs?: string[]
    profession_prefs?: string[]
    locations?: string[]
    communities?: string[]
    family_type_prefs?: string[]
  }
  step1_completed?: boolean
  step2_completed?: boolean
  step3_completed?: boolean
  step4_completed?: boolean
  step5_completed?: boolean
  step6_completed?: boolean
  step7_completed?: boolean
  profile_completed?: boolean
  created_at?: string
  updated_at?: string
}

export interface ServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

type Draft = {
  profile?: Partial<MatrimonyProfile>
  preferences?: Partial<MatrimonyPreferences>
  verification?: Partial<VerificationPayload>
}

const DRAFT_KEY = "matrimony_draft_v1"

// ============================================
// DRAFT MANAGEMENT (Local Storage)
// ============================================

export async function saveDraft(draft: Draft) {
  if (typeof window === "undefined") return
  const existing = (JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") as Draft) || {}
  const merged = { ...existing, ...draft }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(merged))
}

export async function loadDraft(): Promise<Draft | null> {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(DRAFT_KEY)
  return raw ? (JSON.parse(raw) as Draft) : null
}

export async function clearDraft() {
  if (typeof window === "undefined") return
  localStorage.removeItem(DRAFT_KEY)
}

// ============================================
// FILE UPLOAD
// ============================================

/**
 * Upload photo to Supabase Storage
 */
export async function uploadAsset(file: File): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('matrimony-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('matrimony-photos')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (error: any) {
    console.error('Error uploading asset:', error)
    // Fallback to object URL for development
    return URL.createObjectURL(file)
  }
}

// ============================================
// STEP 1: WELCOME & IDENTITY
// ============================================

/**
 * Save Step 1: Basic profile info and photos
 */
export async function saveStep1(
  userId: string,
  data: {
    name: string
    age: number
    gender: 'Male' | 'Female' | 'Other'
    createdBy: 'Self' | 'Parent' | 'Sibling' | 'Other'
    photoUrls: string[]
  }
): Promise<ServiceResponse> {
  try {
    // Get existing profile to preserve other fields
    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const profileData: any = {
      user_id: userId,
      name: data.name,
      age: data.age,
      gender: data.gender,
      created_by: data.createdBy,
      photos: data.photoUrls,
      step1_completed: true,
    }

    // Preserve other fields if profile exists
    if (existing) {
      profileData.personal = existing.personal || {}
      profileData.career = existing.career || {}
      profileData.family = existing.family || {}
      profileData.cultural = existing.cultural || {}
      profileData.bio = existing.bio || null
      profileData.step2_completed = existing.step2_completed || false
      profileData.step3_completed = existing.step3_completed || false
      profileData.step4_completed = existing.step4_completed || false
      profileData.step5_completed = existing.step5_completed || false
      profileData.step6_completed = existing.step6_completed || false
      profileData.profile_completed = existing.profile_completed || false
    } else {
      // Initialize JSONB fields for new profile
      profileData.personal = {}
      profileData.career = {}
      profileData.family = {}
      profileData.cultural = {}
    }

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' })

    if (error) {
      console.error('Supabase error saving step 1:', error)
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error saving step 1:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// STEP 2: PERSONAL & PHYSICAL DETAILS
// ============================================

/**
 * Save Step 2: Personal and physical details
 */
export async function saveStep2(
  userId: string,
  data: {
    heightCm: number
    heightUnit?: string
    complexion?: string
    bodyType?: string
    diet?: string
    smoker?: boolean
    drinker?: boolean
    maritalStatus: string
  }
): Promise<ServiceResponse> {
  try {
    // Get existing profile to preserve other fields
    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const personalData = {
      height_cm: data.heightCm,
      height_unit: data.heightUnit || 'cm',
      complexion: data.complexion,
      body_type: data.bodyType,
      diet: data.diet,
      smoker: data.smoker || false,
      drinker: data.drinker || false,
      marital_status: data.maritalStatus,
    }

    const profileData: any = {
      user_id: userId,
      name: existing?.name || '',
      personal: personalData,
      step2_completed: true,
    }

    // Preserve other fields
    if (existing) {
      profileData.age = existing.age
      profileData.gender = existing.gender
      profileData.created_by = existing.created_by
      profileData.photos = existing.photos || []
      profileData.career = existing.career || {}
      profileData.family = existing.family || {}
      profileData.cultural = existing.cultural || {}
      profileData.bio = existing.bio || null
      profileData.step1_completed = existing.step1_completed || false
      profileData.step3_completed = existing.step3_completed || false
      profileData.step4_completed = existing.step4_completed || false
      profileData.step5_completed = existing.step5_completed || false
      profileData.step6_completed = existing.step6_completed || false
      profileData.profile_completed = existing.profile_completed || false
    } else {
      profileData.photos = []
      profileData.career = {}
      profileData.family = {}
      profileData.cultural = {}
    }

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' })

    if (error) {
      console.error('Supabase error saving step 2:', error)
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error saving step 2:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// STEP 3: CAREER & EDUCATION
// ============================================

/**
 * Save Step 3: Career and education details
 */
export async function saveStep3(
  userId: string,
  data: {
    highestEducation: string
    college?: string
    jobTitle: string
    company?: string
    annualIncome: string
    workLocation: { city?: string; state?: string; country?: string }
  }
): Promise<ServiceResponse> {
  try {
    // Get existing profile to preserve other fields
    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const careerData = {
      highest_education: data.highestEducation,
      college: data.college,
      job_title: data.jobTitle,
      company: data.company,
      annual_income: data.annualIncome,
      work_location: {
        city: data.workLocation.city,
        state: data.workLocation.state,
        country: data.workLocation.country,
      },
    }

    const profileData: any = {
      user_id: userId,
      name: existing?.name || '',
      career: careerData,
      step3_completed: true,
    }

    // Preserve other fields
    if (existing) {
      profileData.age = existing.age
      profileData.gender = existing.gender
      profileData.created_by = existing.created_by
      profileData.photos = existing.photos || []
      profileData.personal = existing.personal || {}
      profileData.family = existing.family || {}
      profileData.cultural = existing.cultural || {}
      profileData.bio = existing.bio || null
      profileData.step1_completed = existing.step1_completed || false
      profileData.step2_completed = existing.step2_completed || false
      profileData.step4_completed = existing.step4_completed || false
      profileData.step5_completed = existing.step5_completed || false
      profileData.step6_completed = existing.step6_completed || false
      profileData.profile_completed = existing.profile_completed || false
    } else {
      profileData.photos = []
      profileData.personal = {}
      profileData.family = {}
      profileData.cultural = {}
    }

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' })

    if (error) {
      console.error('Supabase error saving step 3:', error)
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error saving step 3:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// STEP 4: FAMILY INFORMATION
// ============================================

/**
 * Save Step 4: Family information
 */
export async function saveStep4(
  userId: string,
  data: {
    familyType?: string
    familyValues?: string
    fatherOccupation?: string
    fatherCompany?: string
    motherOccupation?: string
    motherCompany?: string
    brothers?: number
    sisters?: number
    siblingsMarried?: string
    showOnProfile?: boolean
  }
): Promise<ServiceResponse> {
  try {
    // Get existing profile to preserve other fields
    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const familyData = {
      family_type: data.familyType,
      family_values: data.familyValues,
      father_occupation: data.fatherOccupation,
      father_company: data.fatherCompany,
      mother_occupation: data.motherOccupation,
      mother_company: data.motherCompany,
      brothers: data.brothers || 0,
      sisters: data.sisters || 0,
      siblings_married: data.siblingsMarried,
      show_on_profile: data.showOnProfile || false,
    }

    const profileData: any = {
      user_id: userId,
      name: existing?.name || '',
      family: familyData,
      step4_completed: true,
    }

    // Preserve other fields
    if (existing) {
      profileData.age = existing.age
      profileData.gender = existing.gender
      profileData.created_by = existing.created_by
      profileData.photos = existing.photos || []
      profileData.personal = existing.personal || {}
      profileData.career = existing.career || {}
      profileData.cultural = existing.cultural || {}
      profileData.bio = existing.bio || null
      profileData.step1_completed = existing.step1_completed || false
      profileData.step2_completed = existing.step2_completed || false
      profileData.step3_completed = existing.step3_completed || false
      profileData.step5_completed = existing.step5_completed || false
      profileData.step6_completed = existing.step6_completed || false
      profileData.profile_completed = existing.profile_completed || false
    } else {
      profileData.photos = []
      profileData.personal = {}
      profileData.career = {}
      profileData.cultural = {}
    }

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' })

    if (error) {
      console.error('Supabase error saving step 4:', error)
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error saving step 4:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// STEP 5: CULTURAL & RELIGIOUS DETAILS
// ============================================

/**
 * Save Step 5: Cultural and religious details
 */
export async function saveStep5(
  userId: string,
  data: {
    religion: string
    motherTongue: string
    community: string
    subCaste?: string
    dob: string
    tob: string
    pob: string
    star?: string
    gotra?: string
  }
): Promise<ServiceResponse> {
  try {
    // Get existing profile to preserve other fields
    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const culturalData = {
      religion: data.religion,
      mother_tongue: data.motherTongue,
      community: data.community,
      sub_caste: data.subCaste,
      date_of_birth: data.dob,
      time_of_birth: data.tob,
      place_of_birth: data.pob,
      star_raashi: data.star,
      gotra: data.gotra,
    }

    const profileData: any = {
      user_id: userId,
      name: existing?.name || '',
      cultural: culturalData,
      step5_completed: true,
    }

    // Preserve other fields
    if (existing) {
      profileData.age = existing.age
      profileData.gender = existing.gender
      profileData.created_by = existing.created_by
      profileData.photos = existing.photos || []
      profileData.personal = existing.personal || {}
      profileData.career = existing.career || {}
      profileData.family = existing.family || {}
      profileData.bio = existing.bio || null
      profileData.step1_completed = existing.step1_completed || false
      profileData.step2_completed = existing.step2_completed || false
      profileData.step3_completed = existing.step3_completed || false
      profileData.step4_completed = existing.step4_completed || false
      profileData.step6_completed = existing.step6_completed || false
      profileData.profile_completed = existing.profile_completed || false
    } else {
      profileData.photos = []
      profileData.personal = {}
      profileData.career = {}
      profileData.family = {}
    }

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' })

    if (error) {
      console.error('Supabase error saving step 5:', error)
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error saving step 5:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// STEP 6: BIO
// ============================================

/**
 * Save Step 6: Personal bio
 */
export async function saveStep6(
  userId: string,
  bio: string
): Promise<ServiceResponse> {
  try {
    // Get existing profile to preserve other fields
    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const profileData: any = {
      user_id: userId,
      name: existing?.name || '',
      bio: bio,
      step6_completed: true,
      profile_completed: existing?.step7_completed || false,
    }

    // Preserve other fields
    if (existing) {
      profileData.age = existing.age
      profileData.gender = existing.gender
      profileData.created_by = existing.created_by
      profileData.photos = existing.photos || []
      profileData.personal = existing.personal || {}
      profileData.career = existing.career || {}
      profileData.family = existing.family || {}
      profileData.cultural = existing.cultural || {}
      profileData.step1_completed = existing.step1_completed || false
      profileData.step2_completed = existing.step2_completed || false
      profileData.step3_completed = existing.step3_completed || false
      profileData.step4_completed = existing.step4_completed || false
      profileData.step5_completed = existing.step5_completed || false
      profileData.step7_completed = existing.step7_completed || false
      profileData.partner_preferences = existing.partner_preferences || {}
    } else {
      profileData.photos = []
      profileData.personal = {}
      profileData.career = {}
      profileData.family = {}
      profileData.cultural = {}
      profileData.partner_preferences = {}
    }

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' })

    if (error) {
      console.error('Supabase error saving step 6:', error)
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error saving step 6:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// STEP 7: PARTNER PREFERENCES
// ============================================

/**
 * Save Step 7: Partner preferences
 */
export async function saveStep7(
  userId: string,
  data: {
    ageRange: [number, number]
    heightRangeCm: [number, number]
    dietPrefs?: string[]
    lifestylePrefs?: string[]
    educationPrefs?: string[]
    professionPrefs?: string[]
    locations?: string[]
    communities?: string[]
    familyTypePrefs?: string[]
  }
): Promise<ServiceResponse> {
  try {
    // Get existing profile to preserve other fields
    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const partnerPreferences = {
      min_age: data.ageRange[0],
      max_age: data.ageRange[1],
      min_height_cm: data.heightRangeCm[0],
      max_height_cm: data.heightRangeCm[1],
      diet_prefs: data.dietPrefs || [],
      lifestyle_prefs: data.lifestylePrefs || [],
      education_prefs: data.educationPrefs || [],
      profession_prefs: data.professionPrefs || [],
      locations: data.locations || [],
      communities: data.communities || [],
      family_type_prefs: data.familyTypePrefs || [],
    }

    const profileData: any = {
      user_id: userId,
      name: existing?.name || '',
      partner_preferences: partnerPreferences,
      step7_completed: true,
      profile_completed: true,
    }

    // Preserve other fields
    if (existing) {
      profileData.age = existing.age
      profileData.gender = existing.gender
      profileData.created_by = existing.created_by
      profileData.photos = existing.photos || []
      profileData.personal = existing.personal || {}
      profileData.career = existing.career || {}
      profileData.family = existing.family || {}
      profileData.cultural = existing.cultural || {}
      profileData.bio = existing.bio || null
      profileData.step1_completed = existing.step1_completed || false
      profileData.step2_completed = existing.step2_completed || false
      profileData.step3_completed = existing.step3_completed || false
      profileData.step4_completed = existing.step4_completed || false
      profileData.step5_completed = existing.step5_completed || false
      profileData.step6_completed = existing.step6_completed || false
    } else {
      profileData.photos = []
      profileData.personal = {}
      profileData.career = {}
      profileData.family = {}
      profileData.cultural = {}
    }

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' })

    if (error) {
      console.error('Supabase error saving step 7:', error)
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error saving step 7:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// PROFILE SUBMISSION
// ============================================

export async function submitProfile(payload: {
  profile: MatrimonyProfile
  preferences: MatrimonyPreferences
  verification?: VerificationPayload
}) {
  // Profile is already saved step-by-step
  // This function can be used for final validation or additional processing
  await clearDraft()
  return { ok: true }
}

// ============================================
// RETRIEVAL FUNCTIONS
// ============================================

/**
 * Get complete matrimony profile
 */
export async function getMatrimonyProfile(userId: string): Promise<ServiceResponse> {
  try {
    const { data, error } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error getting matrimony profile:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get profile completion status
 */
export async function getProfileCompletion(userId: string): Promise<ServiceResponse> {
  try {
    const { data, error } = await supabase.rpc('get_matrimony_profile_completion_full', {
      p_user_id: userId,
    })

    if (error) throw error

    return { success: true, data: data?.[0] || null }
  } catch (error: any) {
    console.error('Error getting profile completion:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all unique cities from matrimony profiles
 * Extracts only city from career.work_location
 */
export async function getMatrimonyLocations(): Promise<string[]> {
  try {
    const { data: profiles, error } = await supabase
      .from('matrimony_profile_full')
      .select('career')
      .eq('profile_completed', true)

    if (error) throw error

    const cities = new Set<string>()
    
    profiles?.forEach((profile) => {
      const career = profile.career as any
      const workLocation = career?.work_location || {}
      
      // Add only city if present
      if (workLocation.city) {
        cities.add(workLocation.city)
      }
    })

    return Array.from(cities).sort()
  } catch (error: any) {
    console.error('Error fetching matrimony locations:', error)
    return []
  }
}
