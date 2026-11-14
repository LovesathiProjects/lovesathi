"use client"

import { useEffect, useState } from "react"
import { getTotalUnreadCount } from "@/lib/chatService"
import { supabase } from "@/lib/supabaseClient"

export function useUnreadMessageCount() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let active = true
    let currentUserId: string | null = null
    let generation = 0
    let channel: ReturnType<typeof supabase.channel> | null = null

    const refresh = async () => {
      if (!currentUserId) return
      const requestGeneration = ++generation
      const count = await getTotalUnreadCount(currentUserId)
      if (active && requestGeneration === generation) setUnreadCount(count)
    }

    const syncUser = (userId: string | null) => {
      if (!active || currentUserId === userId) return
      currentUserId = userId
      generation += 1
      setUnreadCount(0)
      if (channel) void supabase.removeChannel(channel)
      channel = null
      if (!userId) return

      // Realtime UPDATE payloads may contain only the old primary key.
      // Recount instead of inferring seen/deleted transitions from missing fields.
      channel = supabase
        .channel(`unread-messages:${userId}`)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "messages",
        }, () => { void refresh() })
        .subscribe()
      void refresh()
    }

    let authChanged = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authChanged = true
      syncUser(session?.user.id ?? null)
    })
    void supabase.auth.getUser().then(({ data }) => {
      if (!authChanged) syncUser(data.user?.id ?? null)
    })

    const handleVisible = () => { if (!document.hidden) void refresh() }
    const handleFocus = () => { void refresh() }
    document.addEventListener("visibilitychange", handleVisible)
    window.addEventListener("focus", handleFocus)
    const interval = window.setInterval(refresh, 10000)

    return () => {
      active = false
      generation += 1
      subscription.unsubscribe()
      if (channel) void supabase.removeChannel(channel)
      document.removeEventListener("visibilitychange", handleVisible)
      window.removeEventListener("focus", handleFocus)
      window.clearInterval(interval)
    }
  }, [])

  return unreadCount
}
