import { supabase } from './supabaseClient'
import type { Message } from './types'
import { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Get match_id from user IDs and match type
 */
export async function getMatchId(
  userId: string,
  otherUserId: string,
  matchType: 'matrimony'
): Promise<string | null> {
  try {
    const tableName = 'matrimony_matches'
    
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .eq('is_active', true)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .or(`user1_id.eq.${otherUserId},user2_id.eq.${otherUserId}`)
      .single()

    if (error) {
      console.error('[getMatchId] Error:', error)
      return null
    }

    // Verify both users are in the match
    const { data: matchData, error: matchError } = await supabase
      .from(tableName)
      .select('user1_id, user2_id')
      .eq('id', data.id)
      .single()

    if (matchError || !matchData) {
      console.error('[getMatchId] Match verification error:', matchError)
      return null
    }

    const isUser1 = matchData.user1_id === userId || matchData.user1_id === otherUserId
    const isUser2 = matchData.user2_id === userId || matchData.user2_id === otherUserId

    if (isUser1 && isUser2) {
      return data.id
    }

    return null
  } catch (error: any) {
    console.error('[getMatchId] Exception:', error)
    return null
  }
}

/**
 * Get matrimony match_id from user IDs.
 */
export async function getMatchIdAuto(
  userId: string,
  otherUserId: string
): Promise<{ matchId: string; matchType: 'matrimony' } | null> {
  const matrimonyMatchId = await getMatchId(userId, otherUserId, 'matrimony')
  return matrimonyMatchId ? { matchId: matrimonyMatchId, matchType: 'matrimony' } : null
}

/**
 * Load message history for a match
 */
export async function getMessages(
  matchId: string,
  userId: string,
  matchType: 'matrimony'
): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .eq('match_type', matchType)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[getMessages] Error:', error)
      return []
    }

    return (data || []) as Message[]
  } catch (error: any) {
    console.error('[getMessages] Exception:', error)
    return []
  }
}

/**
 * Send a new message
 */
export async function sendMessage(
  matchId: string,
  senderId: string,
  receiverId: string,
  content: string,
  matchType: 'matrimony',
  allowEmpty: boolean = false,
  replyToMessageId?: string | null
): Promise<Message | null> {
  try {
    if (!allowEmpty && !content.trim()) {
      throw new Error('Message content cannot be empty')
    }

    // Use empty string if content is empty (for media-only messages)
    // The database should allow empty content after running the fix script
    const messageContent = allowEmpty && !content.trim() ? '' : content.trim()

    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: senderId,
        receiver_id: receiverId,
        content: messageContent,
        match_type: matchType,
        reply_to_message_id: replyToMessageId || null,
        status: 'sent',
      })
      .select()
      .single()

    if (error) {
      console.error('[sendMessage] Error:', error)
      throw error
    }

    return data as Message
  } catch (error: any) {
    console.error('[sendMessage] Exception:', error)
    throw error
  }
}

/**
 * Mark a message as delivered
 */
export async function markMessageDelivered(messageId: string, userId: string): Promise<Message | null> {
  try {
    const { data, error } = await supabase.rpc('mark_message_delivered', {
      p_message_id: messageId,
      p_user_id: userId,
    })

    if (error) {
      console.error('[markMessageDelivered] Error:', error)
      return null
    }

    return data as Message
  } catch (error: any) {
    console.error('[markMessageDelivered] Exception:', error)
    return null
  }
}

/**
 * Mark all messages in a match as seen
 */
export async function markMessageSeen(messageId: string, userId: string): Promise<Message | null> {
  try {
    const { data, error } = await supabase.rpc('mark_message_seen', {
      p_message_id: messageId,
      p_user_id: userId,
    })

    if (error) {
      console.error('[markMessageSeen] Error:', error)
      return null
    }

    return data as Message
  } catch (error: any) {
    console.error('[markMessageSeen] Exception:', error)
    return null
  }
}

/**
 * Subscribe to real-time message updates for a match
 */
export function subscribeToMessages(
  matchId: string,
  matchType: 'matrimony',
  callbacks: {
    onInsert?: (message: Message) => void
    onUpdate?: (message: Message) => void
    onDelete?: (messageId: string) => void
    onError?: (error: Error) => void
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`messages:${matchId}:${matchType}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}&match_type=eq.${matchType}`,
      },
      (payload) => {
        if (callbacks.onInsert) {
          callbacks.onInsert(payload.new as Message)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}&match_type=eq.${matchType}`,
      },
      (payload) => {
        if (callbacks.onUpdate) {
          callbacks.onUpdate(payload.new as Message)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}&match_type=eq.${matchType}`,
      },
      (payload) => {
        if (callbacks.onDelete) {
          callbacks.onDelete((payload.old as { id: string }).id)
        }
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[subscribeToMessages] Channel error for match:', matchId, 'type:', matchType)
        if (callbacks.onError) {
          callbacks.onError(new Error('Channel subscription error'))
        }
      }
    })

  return channel
}

