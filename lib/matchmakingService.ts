import { supabase } from "./supabaseClient"
import {
  FREE_PLAN_LIMITS,
  getLimitMessage,
  getSwipeLimitStatus,
  normalizeLimitError,
  type UsageLimitStatus,
} from "@/lib/planLimits"

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
  type: "match" | "like" | "super_like" | "view"
  name: string
  avatar: string
  age?: number
  timestamp: string
  occurredAt?: string
  isNew?: boolean
  userId: string
  masked?: boolean
}

function isDemoProfileId(profileId: string) {
  return profileId.startsWith("demo-")
}

function demoSwipeStorageKey(userId: string) {
  return `lovesathi_demo_swipes:${userId}`
}

function demoActedStorageKey(userId: string) {
  return `lovesathi_demo_acted_profiles:${userId}`
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

function getDemoActedProfileIds(userId: string) {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(demoActedStorageKey(userId))
    const ids = raw ? (JSON.parse(raw) as string[]) : []
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : []
  } catch {
    return []
  }
}

function recordDemoActedProfile(userId: string, targetId: string) {
  if (typeof window === "undefined") return
  const ids = new Set(getDemoActedProfileIds(userId))
  ids.add(targetId)
  localStorage.setItem(demoActedStorageKey(userId), JSON.stringify(Array.from(ids)))
}

function recordDemoSwipe(userId: string, targetId: string, action: "like" | "pass" | "connect" | "super_like") {
  if (typeof window === "undefined") return
  const rows = getDemoSwipeRows(userId)
  rows.push({ targetId, action, createdAt: new Date().toISOString() })
  localStorage.setItem(demoSwipeStorageKey(userId), JSON.stringify(rows))
  recordDemoActedProfile(userId, targetId)
}

export async function getMatrimonyDiscoverySwipeStatus(userId: string): Promise<UsageLimitStatus> {
  const status = await getSwipeLimitStatus(userId)
  if (status.isPremium) return status

  const demoSwipeCount = getDemoSwipeRows(userId).length
  const remaining = Math.max((status.remaining ?? FREE_PLAN_LIMITS.swipeActions) - demoSwipeCount, 0)

  return {
    allowed: remaining > 0,
    isPremium: false,
    remaining,
    kind: remaining > 0 ? undefined : "swipe",
    error: remaining > 0 ? undefined : getLimitMessage("swipe"),
  }
}

