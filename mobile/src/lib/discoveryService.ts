import { supabase } from './supabase';

export const FREE_DISCOVERY_LIMIT = 15;
export const FREE_SHORTLIST_LIMIT = 3;
export const FREE_SUPER_LIKE_LIMIT = 3;

export type DiscoveryAction = 'like' | 'pass' | 'super_like';

export type NativeMatrimonyProfile = {
  id: string;
  publicProfileId: string;
  name: string;
  age: number;
  gender: string;
  photos: string[];
  height: string;
  city: string;
  state: string;
  country: string;
  location: string;
  community: string;
  religion: string;
  profession: string;
  education: string;
  income: string;
  maritalStatus: string;
  about: string;
  verified: boolean;
  premium: boolean;
  matchScore: number;
};

export type DiscoverySnapshot = {
  profiles: NativeMatrimonyProfile[];
  shortlistedIds: Set<string>;
  swipeRemaining: number | null;
  isPremium: boolean;
};

type ProfileRow = {
  user_id: string;
  public_profile_id?: string | null;
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  photos?: unknown;
  personal?: unknown;
  career?: unknown;
  cultural?: unknown;
  partner_preferences?: unknown;
  bio?: string | null;
};

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured for the mobile app.');
  }
  return supabase;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function safePhotos(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (photo): photo is string =>
      typeof photo === 'string' && /^https?:\/\//i.test(photo.trim()),
  );
}

function normalizeGender(value: unknown) {
  return textValue(value).toLowerCase();
}

function resolveBinaryGender(...values: unknown[]) {
  for (const value of values) {
    const gender = normalizeGender(value);
    if (gender === 'male' || gender === 'female') return gender;
  }
  return '';
}

function calculateMatchScore(
  viewer: ProfileRow | undefined,
  candidate: ProfileRow,
) {
  const preferences = objectValue(candidate.partner_preferences);
  const viewerPersonal = objectValue(viewer?.personal);
  const viewerCareer = objectValue(viewer?.career);
  const candidateCareer = objectValue(candidate.career);
  let matched = 0;
  let considered = 0;

  const minAge = numberValue(preferences.age_min);
  const maxAge = numberValue(preferences.age_max);
  if (minAge || maxAge) {
    considered += 1;
    const viewerAge = numberValue(viewer?.age);
    if (viewerAge && (!minAge || viewerAge >= minAge) && (!maxAge || viewerAge <= maxAge)) matched += 1;
  }

  const minHeight = numberValue(preferences.height_min_cm);
  const maxHeight = numberValue(preferences.height_max_cm);
  if (minHeight || maxHeight) {
    considered += 1;
    const viewerHeight = numberValue(viewerPersonal.height_cm);
    if (viewerHeight && (!minHeight || viewerHeight >= minHeight) && (!maxHeight || viewerHeight <= maxHeight)) matched += 1;
  }

  const preferredStatuses = Array.isArray(preferences.marital_statuses)
    ? preferences.marital_statuses.map(normalizeGender)
    : [];
  if (preferredStatuses.length) {
    considered += 1;
    if (preferredStatuses.includes(normalizeGender(viewerPersonal.marital_status))) matched += 1;
  }

  const candidateLocation = objectValue(candidateCareer.work_location);
  const preferredLocations = Array.isArray(preferences.locations)
    ? preferences.locations.map((value) => normalizeGender(value))
    : [];
  if (preferredLocations.length) {
    considered += 1;
    const viewerLocation = objectValue(viewerCareer.work_location);
    const viewerCity = normalizeGender(viewerLocation.city);
    if (preferredLocations.some((location) => location.includes(viewerCity) || viewerCity.includes(location))) matched += 1;
  } else if (textValue(candidateLocation.city)) {
    considered += 1;
    const viewerLocation = objectValue(viewerCareer.work_location);
    if (normalizeGender(viewerLocation.city) === normalizeGender(candidateLocation.city)) matched += 1;
  }

  return considered ? Math.round((matched / considered) * 100) : 72;
}

function mapProfile(
  row: ProfileRow,
  verifiedIds: Set<string>,
  premiumIds: Set<string>,
  viewer: ProfileRow | undefined,
): NativeMatrimonyProfile {
  const personal = objectValue(row.personal);
  const career = objectValue(row.career);
  const cultural = objectValue(row.cultural);
  const location = objectValue(career.work_location);
  const city = textValue(location.city);
  const state = textValue(location.state);
  const country = textValue(location.country, 'India');

  return {
    id: row.user_id,
    publicProfileId: textValue(row.public_profile_id, `LS${row.user_id.slice(0, 8).toUpperCase()}`),
    name: textValue(row.name, 'Lovesathi member'),
    age: numberValue(row.age),
    gender: textValue(row.gender),
    photos: safePhotos(row.photos),
    height: numberValue(personal.height_cm) ? `${numberValue(personal.height_cm)} cm` : 'Not shared',
    city,
    state,
    country,
    location: [city, state, country].filter(Boolean).join(', '),
    community: textValue(cultural.community, 'Open community'),
    religion: textValue(cultural.religion, 'Not shared'),
    profession: textValue(career.job_title, 'Profession not shared'),
    education: textValue(career.highest_education, 'Education not shared'),
    income: textValue(career.annual_income, 'Income not shared'),
    maritalStatus: textValue(personal.marital_status, 'Not shared'),
    about: textValue(row.bio, 'A serious Lovesathi member looking for a thoughtful life partner.'),
    verified: verifiedIds.has(row.user_id),
    premium: premiumIds.has(row.user_id),
    matchScore: calculateMatchScore(viewer, row),
  };
}