/**
 * Get the last message for a match
 */
export async function getLastMessage(matchId: string, matchType: 'matrimony'): Promise<Message | null> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .eq('match_type', matchType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No messages found
        return null
      }
      console.error('[getLastMessage] Error:', error)
      return null
    }

    return data as Message
  } catch (error: any) {
    console.error('[getLastMessage] Exception:', error)
    return null
  }
}

/**
 * Get unread message count for a match
 */
export async function getUnreadCount(matchId: string, userId: string, matchType: 'matrimony'): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', matchId)
      .eq('match_type', matchType)
      .eq('receiver_id', userId)
      .is('seen_at', null)

    if (error) {
      console.error('[getUnreadCount] Error:', error)
      return 0
    }

    return count || 0
  } catch (error: any) {
    console.error('[getUnreadCount] Exception:', error)
    return 0
  }
}

/**
 * Get total unread message count across all conversations for a user
 */
export async function getTotalUnreadCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .is('seen_at', null)

    if (error) {
      console.error('[getTotalUnreadCount] Error:', error)
      return 0
    }

    return count || 0
  } catch (error: any) {
    console.error('[getTotalUnreadCount] Exception:', error)
    return 0
  }
}

/**
 * Delete a message only for the current user by adding their id to deleted_by
 */
export async function deleteMessageForMe(
  messageId: string,
  userId: string
): Promise<Message | null> {
  try {
    const { data: existingMessage, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (fetchError || !existingMessage) {
      console.error('[deleteMessageForMe] Message not found:', fetchError)
      return null
    }

    if (![existingMessage.sender_id, existingMessage.receiver_id].includes(userId)) {
      throw new Error('User cannot delete messages outside the conversation')
    }

    const currentDeletedBy: string[] = existingMessage.deleted_by || []
    if (currentDeletedBy.includes(userId)) {
      return existingMessage as Message
    }

    const updatedDeletedBy = [...currentDeletedBy, userId]

    const { data, error } = await supabase
      .from('messages')
      .update({ deleted_by: updatedDeletedBy })
      .eq('id', messageId)
      .select()
      .single()

    if (error) {
      console.error('[deleteMessageForMe] Error updating message:', error)
      throw error
    }

    return data as Message
  } catch (error) {
    console.error('[deleteMessageForMe] Exception:', error)
    return null
  }
}

/**
 * Delete a message for everyone (hard delete from DB)
 */
export async function deleteMessageForEveryone(
  messageId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data: existingMessage, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single()

    if (fetchError || !existingMessage) {
      console.error('[deleteMessageForEveryone] Message not found:', fetchError)
      return false
    }

    if (existingMessage.sender_id !== userId) {
      throw new Error('Only the sender can delete a message for everyone')
    }

    const { error } = await supabase.from('messages').delete().eq('id', messageId)

    if (error) {
      console.error('[deleteMessageForEveryone] Error deleting message:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('[deleteMessageForEveryone] Exception:', error)
    return false
  }
}

/**
 * Mark all messages in a match as deleted for a user (soft delete)
 * This hides messages from the UI but keeps them in the database
 */
export async function deleteAllMessagesForUser(
  matchId: string,
  userId: string,
  matchType: 'matrimony'
): Promise<boolean> {
  try {
    // Get all messages in this match where the user is either sender or receiver
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('id, deleted_by')
      .eq('match_id', matchId)
      .eq('match_type', matchType)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

    if (fetchError) {
      console.error('[deleteAllMessagesForUser] Error fetching messages:', fetchError)
      return false
    }

    if (!messages || messages.length === 0) {
      return true // No messages to delete
    }

    // Update each message to add the user to deleted_by array
    const updatePromises = messages.map(async (message) => {
      const currentDeletedBy: string[] = message.deleted_by || []
      
      // Skip if already deleted for this user
      if (currentDeletedBy.includes(userId)) {
        return Promise.resolve()
      }

      const updatedDeletedBy = [...currentDeletedBy, userId]

      const { error } = await supabase
        .from('messages')
        .update({ deleted_by: updatedDeletedBy })
        .eq('id', message.id)

      if (error) {
        console.error(`[deleteAllMessagesForUser] Error updating message ${message.id}:`, error)
      }
    })

    await Promise.all(updatePromises)
    return true
  } catch (error) {
    console.error('[deleteAllMessagesForUser] Exception:', error)
    return false
  }
}
