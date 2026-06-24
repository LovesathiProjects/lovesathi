import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AppFlow = 'loading' | 'auth' | 'verify-email' | 'onboarding' | 'main';

export function isEmailConfirmed(user: User | null | undefined) {
  return Boolean(user?.email_confirmed_at);
}

export async function resolveAppFlow(session: Session | null): Promise<Exclude<AppFlow, 'loading'>> {
  if (!session?.user) return 'auth';
  if (!isEmailConfirmed(session.user)) return 'verify-email';

  const { data: profile, error } = await supabase!
    .from('user_profiles')
    .select('onboarding_matrimony')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error || !profile || profile.onboarding_matrimony !== true) {
    return 'onboarding';
  }

  return 'main';
}
