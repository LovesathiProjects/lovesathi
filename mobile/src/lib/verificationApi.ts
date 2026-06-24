import { getCurrentUserPhoneVerifiedAt } from './phoneVerificationRecords';
import {
  getPhoneValidationMessage,
  getUserPhoneVerifiedAt,
  normalizePhoneNumber,
  phonesMatch,
} from './phone';
import { supabase } from './supabase';
import { type UploadFile, uploadToStorageBucket } from './storageUpload';

function getAuthMetadataPhone(user: any) {
  return String(user?.user_metadata?.phone || user?.phone || '').trim();
}

export async function saveDateOfBirth(dob: string, phoneInput?: string) {
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw new Error(`Authentication error: ${authError.message}`);
    if (!user) throw new Error('User not authenticated');

    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) throw new Error('You must be at least 18 years old to use Lovesathi');

    const normalizedPhone = normalizePhoneNumber(phoneInput || getAuthMetadataPhone(user));
    const phoneError = getPhoneValidationMessage(normalizedPhone);
    if (phoneError) throw new Error(phoneError);

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const phoneVerifiedAt =
      (await getCurrentUserPhoneVerifiedAt(user, normalizedPhone)) ||
      getUserPhoneVerifiedAt(user, normalizedPhone) ||
      (phonesMatch(existingProfile?.phone, normalizedPhone)
        ? existingProfile?.phone_verified_at
        : null);

    const payload = {
      date_of_birth: dob,
      phone: normalizedPhone,
      ...(phoneVerifiedAt ? { phone_verified_at: phoneVerifiedAt } : {}),
      updated_at: new Date().toISOString(),
    };

    const result = existingProfile
      ? await supabase.from('user_profiles').update(payload).eq('user_id', user.id).select().single()
      : await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            gender: 'prefer_not_to_say',
            ...payload,
          })
          .select()
          .single();

    if (result.error) throw result.error;

    const { data: existingMatrimonyProfile } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMatrimonyProfile) {
      await supabase
        .from('matrimony_profile_full')
        .update({
          cultural: {
            ...(existingMatrimonyProfile.cultural || {}),
            date_of_birth: dob,
          },
        })
        .eq('user_id', user.id);
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveGender(gender: 'male' | 'female' | 'prefer_not_to_say') {
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const profilePhone = normalizePhoneNumber(existingProfile?.phone || getAuthMetadataPhone(user));
    const phoneError = getPhoneValidationMessage(profilePhone);
    if (phoneError) throw new Error(phoneError);

    const phoneVerifiedAt =
      (await getCurrentUserPhoneVerifiedAt(user, profilePhone)) ||
      getUserPhoneVerifiedAt(user, profilePhone) ||
      (phonesMatch(existingProfile?.phone, profilePhone)
        ? existingProfile?.phone_verified_at
        : null);

    const payload = {
      gender,
      phone: profilePhone,
      ...(phoneVerifiedAt ? { phone_verified_at: phoneVerifiedAt } : {}),
      updated_at: new Date().toISOString(),
    };

    const result = existingProfile
      ? await supabase.from('user_profiles').update(payload).eq('user_id', user.id).select().single()
      : await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            date_of_birth: new Date(new Date().getFullYear() - 18, 0, 1)
              .toISOString()
              .split('T')[0],
            ...payload,
          })
          .select()
          .single();

    if (result.error) throw result.error;

    const genderMatrimony =
      gender === 'prefer_not_to_say' ? null : gender === 'male' ? 'Male' : 'Female';

    const { data: userProfileForMatrimony } = await supabase
      .from('user_profiles')
      .select('date_of_birth, phone')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: existingMatrimonyProfile } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMatrimonyProfile) {
      await supabase
        .from('matrimony_profile_full')
        .update({ gender: genderMatrimony })
        .eq('user_id', user.id);
    } else {
      await supabase.from('matrimony_profile_full').insert({
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
      });
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function completeIDVerification(idDocumentFile: UploadFile, faceScanFile: UploadFile) {
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };

  try {
    const idUpload = await uploadToStorageBucket(
      'verification-documents',
      idDocumentFile,
      'id-document',
    );
    const faceUpload = await uploadToStorageBucket('face-scans', faceScanFile, 'face-scan');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const verificationData = {
      document_file_url: idUpload.url,
      document_file_name: idUpload.fileName,
      document_file_size: idUpload.fileSize,
      face_scan_url: faceUpload.url,
      face_scan_file_name: faceUpload.fileName,
      face_scan_file_size: faceUpload.fileSize,
      verification_status: 'pending' as const,
      updated_at: new Date().toISOString(),
    };

    const { data: existingVerification } = await supabase
      .from('id_verifications')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const result = existingVerification
      ? await supabase
          .from('id_verifications')
          .update(verificationData)
          .eq('user_id', user.id)
          .select()
          .single()
      : await supabase
          .from('id_verifications')
          .insert({ user_id: user.id, ...verificationData })
          .select()
          .single();

    if (result.error) throw result.error;

    return { success: true, data: result.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
