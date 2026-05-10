import { supabase } from './supabaseClient'
import { getPhoneValidationMessage } from '@/lib/phone'

/**
 * Lovesathi is matrimony-only. This helper keeps onboarding completion logic
 * scoped to the matrimony flow.
 */
export async function completeOnboarding(userId: string) {
  try {
    const { data: profile, error: profileFetchError } = await supabase
      .from('user_profiles')
      .select('phone, phone_verified_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileFetchError) throw profileFetchError

    const phoneError = getPhoneValidationMessage(profile?.phone || '')
    if (phoneError) {
      throw new Error('Please add a valid phone number before completing onboarding.')
    }

    if (!profile?.phone_verified_at) {
      throw new Error('Please verify your phone number with OTP before completing onboarding.')
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_matrimony: true,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error completing matrimony onboarding:', error)
    return {
      success: false,
      error: error.message || 'Failed to complete matrimony onboarding',
    }
  }
}
