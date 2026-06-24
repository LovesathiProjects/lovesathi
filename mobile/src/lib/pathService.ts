import { supabase } from './supabase';
import { getPhoneValidationMessage } from './phone';

export async function completeOnboarding(userId: string) {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  try {
    const { data: profile, error: profileFetchError } = await supabase
      .from('user_profiles')
      .select('phone')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileFetchError) throw profileFetchError;

    const phoneError = getPhoneValidationMessage(profile?.phone || '');
    if (phoneError) {
      throw new Error('Please add a valid phone number before completing onboarding.');
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
