import { supabase } from './supabase';

export async function completeOnboarding(userId: string) {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

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
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to complete matrimony onboarding',
    };
  }
}
