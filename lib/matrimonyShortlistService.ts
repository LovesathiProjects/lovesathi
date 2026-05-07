import { supabase } from "@/lib/supabaseClient"
import type { MatrimonyProfile } from "@/lib/mockMatrimonyProfiles"
import { getShortlistLimitStatus, normalizeLimitError } from "@/lib/planLimits"

export interface ShortlistRecord {
  id: string
  user_id: string
  shortlisted_user_id: string
  created_at: string
  updated_at: string
}

export interface ShortlistActionResult {
  success: boolean
  error?: string
}

async function resolveUserId(explicitUserId?: string): Promise<string> {
  if (explicitUserId) return explicitUserId
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    throw new Error("User not authenticated")
  }
  return data.user.id
}

function mapProfileFromRow(
  row: any,
  verificationMap: Map<string, string | undefined>,
): MatrimonyProfile | null {
  if (!row) return null
  const personal = (row.personal || {}) as any
  const career = (row.career || {}) as any
  const cultural = (row.cultural || {}) as any
  const photos = (row.photos as string[]) || []

  const workLocation = career?.work_location || {}
  const locationParts = []
  if (workLocation.city) locationParts.push(workLocation.city)
  if (workLocation.state) locationParts.push(workLocation.state)
  if (workLocation.country) locationParts.push(workLocation.country)

  const location =
    locationParts.length > 0
      ? locationParts.join(", ")
      : cultural?.place_of_birth || "India"

  return {
    id: row.user_id,
    name: row.name,
    age: row.age || 0,
    education: career?.highest_education || "",
    profession: career?.job_title || "",
    location,
    community: cultural?.community || undefined,
    photos: photos.length > 0 ? photos : ["/placeholder-user.jpg"],
    bio: row.bio || undefined,
    interests: [],
    verified: verificationMap.get(row.user_id) === "approved",
    premium: false,
    height: personal?.height_cm ? `${personal.height_cm} cm` : undefined,
  }
}

export async function addToShortlist(
  targetUserId: string,
  userId?: string,
): Promise<ShortlistActionResult> {
  try {
    const resolvedUserId = await resolveUserId(userId)
    const limitStatus = await getShortlistLimitStatus(resolvedUserId, targetUserId)
    if (!limitStatus.allowed) {
      return { success: false, error: limitStatus.error }
    }

    const { error } = await supabase.from("shortlists").upsert(
      {
        user_id: resolvedUserId,
        shortlisted_user_id: targetUserId,
      },
      {
        onConflict: "user_id,shortlisted_user_id",
      },
    )

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error("[addToShortlist] Failed:", error.message)
    return { success: false, error: normalizeLimitError(error.message) }
  }
}

export async function removeFromShortlist(
  targetUserId: string,
  userId?: string,
): Promise<ShortlistActionResult> {
  try {
    const resolvedUserId = await resolveUserId(userId)
    const { error } = await supabase
      .from("shortlists")
      .delete()
      .eq("user_id", resolvedUserId)
      .eq("shortlisted_user_id", targetUserId)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error("[removeFromShortlist] Failed:", error.message)
    return { success: false, error: error.message }
  }
}

export async function getShortlistedProfiles(
  userId?: string,
): Promise<MatrimonyProfile[]> {
  const resolvedUserId = await resolveUserId(userId)

  const { data: shortlistRows, error: shortlistError } = await supabase
    .from("shortlists")
    .select("shortlisted_user_id, created_at")
    .eq("user_id", resolvedUserId)
    .order("created_at", { ascending: false })

  if (shortlistError) {
    console.error("[getShortlistedProfiles] Error loading shortlist:", shortlistError)
    throw shortlistError
  }

  if (!shortlistRows || shortlistRows.length === 0) {
    return []
  }

  const targetIds = shortlistRows.map((row) => row.shortlisted_user_id)

  const { data: profileRows, error: profilesError } = await supabase
    .from("matrimony_profile_full")
    .select("*")
    .in("user_id", targetIds)

  if (profilesError) {
    console.error("[getShortlistedProfiles] Error loading profiles:", profilesError)
    throw profilesError
  }

  const { data: verifications } = await supabase
    .from("id_verifications")
    .select("user_id, verification_status")
    .in("user_id", targetIds)

  const verificationMap = new Map<string, string | undefined>()
  verifications?.forEach((verification) => {
    verificationMap.set(verification.user_id, verification.verification_status)
  })

  const mappedProfiles = (profileRows || [])
    .map((row) => mapProfileFromRow(row, verificationMap))
    .filter((p): p is MatrimonyProfile => p !== null)

  const profileMap = new Map(mappedProfiles.map((profile) => [profile.id, profile]))
  const orderedProfiles = shortlistRows
    .map((row) => profileMap.get(row.shortlisted_user_id))
    .filter((profile): profile is MatrimonyProfile => !!profile)

  return orderedProfiles
}

export function subscribeToShortlist(
  userId: string,
  onChange: () => void,
) {
  const channel = supabase
    .channel(`shortlists-user-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shortlists",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        onChange()
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
