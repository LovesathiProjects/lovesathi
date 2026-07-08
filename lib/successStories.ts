import { createClient } from "@supabase/supabase-js"

export type LovesathiSuccessStoryRow = {
  id: string
  couple_names: string
  city: string | null
  story: string
  image_url: string | null
  wedding_date: string | null
  status: "draft" | "published" | "archived"
  display_order: number
  created_at: string
  updated_at: string
}

export type LovesathiSuccessStory = {
  id: string
  coupleNames: string
  city: string | null
  story: string
  imageUrl: string | null
  weddingDate: string | null
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export const LOVESATHI_SUCCESS_STORY_SELECT =
  "id,couple_names,city,story,image_url,wedding_date,status,display_order,created_at,updated_at"

export function mapLovesathiSuccessStory(row: LovesathiSuccessStoryRow): LovesathiSuccessStory {
  return {
    id: row.id,
    coupleNames: row.couple_names,
    city: row.city,
    story: row.story,
    imageUrl: row.image_url,
    weddingDate: row.wedding_date,
    displayOrder: row.display_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function loadPublishedLovesathiSuccessStories(limit = 24) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      stories: [] as LovesathiSuccessStory[],
      error: "Supabase public configuration is missing.",
    }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data, error } = await supabase
    .from("lovesathi_success_stories")
    .select(LOVESATHI_SUCCESS_STORY_SELECT)
    .eq("status", "published")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    return {
      stories: [] as LovesathiSuccessStory[],
      error: error.message,
    }
  }

  return {
    stories: ((data || []) as LovesathiSuccessStoryRow[]).map(mapLovesathiSuccessStory),
    error: null,
  }
}
