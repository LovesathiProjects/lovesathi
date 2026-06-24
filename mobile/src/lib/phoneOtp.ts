import {
  getPhoneValidationMessage,
  getUserPhoneVerifiedAt,
  normalizePhoneNumber,
} from './phone';
import { supabase } from './supabase';

export const PHONE_OTP_LENGTH = 6;

export function normalizePhoneOtpCode(value: string) {
  return value.replace(/\D/g, '').slice(0, PHONE_OTP_LENGTH);
}

async function getSignedInUser() {
  if (!supabase) throw new Error('Supabase is not configured.');

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error('Finish email verification before verifying your phone.');
  return user;
}

async function updateExistingProfilePhone(phone: string, verifiedAt?: string | null) {
  if (!supabase) return;
  const user = await getSignedInUser();
  const update: Record<string, string | null> = {
    phone,
    updated_at: new Date().toISOString(),
  };

  if (verifiedAt !== undefined) {
    update.phone_verified_at = verifiedAt;
  }

  const { error } = await supabase
    .from('user_profiles')
    .update(update)
    .eq('user_id', user.id);
  if (error) throw error;
}

export async function requestCurrentUserPhoneOtp(phoneInput: string) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const phone = normalizePhoneNumber(phoneInput);
  const phoneError = getPhoneValidationMessage(phone);
  if (phoneError) throw new Error(phoneError);

  const user = await getSignedInUser();
  const verifiedAt = getUserPhoneVerifiedAt(user, phone);
  if (verifiedAt) {
    return { phone, alreadyVerified: true, verifiedAt };
  }

  const { error } = await supabase.auth.updateUser({ phone });
  if (error) throw error;

  await updateExistingProfilePhone(phone, null);
  return { phone, alreadyVerified: false, verifiedAt: null };
}

export async function verifyCurrentUserPhoneOtp(phoneInput: string, tokenInput: string) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const phone = normalizePhoneNumber(phoneInput);
  const phoneError = getPhoneValidationMessage(phone);
  if (phoneError) throw new Error(phoneError);

  const token = normalizePhoneOtpCode(tokenInput);
  if (token.length !== PHONE_OTP_LENGTH) {
    throw new Error('Enter the complete 6-digit phone verification code.');
  }

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'phone_change',
  });
  if (error) throw error;

  const {
    data: { user },
  } = await supabase.auth.refreshSession();
  const verifiedAt = getUserPhoneVerifiedAt(user, phone) || new Date().toISOString();
  await updateExistingProfilePhone(phone, verifiedAt);

  return { phone, verifiedAt };
}
