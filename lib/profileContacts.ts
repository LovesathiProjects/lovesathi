import { supabase } from "@/lib/supabaseClient"

export interface ProfileContactInfo {
  userId: string
  phoneMasked: string | null
  phoneRevealed: string | null
  canReveal: boolean
}

type ContactRow = {
  user_id: string
  phone_masked: string | null
  phone_revealed: string | null
  can_reveal: boolean | null
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
      },
    ]),
  )
}

export async function getProfileContact(userId: string) {
  const contacts = await getProfileContacts([userId])
  return contacts.get(userId) || null
}
