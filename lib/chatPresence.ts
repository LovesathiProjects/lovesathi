import { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabaseClient"

export const CHAT_PRESENCE_HEARTBEAT_MS = 45_000
export const CHAT_PRESENCE_ONLINE_WINDOW_MS = 2 * 60_000

export interface ChatPresence {
  userId: string
  lastSeenAt: string
}

function isPresenceUnavailable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST202" ||
    /lovesathi_chat_presence|touch_lovesathi_chat_presence|does not exist/i.test(error?.message || "")
  )
}

function normalizePresence(payload: unknown): ChatPresence | null {
  if (!payload || typeof payload !== "object") return null

  const row = payload as { user_id?: unknown; last_seen_at?: unknown }
  if (typeof row.user_id !== "string" || typeof row.last_seen_at !== "string") return null

  return {
    userId: row.user_id,
    lastSeenAt: row.last_seen_at,
  }
}

export async function touchChatPresence() {
  const { data, error } = await supabase.rpc("touch_lovesathi_chat_presence")

  if (error) {
    if (!isPresenceUnavailable(error)) {
      console.warn("[touchChatPresence] Unable to update chat presence:", error.message)
    }
    return null
  }

  return typeof data === "string" ? data : null
}

export async function getChatPresence(userId: string): Promise<ChatPresence | null> {
  const { data, error } = await supabase
    .from("lovesathi_chat_presence")
    .select("user_id,last_seen_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    if (!isPresenceUnavailable(error)) {
      console.warn("[getChatPresence] Unable to read chat presence:", error.message)
    }
    return null
  }

  return normalizePresence(data)
}

export function subscribeToChatPresence(
  userId: string,
  callbacks: {
    onChange?: (presence: ChatPresence) => void
    onError?: (error: Error) => void
  },
): RealtimeChannel {
  return supabase
    .channel(`lovesathi-chat-presence:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "lovesathi_chat_presence",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const presence = normalizePresence(payload.new)
        if (presence) callbacks.onChange?.(presence)
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "lovesathi_chat_presence",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const presence = normalizePresence(payload.new)
        if (presence) callbacks.onChange?.(presence)
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        callbacks.onError?.(new Error("Chat presence subscription error"))
      }
    })
}

export function getChatPresenceStatus(lastSeenAt?: string | null, now = Date.now()) {
  if (!lastSeenAt) return { isOnline: false, label: "" }

  const lastSeenMs = Date.parse(lastSeenAt)
  if (!Number.isFinite(lastSeenMs)) return { isOnline: false, label: "" }

  const elapsedMs = Math.max(0, now - lastSeenMs)
  if (elapsedMs <= CHAT_PRESENCE_ONLINE_WINDOW_MS) {
    return { isOnline: true, label: "Online now" }
  }

  const elapsedMinutes = Math.floor(elapsedMs / 60_000)
  if (elapsedMinutes < 60) {
    return { isOnline: false, label: `Last seen ${elapsedMinutes}m ago` }
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) {
    return { isOnline: false, label: `Last seen ${elapsedHours}h ago` }
  }

  const elapsedDays = Math.floor(elapsedHours / 24)
  if (elapsedDays === 1) return { isOnline: false, label: "Last seen yesterday" }
  if (elapsedDays < 7) return { isOnline: false, label: `Last seen ${elapsedDays}d ago` }

  return {
    isOnline: false,
    label: `Last seen ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(lastSeenMs))}`,
  }
}
