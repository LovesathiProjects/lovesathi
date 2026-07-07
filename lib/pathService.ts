import { supabase } from './supabaseClient'

/**
 * Lovesathi is matrimony-only. This helper keeps onboarding completion logic
 * scoped to the matrimony flow.
 */
export async function completeOnboarding(userId: string) {
  try {
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
