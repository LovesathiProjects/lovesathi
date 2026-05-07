import { supabase } from "./supabaseClient"
import { FREE_PLAN_LIMITS, getLimitMessage, getSwipeLimitStatus, normalizeLimitError } from "@/lib/planLimits"

export interface LikeAction {
  success: boolean
  isMatch?: boolean
  matchId?: string
  error?: string
}

export interface Match {
  id: string
  matchedUserId: string
  matchedUserName: string
  matchedUserPhoto?: string
  matchedAt: string
}

export interface ActivityItem {
  id: string
  type: "match" | "like" | "view"
  name: string
  avatar: string
  age?: number
  timestamp: string
  isNew?: boolean
  userId: string
}

function isDemoProfileId(profileId: string) {
  return profileId.startsWith("demo-")
}

function demoSwipeStorageKey(userId: string) {
  return `lovesathi_demo_swipes:${userId}`
}

function getDemoSwipeRows(userId: string) {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(demoSwipeStorageKey(userId))
    const rows = raw ? (JSON.parse(raw) as Array<{ targetId: string; action: string; createdAt: string }>) : []
    const windowStart = Date.now() - FREE_PLAN_LIMITS.windowHours * 60 * 60 * 1000
    const recentRows = rows.filter((row) => new Date(row.createdAt).getTime() >= windowStart)
    if (recentRows.length !== rows.length) {
      localStorage.setItem(demoSwipeStorageKey(userId), JSON.stringify(recentRows))
    }
    return recentRows
  } catch {
    return []
  }
}

function recordDemoSwipe(userId: string, targetId: string, action: "like" | "pass" | "connect") {
  if (typeof window === "undefined") return
  const rows = getDemoSwipeRows(userId)
  rows.push({ targetId, action, createdAt: new Date().toISOString() })
  localStorage.setItem(demoSwipeStorageKey(userId), JSON.stringify(rows))
}

