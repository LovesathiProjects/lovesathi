import { getPhoneValidationMessage, normalizePhoneNumber } from './phone';
import { uploadMatrimonyPhoto } from './storageUpload';
import { supabase } from './supabase';

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export { uploadMatrimonyPhoto };

export async function saveStep1(
  userId: string,
  data: {
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    createdBy: 'Self' | 'Parent' | 'Sibling' | 'Other';
    photoUrls: string[];
  },
): Promise<ServiceResponse> {
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };

  try {
    const { data: userProfile, error: userProfileError } = await supabase
      .from('user_profiles')
      .select('user_id, phone')
      .eq('user_id', userId)
      .maybeSingle();

    if (userProfileError) throw userProfileError;
    if (!userProfile) throw new Error('Please complete age verification before profile setup.');

    const phoneError = getPhoneValidationMessage(normalizePhoneNumber(userProfile.phone || ''));
    if (phoneError) {
      throw new Error('Please create your account with a valid phone number before profile setup.');
    }

    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const profileData: any = {
      user_id: userId,
      name: data.name,
      age: data.age,
      gender: data.gender,
      created_by: data.createdBy,
      photos: data.photoUrls,
      step1_completed: true,
      personal: existing?.personal || {},
      career: existing?.career || {},
      family: existing?.family || {},
      cultural: existing?.cultural || {},
      bio: existing?.bio || null,
    };

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveStep2(
  userId: string,
  data: {
    heightCm: number;
    maritalStatus: string;
    diet?: string;
  },
): Promise<ServiceResponse> {
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };

  try {
    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const profileData: any = {
      user_id: userId,
      name: existing?.name || '',
      personal: {
        ...(existing?.personal || {}),
        height_cm: data.heightCm,
        height_unit: 'cm',
        diet: data.diet,
        marital_status: data.maritalStatus,
      },
      step2_completed: true,
      age: existing?.age,
      gender: existing?.gender,
      created_by: existing?.created_by,
      photos: existing?.photos || [],
      career: existing?.career || {},
      family: existing?.family || {},
      cultural: existing?.cultural || {},
      bio: existing?.bio || null,
    };

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveStep3(
  userId: string,
  data: {
    highestEducation: string;
    jobTitle: string;
    annualIncome: string;
  },
): Promise<ServiceResponse> {
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };

  try {
    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const profileData: any = {
      user_id: userId,
      name: existing?.name || '',
      career: {
        ...(existing?.career || {}),
        highest_education: data.highestEducation,
        job_title: data.jobTitle,
        annual_income: data.annualIncome,
      },
      step3_completed: true,
      age: existing?.age,
      gender: existing?.gender,
      created_by: existing?.created_by,
      photos: existing?.photos || [],
      personal: existing?.personal || {},
      family: existing?.family || {},
      cultural: existing?.cultural || {},
      bio: existing?.bio || null,
    };

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveStep4(
  userId: string,
  data: { familyType?: string; familyValues?: string },
): Promise<ServiceResponse> {
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };

  try {
    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const profileData: any = {
      user_id: userId,
      name: existing?.name || '',
      family: {
        ...(existing?.family || {}),
        family_type: data.familyType,
        family_values: data.familyValues,
      },
      step4_completed: true,
      age: existing?.age,
      gender: existing?.gender,
      created_by: existing?.created_by,
      photos: existing?.photos || [],
      personal: existing?.personal || {},
      career: existing?.career || {},
      cultural: existing?.cultural || {},
      bio: existing?.bio || null,
    };

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveStep5(
  userId: string,
  data: {
    religion: string;
    motherTongue: string;
    community: string;
    dob: string;
    tob: string;
    pob: string;
  },
): Promise<ServiceResponse> {
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };

  try {
    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const profileData: any = {
      user_id: userId,
      name: existing?.name || '',
      cultural: {
        ...(existing?.cultural || {}),
        religion: data.religion,
        mother_tongue: data.motherTongue,
        community: data.community,
        date_of_birth: data.dob,
        time_of_birth: data.tob,
        place_of_birth: data.pob,
      },
      step5_completed: true,
      age: existing?.age,
      gender: existing?.gender,
      created_by: existing?.created_by,
      photos: existing?.photos || [],
      personal: existing?.personal || {},
      career: existing?.career || {},
      family: existing?.family || {},
      bio: existing?.bio || null,
    };

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveStep6(userId: string, bio: string): Promise<ServiceResponse> {
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };

  try {
    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const profileData: any = {
      user_id: userId,
      name: existing?.name || '',
      bio,
      step6_completed: true,
      age: existing?.age,
      gender: existing?.gender,
      created_by: existing?.created_by,
      photos: existing?.photos || [],
      personal: existing?.personal || {},
      career: existing?.career || {},
      family: existing?.family || {},
      cultural: existing?.cultural || {},
    };

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveStep7(
  userId: string,
  data: {
    ageRange: [number, number];
    heightRangeCm: [number, number];
  },
): Promise<ServiceResponse> {
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };

  try {
    const { data: existing } = await supabase
      .from('matrimony_profile_full')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const profileData: any = {
      user_id: userId,
      name: existing?.name || '',
      partner_preferences: {
        min_age: data.ageRange[0],
        max_age: data.ageRange[1],
        min_height_cm: data.heightRangeCm[0],
        max_height_cm: data.heightRangeCm[1],
      },
      step7_completed: true,
      profile_completed: true,
      age: existing?.age,
      gender: existing?.gender,
      created_by: existing?.created_by,
      photos: existing?.photos || [],
      personal: existing?.personal || {},
      career: existing?.career || {},
      family: existing?.family || {},
      cultural: existing?.cultural || {},
      bio: existing?.bio || null,
    };

    const { error } = await supabase
      .from('matrimony_profile_full')
      .upsert(profileData, { onConflict: 'user_id' });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
