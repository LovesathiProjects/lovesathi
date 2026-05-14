"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Star, Heart, Trash2, CheckSquare, Square, MoreVertical, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { StaticBackground } from "@/components/discovery/static-background"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getMatrimonyMatches, type Match } from "@/lib/matchmakingService"
import { supabase } from "@/lib/supabaseClient"
import { getLastMessage, getUnreadCount, subscribeToMessages, deleteAllMessagesForUser } from "@/lib/chatService"
import { useSocket } from "@/hooks/useSocket"
import type { Message } from "@/lib/types"
import { RealtimeChannel } from "@supabase/supabase-js"
import { formatPublicProfileName, getDisplayInitial } from "@/lib/displayName"

interface ChatPreview {
  matchId: string
  matchType: 'matrimony'
  name: string
  avatar: string
  lastMessage: string
  timestamp: string
  unreadCount: number
  isOnline: boolean
  isMatch: boolean
  isPremium: boolean
}

interface MatrimonyChatListProps {
  onChatClick?: (matchId: string) => void
  onBack?: () => void
}

export function MatrimonyChatList({ onChatClick, onBack }: MatrimonyChatListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set())
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const headerMenuRef = useRef<HTMLDivElement>(null)
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map())

  // Socket.io integration for real-time updates
  const { isConnected, joinConversation } = useSocket({
    onMessage: async (message: Message) => {
      if (!currentUserId) return

      // Update the chat list when a new message arrives
      setChats((prevChats) => {
        const chatIndex = prevChats.findIndex((chat) => chat.matchId === message.match_id)
        
        if (chatIndex === -1) {
          // This is a new conversation, reload the entire list
          return prevChats
        }

        const updatedChats = [...prevChats]
        const chat = updatedChats[chatIndex]

        // Update last message and timestamp
        chat.lastMessage = message.content
        chat.timestamp = message.created_at

        // Update unread count if we're the receiver
        if (message.receiver_id === currentUserId) {
          // Fetch the actual unread count from database
          getUnreadCount(message.match_id, currentUserId, 'matrimony').then((count) => {
            setChats((currentChats) => {
              const index = currentChats.findIndex((c) => c.matchId === message.match_id)
              if (index !== -1) {
                const updated = [...currentChats]
                updated[index].unreadCount = count
                // Re-sort to ensure most recent is first
                updated.sort((a, b) => {
                  const timeA = new Date(a.timestamp).getTime()
                  const timeB = new Date(b.timestamp).getTime()
                  return timeB - timeA
                })
                return updated
              }
              return currentChats
            })
          })
        }

        // Move this chat to the top (most recent first)
        updatedChats.splice(chatIndex, 1)
        updatedChats.unshift(chat)

        return updatedChats
      })
    },
    onError: (error) => {
      console.error('Socket error in matrimony chat list:', error)
    },
  })

  // Join all conversation rooms when chats are loaded and socket is connected
  useEffect(() => {
    if (isConnected && chats.length > 0 && joinConversation) {
      chats.forEach((chat) => {
        joinConversation(chat.matchId)
      })
    }
  }, [isConnected, chats, joinConversation])

  // Set up Supabase Realtime subscriptions for all chats (as fallback)
  useEffect(() => {
    if (!currentUserId || chats.length === 0) return

    // Subscribe to all conversation channels
    chats.forEach((chat) => {
      if (channelsRef.current.has(chat.matchId)) {
        return // Already subscribed
      }

      const channel = subscribeToMessages(chat.matchId, 'matrimony', {
        onInsert: async (message: Message) => {
          // Update the chat list
          setChats((prevChats) => {
            const chatIndex = prevChats.findIndex((c) => c.matchId === message.match_id)
            
            if (chatIndex === -1) {
              return prevChats
            }

            const updatedChats = [...prevChats]
            const updatedChat = updatedChats[chatIndex]

            // Update last message and timestamp
            updatedChat.lastMessage = message.content
            updatedChat.timestamp = message.created_at

            // Update unread count if we're the receiver
            if (message.receiver_id === currentUserId) {
              getUnreadCount(message.match_id, currentUserId, 'matrimony').then((count) => {
                setChats((currentChats) => {
                  const index = currentChats.findIndex((c) => c.matchId === message.match_id)
                  if (index !== -1) {
                    const updated = [...currentChats]
                    updated[index].unreadCount = count
                    // Re-sort to ensure most recent is first
                    updated.sort((a, b) => {
                      const timeA = new Date(a.timestamp).getTime()
                      const timeB = new Date(b.timestamp).getTime()
                      return timeB - timeA
                    })
                    return updated
                  }
                  return currentChats
                })
              })
            }

            // Move this chat to the top (most recent first)
            updatedChats.splice(chatIndex, 1)
            updatedChats.unshift(updatedChat)

            return updatedChats
          })
        },
        onError: (error) => {
          console.error('Supabase Realtime error in matrimony chat list:', error)
        },
      })

      channelsRef.current.set(chat.matchId, channel)
    })

    // Cleanup function
    return () => {
      channelsRef.current.forEach((channel, matchId) => {
        supabase.removeChannel(channel)
        channelsRef.current.delete(matchId)
      })
    }
  }, [chats, currentUserId])

  useEffect(() => {
    async function loadMatches() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        setCurrentUserId(user.id)

        // Load matrimony matches
        const matrimonyMatches = await getMatrimonyMatches(user.id)

        // Process matrimony matches
        const matrimonyChats = await Promise.all(
          matrimonyMatches.map(async (match) => {
            const lastMessage = await getLastMessage(match.id, 'matrimony')
            const unreadCount = await getUnreadCount(match.id, user.id, 'matrimony')

            return {
              matchId: match.id,
              matchType: 'matrimony' as const,
              name: match.matchedUserName,
              avatar: match.matchedUserPhoto || "/placeholder-user.jpg",
              lastMessage: lastMessage?.content || "You matched! Start the conversation.",
              timestamp: lastMessage?.created_at || match.matchedAt,
              unreadCount,
              isOnline: false,
              isMatch: true,
              isPremium: false,
            }
          })
        )

        // Sort by timestamp (most recent first)
        const sortedChats = matrimonyChats.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime()
          const timeB = new Date(b.timestamp).getTime()
          return timeB - timeA
        })

        setChats(sortedChats)
      } catch (error) {
        console.error('Error loading matrimony matches:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [])

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleDeleteChat = async (matchId: string) => {
    try {
      if (!currentUserId) return

      // Mark all messages as deleted for this user (soft delete - hides from UI but keeps in DB)
      await deleteAllMessagesForUser(matchId, currentUserId, 'matrimony')

      // Delete the chat (set is_active to false)
      const { error } = await supabase
        .from('matrimony_matches')
        .update({ is_active: false })
        .eq('id', matchId)

      if (error) {
        console.error('Error deleting chat:', error)
        return
      }

      // Remove from local state
      setChats((prev) => prev.filter((chat) => chat.matchId !== matchId))
      
      // Clean up channel subscription
      const channel = channelsRef.current.get(matchId)
      if (channel) {
        supabase.removeChannel(channel)
        channelsRef.current.delete(matchId)
      }

      setIsHeaderMenuOpen(false)
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedChats.size === 0 || !currentUserId) return

    try {
      const matchIds = Array.from(selectedChats)
      
      // Mark all messages in selected chats as deleted for this user (soft delete)
      await Promise.all(
        matchIds.map((matchId) => 
          deleteAllMessagesForUser(matchId, currentUserId!, 'matrimony')
        )
      )

      // Delete all selected chats (set is_active to false)
      const { error } = await supabase
        .from('matrimony_matches')
        .update({ is_active: false })
        .in('id', matchIds)

      if (error) {
        console.error('Error deleting chats:', error)
        return
      }

      // Remove from local state
      setChats((prev) => prev.filter((chat) => !selectedChats.has(chat.matchId)))
      
      // Clean up channel subscriptions
      matchIds.forEach((matchId) => {
        const channel = channelsRef.current.get(matchId)
        if (channel) {
          supabase.removeChannel(channel)
          channelsRef.current.delete(matchId)
        }
      })

      // Reset selection
      setSelectedChats(new Set())
      setIsSelectMode(false)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Error deleting selected chats:', error)
    }
  }

  const toggleSelectChat = (matchId: string) => {
    setSelectedChats((prev) => {
      const next = new Set(prev)
      if (next.has(matchId)) {
        next.delete(matchId)
      } else {
        next.add(matchId)
      }
      return next
    })
  }

  const toggleSelectMode = () => {
    setIsSelectMode((prev) => {
      if (!prev) {
        setSelectedChats(new Set())
      }
      return !prev
    })
    setIsHeaderMenuOpen(false)
  }

  // Close header menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isHeaderMenuOpen && headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isHeaderMenuOpen])

  const filteredChats = chats.filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex flex-col h-full relative bg-white">
        <StaticBackground />
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto border-4 border-[#E83262] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-black">Loading matches...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col bg-[linear-gradient(145deg,#ffffff,#F6F7FB_58%,#f5f4f0)]">
      {/* Static Background */}
      <StaticBackground />
      
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[#E83262]/24 bg-[#F6F7FB]/86 p-4 shadow-[0_18px_55px_rgba(24,17,13,0.08)] backdrop-blur-xl">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            {onBack && (
                <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full border border-[#E83262]/28 bg-white/72 p-2 hover:bg-[#F2F5FA]"
                onClick={onBack}
              >
                <ArrowLeft className="w-5 h-5 text-black" />
              </Button>
            )}
            <div>
              <p className="luxe-kicker text-[0.62rem] text-[#E83262]">connection lounge</p>
              <h1 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#26364A]">Messages</h1>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {isSelectMode && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsSelectMode(false)
                      setSelectedChats(new Set())
                    }}
                    className="text-[#26364A]"
                  >
                    Cancel
                  </Button>
                  {selectedChats.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                    className="text-[#E83262] hover:text-[#C3264E]"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete ({selectedChats.size})
                    </Button>
                  )}
                </>
              )}
              {!isSelectMode && (
                <div className="relative" ref={headerMenuRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                    className="text-[#26364A]"
                  >
                    <MoreVertical className="w-5 h-5 text-black" />
                  </Button>

                  {/* Header Menu */}
                  {isHeaderMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-2xl border border-[#E83262]/24 bg-[#F6F7FB]/96 text-sm text-[#26364A] shadow-[0_18px_60px_rgba(24,17,13,0.14)] backdrop-blur-xl">
                      <div className="flex flex-col py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelectMode()
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-[#F2F5FA] active:bg-[#F2F5FA]"
                        >
                          <CheckSquare className="w-4 h-4" />
                          <span>Select</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E83262]" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-full border-[#E83262]/24 bg-white/88 pl-11 text-[#26364A] shadow-[0_10px_28px_rgba(24,17,13,0.05)] placeholder:text-[#6F7C8B]"
            />
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#E83262]/24 bg-[#F2F5FA] shadow-[0_18px_48px_rgba(24,17,13,0.08)]">
              <Search className="w-8 h-8 text-[#444444]" />
            </div>
            <h3 className="mb-2 font-serif text-3xl font-bold tracking-[-0.05em] text-[#26364A]">No conversations found</h3>
            <p className="text-sm text-[#6F7C8B]">Connect with profiles to start thoughtful conversations.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChats.map((chat) => {
              const isSelected = selectedChats.has(chat.matchId)
              const displayName = formatPublicProfileName(chat.name)
              
              return (
                <div
                  key={chat.matchId}
                  className={cn(
                    "relative rounded-[1.6rem] border p-4 shadow-[0_14px_38px_rgba(24,17,13,0.07)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_52px_rgba(24,17,13,0.11)]",
                    isSelected ? "border-[#E83262] bg-[#E83262]/10" : "border-[#E83262]/24 bg-[#F6F7FB]/88 hover:bg-white",
                    isSelectMode ? "cursor-pointer" : "cursor-pointer"
                  )}
                  onClick={(e) => {
                    if (isSelectMode) {
                      e.stopPropagation()
                      toggleSelectChat(chat.matchId)
                    } else {
                      onChatClick?.(chat.matchId)
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    {/* Selection checkbox or Avatar */}
                    <div className="relative flex-shrink-0">
                      {isSelectMode ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelectChat(chat.matchId)
                          }}
                          className={cn(
                            "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-[#E83262] border-[#E83262]"
                              : "border-[#E83262]/28 bg-[#F2F5FA] hover:bg-[#F2F5FA]"
                          )}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-6 h-6 text-white" />
                          ) : (
                            <Square className="w-6 h-6 text-[#444444]" />
                          )}
                        </button>
                      ) : (
                        <>
                          <Avatar className="h-12 w-12 border-2 border-[#E83262]/35 shadow-[0_10px_28px_rgba(24,17,13,0.12)]">
                            <AvatarImage src={chat.avatar || "/placeholder.svg"} alt={displayName} />
                            <AvatarFallback className="bg-[#F2F5FA] text-[#26364A]">{getDisplayInitial(chat.name)}</AvatarFallback>
                          </Avatar>
                          {chat.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                          )}
                        </>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="truncate font-serif text-xl font-bold tracking-[-0.04em] text-[#26364A]">{displayName}</h3>
                          {chat.isPremium && (
                            <Badge className="bg-[#E83262] text-white text-xs px-1.5 py-0.5 border border-[#E83262]">
                              Premium
                            </Badge>
                          )}
                          {chat.isMatch && <Heart className="w-3 h-3 text-pink-400 fill-current" />}
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {!isSelectMode && (
                            <>
                              <span className="text-xs font-semibold text-[#6F7C8B]">{formatRelativeTime(chat.timestamp)}</span>
                              {chat.unreadCount > 0 && (
                                <Badge className="w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs bg-[#E83262] text-white border border-[#E83262]">
                                  {chat.unreadCount}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {!isSelectMode && (
                        <p
                          className={cn(
                            "text-sm truncate",
                            chat.unreadCount > 0 ? "font-semibold text-[#26364A]" : "text-[#6F7C8B]",
                          )}
                        >
                          {chat.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedChats.size} {selectedChats.size === 1 ? 'chat' : 'chats'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected {selectedChats.size === 1 ? 'conversation will' : 'conversations will'} be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
