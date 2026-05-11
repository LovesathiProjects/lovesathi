/**
 * Verification API
 * Handles all database operations for user verification (DOB, Gender, ID)
 */

import { supabase } from './supabaseClient'
import { getPhoneValidationMessage, getUserPhoneVerifiedAt, normalizePhoneNumber, phonesMatch } from '@/lib/phone'
import { getCurrentUserPhoneVerifiedAt } from '@/lib/phoneVerificationRecords'

// ============================================
// TYPES
// ============================================

export interface UserProfile {
  id?: string
  user_id: string
  date_of_birth: string
  gender: 'male' | 'female' | 'prefer_not_to_say'
  phone: string
  phone_verified_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface IDVerification {
  id?: string
  user_id: string
  document_type?: 'aadhar' | 'pan' | 'driving_license' | 'passport'
  document_file_url?: string
  document_file_name?: string
  document_file_size?: number
  face_scan_url?: string
  face_scan_file_name?: string
  face_scan_file_size?: number
  verification_status?: 'pending' | 'approved' | 'rejected' | 'in_review'
  verification_notes?: string
  verified_at?: string
  verified_by?: string
  created_at?: string
  updated_at?: string
}

export interface VerificationProgress {
  id?: string
  user_id: string
  dob_completed?: boolean
  dob_completed_at?: string
  gender_completed?: boolean
  gender_completed_at?: string
  id_verification_completed?: boolean
  id_verification_completed_at?: string
  all_steps_completed?: boolean
  completed_at?: string
  created_at?: string
  updated_at?: string
}

export interface VerificationStatus {
  has_profile: boolean
  has_verification: boolean
  verification_status: string
  progress_percentage: number
}

// ============================================
// USER PROFILE FUNCTIONS (DOB + Gender)
// ============================================

/**
 * Save or update user's date of birth
 */
function getAuthMetadataPhone(user: any) {
  return String(user?.user_metadata?.phone || user?.phone || "").trim()
}

export async function saveDateOfBirth(dob: string, phoneInput?: string) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      throw new Error('Authentication error: ' + authError.message)
    }
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Calculate age
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    // Validate age
    if (age < 18) {
      throw new Error('You must be at least 18 years old to use Lovesathi')
    }

    const normalizedPhone = normalizePhoneNumber(phoneInput || getAuthMetadataPhone(user))
    const phoneError = getPhoneValidationMessage(normalizedPhone)
    if (phoneError) {
      throw new Error(phoneError)
    }

    // First, try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle() // Use maybeSingle() to avoid error if no row exists

    const phoneVerifiedAt =
      (await getCurrentUserPhoneVerifiedAt(user, normalizedPhone)) ||
      getUserPhoneVerifiedAt(user, normalizedPhone) ||
      (phonesMatch(existingProfile?.phone, normalizedPhone) ? existingProfile?.phone_verified_at : null)

    let result

    if (existingProfile) {
      // Update existing profile
      result = await supabase
        .from('user_profiles')
        .update({ 
          date_of_birth: dob,
          phone: normalizedPhone,
          ...(phoneVerifiedAt ? { phone_verified_at: phoneVerifiedAt } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single()
    } else {
      // Insert new profile (without gender for now)
      result = await supabase
        .from('user_profiles')
        .insert({ 
          user_id: user.id,
          date_of_birth: dob,
          phone: normalizedPhone,
          ...(phoneVerifiedAt ? { phone_verified_at: phoneVerifiedAt } : {}),
          gender: 'prefer_not_to_say' // temporary default
        })
        .select()
        .single()
    }

    if (result.error) {
      throw result.error
    }

    const { data: existingMatrimonyProfile } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingMatrimonyProfile) {
      const { error: updateError } = await supabase
        .from('matrimony_profile_full')
        .update({
          cultural: {
            ...(existingMatrimonyProfile.cultural || {}),
            date_of_birth: dob,
          },
        })
        .eq('user_id', user.id)
      
      if (updateError) {
        return { success: false, error: updateError.message }
      }
    }

    // Update verification progress (don't fail if this errors)
    try {
      await updateVerificationProgress('dob_completed')
    } catch {
      // Progress is helpful for onboarding UI, but the DOB save itself is the critical operation.
    }

    return { success: true, data: result.data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Save or update user's gender
 */
export async function saveGender(gender: 'male' | 'female' | 'prefer_not_to_say') {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // First, try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle() // Use maybeSingle() to avoid error if no row exists

    const profilePhone = normalizePhoneNumber(existingProfile?.phone || getAuthMetadataPhone(user))
    const phoneError = getPhoneValidationMessage(profilePhone)
    if (phoneError) {
      throw new Error(phoneError)
    }

    const phoneVerifiedAt =
      (await getCurrentUserPhoneVerifiedAt(user, profilePhone)) ||
      getUserPhoneVerifiedAt(user, profilePhone) ||
      (phonesMatch(existingProfile?.phone, profilePhone) ? existingProfile?.phone_verified_at : null)

    let result

    if (existingProfile) {
      // Update existing profile
      result = await supabase
        .from('user_profiles')
        .update({ 
          gender,
          phone: profilePhone,
          ...(phoneVerifiedAt ? { phone_verified_at: phoneVerifiedAt } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single()
    } else {
      // Insert new profile (this shouldn't happen if DOB was saved first)
      // But we handle it just in case
      const today = new Date()
      const defaultDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
      
      result = await supabase
        .from('user_profiles')
        .insert({ 
          user_id: user.id,
          date_of_birth: defaultDob.toISOString().split('T')[0],
          phone: profilePhone,
          ...(phoneVerifiedAt ? { phone_verified_at: phoneVerifiedAt } : {}),
          gender
        })
        .select()
        .single()
    }

    if (result.error) {
      throw result.error
    }

    const genderMatrimony = gender === 'prefer_not_to_say' ? null : (gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Other')

    const { data: userProfileForMatrimony } = await supabase
      .from('user_profiles')
      .select('date_of_birth, phone')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: existingMatrimonyProfile } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingMatrimonyProfile) {
      await supabase
        .from('matrimony_profile_full')
        .update({ gender: genderMatrimony })
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('matrimony_profile_full')
        .insert({
          user_id: user.id,
          name: '',
          gender: genderMatrimony,
          photos: [],
          personal: {},
          career: {},
          family: {},
          cultural: {
            date_of_birth: userProfileForMatrimony?.date_of_birth || null,
          },
        })
    }

    // Update verification progress (don't fail if this errors)
    try {
      await updateVerificationProgress('gender_completed')
    } catch {
      // Progress is helpful for onboarding UI, but gender save should not be rolled back for it.
    }

    return { success: true, data: result.data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Get user profile
 */
export async function getUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, onboarding_matrimony')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned

    if (data) {
      data.onboarding_matrimony = data.onboarding_matrimony === true
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// ID VERIFICATION FUNCTIONS
// ============================================

/**
 * Upload ID document to Supabase Storage
 */
export async function uploadIDDocument(file: File) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/id-document-${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}. Please check if storage policies are applied.`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(fileName)

    return { 
      success: true, 
      data: {
        path: data.path,
        url: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Upload face scan photo to Supabase Storage
 */
export async function uploadFaceScan(file: File) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/face-scan-${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('face-scans')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}. Please check if storage policies are applied.`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('face-scans')
      .getPublicUrl(fileName)

    return { 
      success: true, 
      data: {
        path: data.path,
        url: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Save ID verification data to database
 */
export async function saveIDVerification(
  idDocument: { url: string; fileName: string; fileSize: number },
  faceScan: { url: string; fileName: string; fileSize: number }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Check if verification record exists
    const { data: existingVerification } = await supabase
      .from('id_verifications')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let result

    const verificationData = {
      document_file_url: idDocument.url,
      document_file_name: idDocument.fileName,
      document_file_size: idDocument.fileSize,
      face_scan_url: faceScan.url,
      face_scan_file_name: faceScan.fileName,
      face_scan_file_size: faceScan.fileSize,
      verification_status: 'pending' as const,
      updated_at: new Date().toISOString()
    }

    if (existingVerification) {
      // Update existing verification
      result = await supabase
        .from('id_verifications')
        .update(verificationData)
        .eq('user_id', user.id)
        .select()
        .single()
    } else {
      // Insert new verification
      result = await supabase
        .from('id_verifications')
        .insert({ 
          user_id: user.id,
          ...verificationData
        })
        .select()
        .single()
    }

    if (result.error) throw result.error

    // Update verification progress
    await updateVerificationProgress('id_verification_completed')

    return { success: true, data: result.data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Get ID verification status
 */
export async function getIDVerification() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('id_verifications')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// VERIFICATION PROGRESS FUNCTIONS
// ============================================

/**
 * Update verification progress
 */
export async function updateVerificationProgress(
  step: 'dob_completed' | 'gender_completed' | 'id_verification_completed'
) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get existing progress (use maybeSingle to avoid error if table doesn't exist)
    const { data: existingProgress } = await supabase
      .from('verification_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const now = new Date().toISOString()
    let updateData: any = {
      [step]: true,
      [`${step}_at`]: now,
      updated_at: now
    }

    let result

    if (existingProgress) {
      // Check if all steps will be completed
      const allCompleted = 
        (step === 'dob_completed' || existingProgress.dob_completed) &&
        (step === 'gender_completed' || existingProgress.gender_completed) &&
        (step === 'id_verification_completed' || existingProgress.id_verification_completed)

      if (allCompleted) {
        updateData.all_steps_completed = true
        updateData.completed_at = now
      }

      // Update existing progress
      result = await supabase
        .from('verification_progress')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single()
    } else {
      // Insert new progress
      result = await supabase
        .from('verification_progress')
        .insert({ 
          user_id: user.id,
          ...updateData
        })
        .select()
        .single()
    }

    if (result.error) throw result.error

    return { success: true, data: result.data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Get verification progress
 */
export async function getVerificationProgress() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('verification_progress')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Get overall verification status
 */
export async function getVerificationStatus(): Promise<{ success: boolean; data?: VerificationStatus; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Use the helper function from database
    const { data, error } = await supabase
      .rpc('get_user_verification_status', { p_user_id: user.id })

    if (error) throw error

    return { success: true, data: data?.[0] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// COMBINED SAVE FUNCTION
// ============================================

/**
 * Complete ID verification process (upload files and save to DB)
 */
export async function completeIDVerification(
  idDocumentFile: File,
  faceScanFile: File
) {
  try {
    // Upload ID document
    const idUploadResult = await uploadIDDocument(idDocumentFile)
    if (!idUploadResult.success) {
      throw new Error(`Failed to upload ID document: ${idUploadResult.error}`)
    }

    // Upload face scan
    const faceUploadResult = await uploadFaceScan(faceScanFile)
    if (!faceUploadResult.success) {
      throw new Error(`Failed to upload face scan: ${faceUploadResult.error}`)
    }

    // Save verification data
    const saveResult = await saveIDVerification(
      idUploadResult.data!,
      faceUploadResult.data!
    )

    if (!saveResult.success) {
      throw new Error(`Failed to save verification: ${saveResult.error}`)
    }

    return { 
      success: true, 
      data: saveResult.data,
      message: 'ID verification submitted successfully'
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