export async function recordMatrimonyLike(
  likerId: string,
  likedId: string,
  action: "like" | "pass" | "connect" | "super_like",
): Promise<LikeAction> {
  try {
    const limitStatus = await getMatrimonyDiscoverySwipeStatus(likerId)
    if (!limitStatus.allowed) {
      return { success: false, error: limitStatus.error }
    }

    if (isDemoProfileId(likedId)) {
      recordDemoSwipe(likerId, likedId, action)
      return { success: true }
    }

    const payload = { liker_id: likerId, liked_id: likedId, action }
    const { error: insertError } = await supabase
      .from("matrimony_likes")
      .insert(payload)

    if (insertError && (insertError.code === "23505" || insertError.message?.includes("unique"))) {
      const { error: updateError } = await supabase
        .from("matrimony_likes")
        .update({ action })
        .eq("liker_id", likerId)
        .eq("liked_id", likedId)

      if (updateError) throw updateError
    } else if (insertError) {
      throw insertError
    }

    if (action === "like" || action === "connect" || action === "super_like") {
      const [user1Id, user2Id] = [likerId, likedId].sort()
      const { data: match, error: matchError } = await supabase
        .from("matrimony_matches")
        .select("id")
        .eq("is_active", true)
        .eq("user1_id", user1Id)
        .eq("user2_id", user2Id)
        .maybeSingle()

      if (!matchError && match) {
        return { success: true, isMatch: true, matchId: match.id }
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error recording matrimony like:", error)
    return { success: false, error: normalizeLimitError(error.message) }
  }
}

export async function createPremiumDirectMatrimonyMatch(otherUserId: string): Promise<LikeAction> {
  try {
    if (isDemoProfileId(otherUserId)) {
      return {
        success: false,
        error: "This preview profile is not chat-enabled yet. Chat and contact reveal work on real verified profiles.",
      }
    }

    const { data, error } = await supabase.rpc("create_lovesathi_premium_direct_match", {
      p_other_user_id: otherUserId,
    })

    if (error) throw error

    return {
      success: true,
      isMatch: true,
      matchId: typeof data === "string" ? data : undefined,
    }
  } catch (error: any) {
    console.error("Error creating premium direct match:", error)
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
    const [{ data: likes, error: likesError }, { data: matches, error: matchesError }] = await Promise.all([
      supabase.from("matrimony_likes").select("liked_id").eq("liker_id", userId),
      supabase
        .from("matrimony_matches")
        .select("user1_id,user2_id")
        .eq("is_active", true)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
    ])

    if (likesError) throw likesError
    if (matchesError) console.warn("[getMatrimonyLikedProfiles] Unable to read matches:", matchesError.message)

    const realLikedIds = likes?.map((item) => item.liked_id) || []
    const matchedIds =
      matchesError ? [] : matches?.map((match) => (match.user1_id === userId ? match.user2_id : match.user1_id)) || []
    const demoRecentIds = getDemoSwipeRows(userId).map((row) => row.targetId)
    const demoActedIds = getDemoActedProfileIds(userId)

    return Array.from(new Set([...realLikedIds, ...matchedIds, ...demoRecentIds, ...demoActedIds]))
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
      .in("action", ["like", "connect", "super_like"])
      .order("created_at", { ascending: false })

    if (error) throw error
    if (!likes?.length) return []

    const { data: userLikes } = await supabase
      .from("matrimony_likes")
      .select("liked_id")
      .eq("liker_id", userId)
      .in("action", ["like", "connect", "super_like"])

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
          type: like.action === "super_like" ? "super_like" as const : "like" as const,
          name: profile.name || "Unknown",
          avatar: (profile.photos as string[])?.[0] || "/placeholder-user.jpg",
          age: profile.age || undefined,
          timestamp: like.created_at,
          occurredAt: like.created_at,
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

export async function recordMatrimonyProfileView(viewerId: string, viewedUserId: string): Promise<void> {
  if (!viewerId || !viewedUserId || viewerId === viewedUserId || isDemoProfileId(viewedUserId)) return

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("matrimony_profile_views")
    .upsert(
      {
        viewer_id: viewerId,
        viewed_user_id: viewedUserId,
        viewed_at: now,
      },
      { onConflict: "viewer_id,viewed_user_id" },
    )

  if (error) {
    console.warn("[recordMatrimonyProfileView] Unable to record profile view:", error.message)
  }
}

export async function getMatrimonyProfileViewers(userId: string): Promise<ActivityItem[]> {
  try {
    const { data: views, error } = await supabase
      .from("matrimony_profile_views")
      .select("id, viewer_id, viewed_at")
      .eq("viewed_user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(100)

    if (error) throw error
    if (!views?.length) return []

    const viewerIds = views.map((view) => view.viewer_id)
    const { data: profiles, error: profilesError } = await supabase
      .from("matrimony_profile_full")
      .select("user_id, name, photos, age")
      .in("user_id", viewerIds)

    if (profilesError) throw profilesError

    const profileMap = new Map(profiles?.map((item) => [item.user_id, item]) || [])
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    return views
      .map((view) => {
        const profile = profileMap.get(view.viewer_id)
        if (!profile) return null
        return {
          id: view.id,
          type: "view" as const,
          name: profile.name || "Unknown",
          avatar: (profile.photos as string[])?.[0] || "/placeholder-user.jpg",
          age: profile.age || undefined,
          timestamp: view.viewed_at,
          occurredAt: view.viewed_at,
          isNew: new Date(view.viewed_at).getTime() > oneDayAgo,
          userId: view.viewer_id,
        }
      })
      .filter(Boolean) as ActivityItem[]
  } catch (error: any) {
    console.error("Error getting matrimony profile viewers:", error)
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
    const [matches, likesReceived, profileViewers] = await Promise.all([
      getMatrimonyMatches(userId),
      getMatrimonyLikesReceived(userId),
      getMatrimonyProfileViewers(userId),
    ])
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    const activities: (ActivityItem & { originalTimestamp: string })[] = matches.map((match) => ({
      id: match.id,
      type: "match",
      name: match.matchedUserName,
      avatar: match.matchedUserPhoto || "/placeholder-user.jpg",
      timestamp: formatTimestamp(match.matchedAt),
      occurredAt: match.matchedAt,
      isNew: new Date(match.matchedAt).getTime() > oneDayAgo,
      userId: match.matchedUserId,
      originalTimestamp: match.matchedAt,
    }))

    likesReceived.forEach((like) => {
      activities.push({
        ...like,
        timestamp: formatTimestamp(like.timestamp),
        occurredAt: like.occurredAt || like.timestamp,
        originalTimestamp: like.timestamp,
      })
    })

    profileViewers.forEach((view) => {
      activities.push({
        ...view,
        timestamp: formatTimestamp(view.timestamp),
        occurredAt: view.occurredAt || view.timestamp,
        originalTimestamp: view.timestamp,
      })
    })

    activities.sort((a, b) => new Date(b.originalTimestamp).getTime() - new Date(a.originalTimestamp).getTime())
    return activities.map(({ originalTimestamp, ...activity }) => activity)
  } catch (error: any) {
    console.error("Error getting matrimony activity:", error)
    return []
  }
}