export async function isPremiumMember(userId: string) {
  const client = requireClient();
  const { data, error } = await client.rpc('is_lovesathi_premium', {
    p_user_id: userId,
  });
  if (error) return false;
  return Boolean(data);
}

export async function getSwipeRemaining(userId: string, premium?: boolean) {
  const isPremium = premium ?? (await isPremiumMember(userId));
  if (isPremium) return null;

  const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { count, error } = await requireClient()
    .from('matrimony_swipe_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);

  if (error) throw error;
  return Math.max(FREE_DISCOVERY_LIMIT - (count ?? 0), 0);
}

export async function loadDiscovery(userId: string): Promise<DiscoverySnapshot> {
  const client = requireClient();
  const [profileResult, userResult, likesResult, matchesResult, shortlistResult] = await Promise.all([
    client
      .from('matrimony_profile_full')
      .select('user_id,public_profile_id,name,age,gender,photos,personal,career,cultural,partner_preferences,bio')
      .eq('profile_completed', true)
      .eq('profile_hidden', false)
      .or('admin_review_status.is.null,admin_review_status.neq.rejected'),
    client.from('user_profiles').select('gender').eq('user_id', userId).maybeSingle(),
    client.from('matrimony_likes').select('liked_id').eq('liker_id', userId),
    client
      .from('matrimony_matches')
      .select('user1_id,user2_id')
      .eq('is_active', true)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
    client.from('shortlists').select('shortlisted_user_id').eq('user_id', userId),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (likesResult.error) throw likesResult.error;
  if (shortlistResult.error) throw shortlistResult.error;

  const rows = (profileResult.data ?? []) as ProfileRow[];
  const ids = rows.map((row) => row.user_id);
  const [verificationResult, premiumResult, premium] = await Promise.all([
    ids.length
      ? client.from('id_verifications').select('user_id,verification_status').in('user_id', ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? client.rpc('get_lovesathi_premium_profile_ids', { p_user_ids: ids })
      : Promise.resolve({ data: [], error: null }),
    isPremiumMember(userId),
  ]);

  const verifiedIds = new Set(
    (verificationResult.data ?? [])
      .filter((row) => row.verification_status === 'approved')
      .map((row) => row.user_id),
  );
  const premiumIds = new Set<string>((premiumResult.data as string[] | null) ?? []);
  const actedIds = new Set((likesResult.data ?? []).map((row) => row.liked_id));
  for (const match of matchesResult.data ?? []) {
    actedIds.add(match.user1_id === userId ? match.user2_id : match.user1_id);
  }
  const shortlistedIds = new Set(
    (shortlistResult.data ?? []).map((row) => row.shortlisted_user_id),
  );
  const viewer = rows.find((row) => row.user_id === userId);
  const viewerGender = resolveBinaryGender(userResult.data?.gender, viewer?.gender);

  const profiles = rows
    .filter((row) => row.user_id !== userId && !actedIds.has(row.user_id) && textValue(row.name))
    .filter((row) => {
      const candidateGender = normalizeGender(row.gender);
      if (viewerGender === 'male') return candidateGender === 'female';
      if (viewerGender === 'female') return candidateGender === 'male';
      return true;
    })
    .map((row) => mapProfile(row, verifiedIds, premiumIds, viewer))
    .sort((a, b) => b.matchScore - a.matchScore);

  return {
    profiles,
    shortlistedIds,
    swipeRemaining: await getSwipeRemaining(userId, premium),
    isPremium: premium,
  };
}

export async function recordDiscoveryAction(
  userId: string,
  targetUserId: string,
  action: DiscoveryAction,
) {
  const client = requireClient();
  if (action !== 'super_like') {
    const remaining = await getSwipeRemaining(userId);
    if (remaining !== null && remaining <= 0) {
      throw new Error('Free plan swipe limit reached. Upgrade for unlimited discovery.');
    }
  }

  const payload = { liker_id: userId, liked_id: targetUserId, action };
  const { error } = await client.from('matrimony_likes').upsert(payload, {
    onConflict: 'liker_id,liked_id',
  });
  if (error) throw error;

  const [firstId, secondId] = [userId, targetUserId].sort();
  const { data: match } = await client
    .from('matrimony_matches')
    .select('id')
    .eq('user1_id', firstId)
    .eq('user2_id', secondId)
    .eq('is_active', true)
    .maybeSingle();

  return { isMatch: Boolean(match), matchId: match?.id as string | undefined };
}

export async function toggleNativeShortlist(
  userId: string,
  targetUserId: string,
  currentlyShortlisted: boolean,
) {
  const client = requireClient();
  if (currentlyShortlisted) {
    const { error } = await client
      .from('shortlists')
      .delete()
      .eq('user_id', userId)
      .eq('shortlisted_user_id', targetUserId);
    if (error) throw error;
    return false;
  }

  const { error } = await client.from('shortlists').insert({
    user_id: userId,
    shortlisted_user_id: targetUserId,
  });
  if (error) throw error;
  return true;
}
