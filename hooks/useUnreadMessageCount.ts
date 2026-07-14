'use client'

import { useState, useEffect, useRef } from 'react'
import { getTotalUnreadCount } from '@/lib/chatService'
import { supabase } from '@/lib/supabaseClient'
import type { Message } from '@/lib/types'

export function useUnreadMessageCount() {
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const processedMessageIds = useRef<Set<string>>(new Set())
  const channelRef = useRef<any>(null)

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  // Fetch unread count function
  const fetchUnreadCount = async (userId: string) => {
    try {
      const count = await getTotalUnreadCount(userId)
      console.log('[useUnreadMessageCount] Fetched unread count:', count)
      setUnreadCount(count)
    } catch (error) {
      console.error('[useUnreadMessageCount] Error fetching unread count:', error)
    }
  }

  // Fetch initial unread count
  useEffect(() => {
    if (!currentUserId) return

    fetchUnreadCount(currentUserId)
  }, [currentUserId])

  // Listen for message INSERT and UPDATE events through Supabase Realtime.
  useEffect(() => {
    if (!currentUserId) return

    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Subscribe to message INSERT and UPDATE events
    const channel = supabase
      .channel('unread-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const message = payload.new as Message
          console.log('[useUnreadMessageCount] New message via Supabase Realtime INSERT:', message)
          
          // Prevent duplicate processing
          if (processedMessageIds.current.has(message.id)) {
            return
          }

          processedMessageIds.current.add(message.id)

          // Only increment if message hasn't been seen
          if (!message.seen_at) {
            console.log('[useUnreadMessageCount] New unread message via Supabase, incrementing count')
            setUnreadCount((prev) => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const message = payload.new as Message
          const oldMessage = payload.old as Message | null
          
          console.log('[useUnreadMessageCount] Message updated via Supabase Realtime:', message)
          
          // If message was marked as seen, decrement count
          if (message.seen_at && !oldMessage?.seen_at) {
            console.log('[useUnreadMessageCount] Message marked as seen, decrementing count')
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
          
          // If message was unmarked as seen (edge case), increment count
          if (!message.seen_at && oldMessage?.seen_at) {
            console.log('[useUnreadMessageCount] Message unmarked as seen, incrementing count')
            setUnreadCount((prev) => prev + 1)
          }
        }
      )
      .subscribe((status) => {
        console.log('[useUnreadMessageCount] Supabase Realtime subscription status:', status)
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [currentUserId])

  // Refresh count when tab becomes visible (user switches back to tab)
  useEffect(() => {
    if (!currentUserId) return

    const handleVisibilityChange = () => {
      if (!document.hidden && currentUserId) {
        console.log('[useUnreadMessageCount] Tab became visible, refreshing unread count')
        fetchUnreadCount(currentUserId)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Also refresh when window gains focus
    const handleFocus = () => {
      if (currentUserId) {
        console.log('[useUnreadMessageCount] Window gained focus, refreshing unread count')
        fetchUnreadCount(currentUserId)
      }
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [currentUserId])

  // Refresh count periodically to ensure accuracy (every 10 seconds for better responsiveness)
  useEffect(() => {
    if (!currentUserId) return

    const interval = setInterval(async () => {
      await fetchUnreadCount(currentUserId)
    }, 10000) // Reduced to 10 seconds for better real-time feel

    return () => clearInterval(interval)
  }, [currentUserId])

  // Clean up processed message IDs periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Keep only the last 1000 message IDs
      if (processedMessageIds.current.size > 1000) {
        const idsArray = Array.from(processedMessageIds.current)
        processedMessageIds.current = new Set(idsArray.slice(-1000))
      }
    }, 60000) // Clean up every minute

    return () => clearInterval(interval)
  }, [])

  return unreadCount
}
