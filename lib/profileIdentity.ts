export function buildPublicProfileId(source?: string | null) {
  const compact = String(source || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
  return `LS${(compact || "0000000000").slice(0, 10).padEnd(10, "0")}`
}

export function getPublicProfileId(
  profile?: { publicProfileId?: string | null; public_profile_id?: string | null; user_id?: string | null; id?: string | null } | null,
) {
  return profile?.publicProfileId || profile?.public_profile_id || buildPublicProfileId(profile?.user_id || profile?.id)
}
