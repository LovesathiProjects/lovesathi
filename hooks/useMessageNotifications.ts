'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useToast } from './use-toast'
import { supabase } from '@/lib/supabaseClient'
import type { Message } from '@/lib/types'

interface UseMessageNotificationsOptions {
  currentMatchId?: string | null
  currentPage?: 'chat' | 'messages' | 'other'
  onInPageNotification?: (message: Message, senderName: string) => void
}

export function useMessageNotifications(options: UseMessageNotificationsOptions = {}) {
  const { currentMatchId, currentPage = 'other', onInPageNotification } = options
  const { toast } = useToast()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const currentUserIdRef = useRef<string | null>(null)
  const senderNamesCache = useRef<Map<string, string>>(new Map())
  const channelRef = useRef<RealtimeChannel | null>(null)
  const notificationOptionsRef = useRef<UseMessageNotificationsOptions>({
    currentMatchId,
    currentPage,
    onInPageNotification,
  })

  useEffect(() => {
    notificationOptionsRef.current = {
      currentMatchId,
      currentPage,
      onInPageNotification,
    }
  }, [currentMatchId, currentPage, onInPageNotification])

  useEffect(() => {
    let active = true

    const syncCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id ?? null
      currentUserIdRef.current = userId
      if (active) setCurrentUserId(userId)
    }

    void syncCurrentUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      const userId = session?.user.id ?? null
      currentUserIdRef.current = userId
      setCurrentUserId(userId)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const getSenderName = useCallback(async (senderId: string): Promise<string> => {
    const cachedName = senderNamesCache.current.get(senderId)
    if (cachedName) return cachedName

    try {
      const { data: matrimonyProfile } = await supabase
        .from('matrimony_profile_full')
        .select('name')
        .eq('user_id', senderId)
        .single()

      const senderName = matrimonyProfile?.name || 'Lovesathi member'
      senderNamesCache.current.set(senderId, senderName)
      return senderName
    } catch (error) {
      console.error('Error fetching sender name:', error)
      return 'Lovesathi member'
    }
  }, [])

  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`message-notifications:${currentUserId}`)
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

          if (message.sender_id === currentUserIdRef.current) return

          void (async () => {
            const senderName = await getSenderName(message.sender_id)
            const currentOptions = notificationOptionsRef.current
            const isOnCurrentChat =
              currentOptions.currentPage === 'chat' &&
              currentOptions.currentMatchId === message.match_id

            if (isOnCurrentChat) {
              currentOptions.onInPageNotification?.(message, senderName)
              return
            }

            toast({
              title: 'New Message',
              description: `New message from ${senderName}`,
              duration: 5000,
            })
          })()
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Supabase Realtime error in message notifications')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current === channel) {
        channelRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [currentUserId, getSenderName, toast])

  return {}
}
