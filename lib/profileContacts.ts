import { supabase } from "@/lib/supabaseClient"

export interface ProfileContactInfo {
  userId: string
  phoneMasked: string | null
  phoneRevealed: string | null
  canReveal: boolean
  remainingContactViews?: number | null
}

type ContactRow = {
  user_id: string
  phone_masked: string | null
  phone_revealed: string | null
  can_reveal: boolean | null
  remaining_contact_views?: number | null
}

export async function getProfileContacts(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map<string, ProfileContactInfo>()

  const { data, error } = await supabase.rpc("get_lovesathi_profile_contacts", { p_user_ids: uniqueIds })
  if (error) {
    console.warn("[getProfileContacts] Unable to load profile contacts:", error.message)
    return new Map<string, ProfileContactInfo>()
  }

  return new Map(
    ((data as ContactRow[] | null) || []).map((row) => [
      row.user_id,
      {
        userId: row.user_id,
        phoneMasked: row.phone_masked,
        phoneRevealed: row.phone_revealed,
        canReveal: Boolean(row.can_reveal),
        remainingContactViews: row.remaining_contact_views ?? null,
      },
    ]),
  )
}

export async function getProfileContact(userId: string) {
  const contacts = await getProfileContacts([userId])
  return contacts.get(userId) || null
}

export async function revealProfileContact(userId: string) {
  const { data, error } = await supabase.rpc("reveal_lovesathi_profile_contact", { p_user_id: userId })
  if (error) {
    throw new Error(error.message || "Could not reveal contact details.")
  }

  const row = Array.isArray(data) ? (data[0] as ContactRow | undefined) : (data as ContactRow | null)
  if (!row) {
    throw new Error("Could not reveal contact details.")
  }

  return {
    userId: row.user_id,
    phoneMasked: row.phone_masked,
    phoneRevealed: row.phone_revealed,
    canReveal: Boolean(row.can_reveal),
    remainingContactViews: row.remaining_contact_views ?? null,
  } satisfies ProfileContactInfo
}