export async function recordMatrimonyLike(
  likerId: string,
  likedId: string,
  action: "like" | "pass" | "connect",
): Promise<LikeAction> {
  try {
    const limitStatus = await getSwipeLimitStatus(likerId)
    if (!limitStatus.allowed) {
      return { success: false, error: limitStatus.error }
    }

    if (isDemoProfileId(likedId)) {
      const demoRows = getDemoSwipeRows(likerId)
      if (!limitStatus.isPremium && demoRows.length >= (limitStatus.remaining ?? FREE_PLAN_LIMITS.swipeActions)) {
        return { success: false, error: getLimitMessage("swipe") }
      }

      recordDemoSwipe(likerId, likedId, action)
      return { success: true }
    }

    let data
    let error

    const payload = { liker_id: likerId, liked_id: likedId, action }
    const { data: inserted, error: insertError } = await supabase
      .from("matrimony_likes")
      .insert(payload)
      .select()
      .single()

    if (insertError && (insertError.code === "23505" || insertError.message?.includes("unique"))) {
      const { data: updated, error: updateError } = await supabase
        .from("matrimony_likes")
        .update({ action })
        .eq("liker_id", likerId)
        .eq("liked_id", likedId)
        .select()
        .single()

      data = updated
      error = updateError
    } else {
      data = inserted
      error = insertError
    }

    if (error) throw error

    if (action === "like" || action === "connect") {
      await new Promise((resolve) => setTimeout(resolve, 200))
      const { data: matches, error: matchError } = await supabase
        .from("matrimony_matches")
        .select("*")
        .eq("is_active", true)

      if (!matchError) {
        const match = matches?.find(
          (item) =>
            (item.user1_id === likerId && item.user2_id === likedId) ||
            (item.user1_id === likedId && item.user2_id === likerId),
        )

        if (match) {
          return { success: true, isMatch: true, matchId: match.id }
        }
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error recording matrimony like:", error)
    return { success: false, error: normalizeLimitError(error.message) }
  }
}

export async function getMatrimonyMatches(userId: string): Promise<Match[]> {
  try {
    const { data: matches, error } = await supabase
      .from("matrimony_matches")
      .select("*")
      .eq("is_active", true)
      .order("matched_at", { ascending: false })

    if (error) throw error

    const userMatches = matches?.filter((match) => match.user1_id === userId || match.user2_id === userId) || []
    if (userMatches.length === 0) return []

    const enriched = await Promise.all(
      userMatches.map(async (match) => {
        const matchedUserId = match.user1_id === userId ? match.user2_id : match.user1_id
        const { data: profile } = await supabase
          .from("matrimony_profile_full")
          .select("name, photos")
          .eq("user_id", matchedUserId)
          .maybeSingle()

        return {
          id: match.id,
          matchedUserId,
          matchedUserName: profile?.name || "Unknown",
          matchedUserPhoto: (profile?.photos as string[])?.[0],
          matchedAt: match.matched_at,
        }
      }),
    )

    return enriched
  } catch (error: any) {
    console.error("Error getting matrimony matches:", error)
    return []
  }
}

export async function getMatrimonyLikedProfiles(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.from("matrimony_likes").select("liked_id").eq("liker_id", userId)
    if (error) throw error
    const realLikedIds = data?.map((item) => item.liked_id) || []
    const demoLikedIds = getDemoSwipeRows(userId).map((row) => row.targetId)
    return [...realLikedIds, ...demoLikedIds]
  } catch (error: any) {
    console.error("Error getting matrimony liked profiles:", error)
    return []
  }
}

export async function getMatrimonyLikesReceived(userId: string): Promise<ActivityItem[]> {
  try {
    const { data: likes, error } = await supabase
      .from("matrimony_likes")
      .select("id, liker_id, action, created_at")
      .eq("liked_id", userId)
      .in("action", ["like", "connect"])
      .order("created_at", { ascending: false })

    if (error) throw error
    if (!likes?.length) return []

    const { data: userLikes } = await supabase
      .from("matrimony_likes")
      .select("liked_id")
      .eq("liker_id", userId)
      .in("action", ["like", "connect"])

    const likedBackUserIds = new Set(userLikes?.map((item) => item.liked_id) || [])
    const likerIds = likes.map((like) => like.liker_id)

    const { data: profiles, error: profilesError } = await supabase
      .from("matrimony_profile_full")
      .select("user_id, name, photos, age")
      .in("user_id", likerIds)

    if (profilesError) throw profilesError

    const profileMap = new Map(profiles?.map((item) => [item.user_id, item]) || [])
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    return likes
      .filter((like) => !likedBackUserIds.has(like.liker_id))
      .map((like) => {
        const profile = profileMap.get(like.liker_id)
        if (!profile) return null
        return {
          id: like.id,
          type: "like" as const,
          name: profile.name || "Unknown",
          avatar: (profile.photos as string[])?.[0] || "/placeholder-user.jpg",
          age: profile.age || undefined,
          timestamp: like.created_at,
          isNew: new Date(like.created_at).getTime() > oneDayAgo,
          userId: like.liker_id,
        }
      })
      .filter(Boolean) as ActivityItem[]
  } catch (error: any) {
    console.error("Error getting matrimony likes received:", error)
    return []
  }
}

function formatTimestamp(timestamp: string): string {
  const now = new Date()
  const time = new Date(timestamp)
  const diffMs = now.getTime() - time.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) return `${diffWeeks}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

export async function getMatrimonyActivity(userId: string): Promise<ActivityItem[]> {
  try {
    const [matches, likesReceived] = await Promise.all([getMatrimonyMatches(userId), getMatrimonyLikesReceived(userId)])
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    const activities: (ActivityItem & { originalTimestamp: string })[] = matches.map((match) => ({
      id: match.id,
      type: "match",
      name: match.matchedUserName,
      avatar: match.matchedUserPhoto || "/placeholder-user.jpg",
      timestamp: formatTimestamp(match.matchedAt),
      isNew: new Date(match.matchedAt).getTime() > oneDayAgo,
      userId: match.matchedUserId,
      originalTimestamp: match.matchedAt,
    }))

    likesReceived.forEach((like) => {
      activities.push({
        ...like,
        timestamp: formatTimestamp(like.timestamp),
        originalTimestamp: like.timestamp,
      })
    })

    activities.sort((a, b) => new Date(b.originalTimestamp).getTime() - new Date(a.originalTimestamp).getTime())
    return activities.map(({ originalTimestamp, ...activity }) => activity)
  } catch (error: any) {
    console.error("Error getting matrimony activity:", error)
    return []
  }
}
