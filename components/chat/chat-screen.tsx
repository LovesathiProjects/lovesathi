"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, MoreVertical, Send, Heart, X, CheckSquare, Trash2, User, Ban, Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import { StaticBackground } from "@/components/discovery/static-background"
import { supabase } from "@/lib/supabaseClient"
import {
  getMessages,
  sendMessage as sendMessageService,
  markMessageDelivered,
  markMessageSeen,
  subscribeToMessages,
  deleteMessageForMe,
  deleteMessageForEveryone,
} from "@/lib/chatService"
import { blockUser } from "@/lib/blockService"
import type { Message } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { RealtimeChannel } from "@supabase/supabase-js"
import { useSocket } from "@/hooks/useSocket"
import { useMessageNotifications } from "@/hooks/useMessageNotifications"
import { MessageActionMenu } from "@/components/chat/message-action-menu"
import { ReportDialog } from "@/components/chat/report-dialog"
import { getPreferredVerticalPlacement, type VerticalPlacement } from "@/components/chat/menu-position"
import { getMessageSendLimitStatus } from "@/lib/planLimits"
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
import { useRouter } from "next/navigation"

interface ChatUser {
  id: string
  name: string
  avatar: string
  isOnline: boolean
  lastSeen?: string
  isPremium: boolean
}

interface ChatScreenProps {
  matchId?: string
  onBack?: () => void
  onViewProfile?: (userId: string, mode: string) => void
}

export function ChatScreen({ matchId, onBack, onViewProfile }: ChatScreenProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [replyPreview, setReplyPreview] = useState<{
    messageId: string
    text: string
    senderLabel: string
  } | null>(null)
  const [activeMenu, setActiveMenu] = useState<{
    messageId: string
    messageText: string
    isOwn: boolean
    anchorElement: HTMLDivElement | null
    preferredPlacement: VerticalPlacement
  } | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const typingEmitTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [chatUser, setChatUser] = useState<ChatUser | null>(null)
  const [matchType, setMatchType] = useState<'matrimony'>('matrimony')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const messageElementMapRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const seenInFlightRef = useRef<Set<string>>(new Set())
  const messagesSnapshotRef = useRef<Message[]>([])
  const currentUserIdRef = useRef<string | null>(null)
  const [inPageNotification, setInPageNotification] = useState<{ message: string; senderName: string } | null>(null)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
  const headerMenuRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const showMenuForMessage = (
    bubbleElement: HTMLDivElement,
    options: { messageId: string; messageText: string; isOwn: boolean },
  ) => {
    if (typeof window === "undefined") return

    const bubbleRect = bubbleElement.getBoundingClientRect()
    const preferredPlacement = getPreferredVerticalPlacement({
      bubbleRect,
      viewportHeight: window.innerHeight,
    })

    setActiveMenu({
      ...options,
      anchorElement: bubbleElement,
      preferredPlacement,
    })
  }

  // Socket.io integration
  const { joinConversation, leaveConversation, sendMessageSocket, sendTyping, isConnected } = useSocket({
    onMessage: async (message: Message) => {
      // Only add message if it's for this conversation and not already present
      if (message.match_id === matchId) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === message.id)) {
            return prev
          }
          return [...prev, message]
        })

        // Mark as delivered if we're the receiver
        if (message.receiver_id === currentUserId && !message.delivered_at) {
          markMessageDelivered(message.id, currentUserId).then((updated) => {
            applyLocalMessageUpdate(updated)
          })
        }
      }
    },
    onError: (error) => {
      console.error('Socket error in chat:', error)
    },
    onTyping: (data) => {
      if (data.matchId === matchId && data.userId === chatUser?.id) {
        setOtherUserTyping(data.isTyping)
        
        // Auto-hide typing indicator after 3 seconds of no typing
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        
        if (data.isTyping) {
          typingTimeoutRef.current = setTimeout(() => {
            setOtherUserTyping(false)
          }, 3000)
        }
      }
    },
  })

  // In-page notification handler
  const handleInPageNotification = (message: Message, senderName: string) => {
    setInPageNotification({
      message: message.content,
      senderName,
    })
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setInPageNotification(null)
    }, 3000)
  }

  // Set up message notifications
  useMessageNotifications({
    currentMatchId: matchId,
    currentPage: 'chat',
    onInPageNotification: handleInPageNotification,
  })

  const formatClockTime = (timestamp?: string | null): string => {
    if (!timestamp) return ""
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    } catch {
      return ""
    }
  }

  const formatDateSeparator = (timestamp: string): string => {
    if (!timestamp) return ""
    try {
      const messageDate = new Date(timestamp)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Reset time to compare only dates
      const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

      if (messageDateOnly.getTime() === todayOnly.getTime()) {
        return "Today"
      } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
        return "Yesterday"
      } else {
        // Format as "DD/MM/YYYY" or use locale-specific format
        return messageDate.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        })
      }
    } catch {
      return ""
    }
  }

  const isDifferentDate = (date1: string, date2: string): boolean => {
    if (!date1 || !date2) return true
    try {
      const d1 = new Date(date1)
      const d2 = new Date(date2)
      return (
        d1.getFullYear() !== d2.getFullYear() ||
        d1.getMonth() !== d2.getMonth() ||
        d1.getDate() !== d2.getDate()
      )
    } catch {
      return true
    }
  }

  const getMessageStatusText = (message: Message): string => {
    const normalizedStatus = message.status ?? (message.seen_at ? 'seen' : message.delivered_at ? 'delivered' : 'sent')

    if (normalizedStatus === 'seen') {
      if (message.seen_at) {
        const seenDate = new Date(message.seen_at)
        const diffMs = Date.now() - seenDate.getTime()
        if (diffMs <= 2 * 60 * 1000) {
          return "Seen just now"
        }
        return `Seen ${formatClockTime(message.seen_at)}`
      }
      return "Seen"
    }

    if (normalizedStatus === 'delivered') {
      return `Delivered ${formatClockTime(message.delivered_at || message.created_at)}`
    }

    return `Sent ${formatClockTime(message.created_at)}`
  }

  // Detect placeholder content that only represented an uploaded file
  const shouldHideMessage = (content: string): boolean => {
    const trimmed = content.trim()
    if (!trimmed) return true

    const mediaExtPattern = /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|heic|heif)$/i
    const looksLikePath = /chat-media\//i.test(trimmed) || /^[a-z0-9_-]+\.[a-z0-9]+$/i.test(trimmed)
    const looksLikeUrl = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|heic|heif)(\?.*)?$/i.test(trimmed)

    if (mediaExtPattern.test(trimmed)) {
      return true
    }

    if (looksLikePath || looksLikeUrl) {
      return true
    }

    return false
  }

  const applyLocalMessageUpdate = (updatedMessage: Message | null) => {
    if (!updatedMessage) return
    setMessages((prev) => prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)))
  }

  const stopTrackingMessage = (messageId: string) => {
    const trackedNode = messageElementMapRef.current.get(messageId)
    if (trackedNode && observerRef.current) {
      observerRef.current.unobserve(trackedNode)
    }
    messageElementMapRef.current.delete(messageId)
  }

  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const node = entry.target as HTMLElement
      const messageId = node.dataset.messageId
      const userId = currentUserIdRef.current
      if (!messageId || !userId) return
      if (seenInFlightRef.current.has(messageId)) return

      const message = messagesSnapshotRef.current.find((m) => m.id === messageId)
      if (!message) {
        return
      }
      if (message.receiver_id !== userId || message.seen_at) {
        stopTrackingMessage(messageId)
        return
      }

      seenInFlightRef.current.add(messageId)
      markMessageSeen(messageId, userId)
        .then((updated) => {
          applyLocalMessageUpdate(updated)
        })
        .finally(() => {
          seenInFlightRef.current.delete(messageId)
          stopTrackingMessage(messageId)
        })
    })
  }

  const getObserver = () => {
    if (typeof window === "undefined") return null
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(handleIntersection, {
        threshold: 0.75,
      })
    }
    return observerRef.current
  }

  const registerMessageNode = (messageId: string, node: HTMLDivElement | null, shouldTrack: boolean) => {
    stopTrackingMessage(messageId)
    if (!node || !shouldTrack) {
      return
    }

    node.dataset.messageId = messageId
    const observer = getObserver()
    if (observer) {
      messageElementMapRef.current.set(messageId, node)
      observer.observe(node)
    }
  }

  const getVisibilityRef = (messageId: string, shouldTrack: boolean) => (node: HTMLDivElement | null) => {
    registerMessageNode(messageId, node, shouldTrack)
  }

  useEffect(() => {
    messagesSnapshotRef.current = messages
  }, [messages])

  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      messageElementMapRef.current.clear()
      seenInFlightRef.current.clear()
      
      // Clean up typing timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (typingEmitTimeoutRef.current) {
        clearTimeout(typingEmitTimeoutRef.current)
      }
    }
  }, [])

  // Cleanup typing when leaving chat
  useEffect(() => {
    return () => {
      // Stop typing when component unmounts or matchId changes
      if (matchId && chatUser?.id && isConnected && sendTyping) {
        sendTyping(matchId, chatUser.id, false)
      }
    }
  }, [matchId, chatUser?.id, isConnected, sendTyping])

  // Load match and user info
  useEffect(() => {
    async function loadMatchInfo() {
      if (!matchId) {
        setLoading(false)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        setCurrentUserId(user.id)

        let { data: matchData, error: matchError } = await supabase
          .from('matrimony_matches')
          .select('user1_id, user2_id')
          .eq('id', matchId)
          .eq('is_active', true)
          .single()

        let otherUserId: string | null = null
        let currentMatchType: 'matrimony' = 'matrimony'

        if (matchError || !matchData) {
          console.error('Match not found')
          setLoading(false)
          return
        }

        setMatchType(currentMatchType)

        // Determine other user ID
        if (matchData.user1_id === user.id) {
          otherUserId = matchData.user2_id
        } else if (matchData.user2_id === user.id) {
          otherUserId = matchData.user1_id
        } else {
          console.error('User is not part of this match')
          setLoading(false)
          return
        }

        if (!otherUserId) {
          setLoading(false)
          return
        }

        // Get other user's profile
        const { data: profile, error: profileError } = await supabase
          .from('matrimony_profile_full')
          .select('name, photos')
          .eq('user_id', otherUserId)
          .single()

        if (profileError) {
          console.error('Error loading profile:', profileError)
        }

        setChatUser({
          id: otherUserId,
          name: profile?.name || 'Unknown',
          avatar: (profile?.photos as string[])?.[0] || '/placeholder-user.jpg',
          isOnline: false,
          isPremium: false,
        })

        // Load messages
        const loadedMessages = await getMessages(matchId, user.id, currentMatchType)
        setMessages(loadedMessages)

        // Mark received messages as delivered
        const pendingDeliveries = loadedMessages
          .filter((msg) => msg.receiver_id === user.id && !msg.delivered_at)
          .map((msg) =>
            markMessageDelivered(msg.id, user.id).then((updated) => {
              applyLocalMessageUpdate(updated)
            }),
          )

        if (pendingDeliveries.length > 0) {
          await Promise.allSettled(pendingDeliveries)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading match info:', error)
        setLoading(false)
      }
    }

    loadMatchInfo()
  }, [matchId])

  // Set up real-time subscription (Supabase Realtime as fallback)
  useEffect(() => {
    if (!matchId || !currentUserId || !matchType) return

    // Cleanup previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = subscribeToMessages(
      matchId,
      matchType,
      {
        onInsert: async (message: Message) => {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === message.id)) {
              return prev
            }
            return [...prev, message]
          })

          // Mark as delivered if we're the receiver
          if (message.receiver_id === currentUserId && !message.delivered_at) {
            const updated = await markMessageDelivered(message.id, currentUserId)
            applyLocalMessageUpdate(updated)
          }
        },
        onUpdate: (message: Message) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === message.id ? message : m))
          )
        },
        onDelete: (messageId: string) => {
          setMessages((prev) => prev.filter((m) => m.id !== messageId))
          setActiveMenu((prev) => (prev?.messageId === messageId ? null : prev))
        },
        onError: (error) => {
          console.error('Realtime subscription error:', error)
        },
      }
    )

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [matchId, currentUserId, matchType])

  // Join Socket.io conversation room
  useEffect(() => {
    if (!matchId || !isConnected) return

    joinConversation(matchId)

    return () => {
      leaveConversation(matchId)
    }
  }, [matchId, isConnected, joinConversation, leaveConversation])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const hideMessageForCurrentUser = (message: Message) => {
    if (!currentUserId) return false
    return (message.deleted_by || []).includes(currentUserId)
  }

  // Handle typing indicator
  const handleTyping = () => {
    if (!matchId || !chatUser?.id || !currentUserId || !isConnected) return

    // Clear existing timeout
    if (typingEmitTimeoutRef.current) {
      clearTimeout(typingEmitTimeoutRef.current)
    }

    // Emit typing start
    sendTyping(matchId, chatUser.id, true)

    // Emit typing stop after 2 seconds of no typing
    typingEmitTimeoutRef.current = setTimeout(() => {
      sendTyping(matchId, chatUser.id, false)
    }, 2000)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !matchId || !currentUserId || !chatUser) return

    const messageContent = newMessage.trim()

    try {
      setUploading(true)
      const limitStatus = await getMessageSendLimitStatus(currentUserId, chatUser.id)
      if (!limitStatus.allowed) {
        toast({
          title: "Free plan limit reached",
          description: limitStatus.error || "Upgrade for unlimited conversations.",
          variant: "destructive",
        })
        return
      }

      setNewMessage("")

      // Optimistic update
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        match_id: matchId,
        sender_id: currentUserId,
        receiver_id: chatUser.id,
        content: messageContent,
        reply_to_message_id: replyPreview?.messageId || null,
        deleted_by: [],
        created_at: new Date().toISOString(),
        delivered_at: null,
        seen_at: null,
        status: 'sent',
        delivered_to: [],
        seen_by: [],
        match_type: matchType,
      }

      setMessages((prev) => [...prev, tempMessage])

      const sentMessage = await sendMessageService(
        matchId,
        currentUserId,
        chatUser.id,
        messageContent,
        matchType,
        false,
        replyPreview?.messageId || null
      )

      if (!sentMessage) {
        throw new Error('Failed to send message')
      }

      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? sentMessage : m))
      )

      // Also send via Socket.io for real-time delivery
      if (sentMessage && isConnected) {
        sendMessageSocket(matchId, chatUser.id, sentMessage)
      }
      
      // Stop typing indicator
      if (typingEmitTimeoutRef.current) {
        clearTimeout(typingEmitTimeoutRef.current)
      }
      sendTyping(matchId, chatUser.id, false)
      
      setReplyPreview(null)
    } catch (error: any) {
      console.error('Error sending message:', error)
      
      let errorMessage = "Failed to send message. Please try again."
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.error?.message) {
        errorMessage = error.error.message
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')))
      // Restore message text
      setNewMessage(messageContent)
    } finally {
      setUploading(false)
    }
  }

  const handleBlockUser = async () => {
    if (!currentUserId || !chatUser) return

    try {
      const result = await blockUser(currentUserId, chatUser.id, matchType)
      
      if (result.success) {
        toast({
          title: "User Blocked",
          description: `${chatUser.name} has been blocked`,
          variant: "destructive",
        })
        // Navigate back to dashboard after blocking
        if (onBack) {
          onBack()
        } else {
          router.push('/matrimony/discovery')
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to block user",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error blocking user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to block user",
        variant: "destructive",
      })
    }
    setShowBlockDialog(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode)
    setSelectedMessages(new Set())
    setActiveMenu(null) // Close any open message menu
  }

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  const handleDeleteSelected = async (deleteType: 'me' | 'everyone') => {
    if (selectedMessages.size === 0 || !currentUserId) return

    try {
      const messageIds = Array.from(selectedMessages)
      let successCount = 0
      let failCount = 0

      for (const messageId of messageIds) {
        const message = messages.find((m) => m.id === messageId)
        if (!message) continue

        try {
          if (deleteType === 'everyone') {
            // Only allow delete for everyone if user is the sender
            if (message.sender_id === currentUserId) {
              const result = await deleteMessageForEveryone(messageId, currentUserId)
              if (result) {
                setMessages((prev) => prev.filter((m) => m.id !== messageId))
                successCount++
              } else {
                failCount++
              }
            } else {
              failCount++
            }
          } else {
            // Delete for me
            const result = await deleteMessageForMe(messageId, currentUserId)
            if (result) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId
                    ? { ...m, deleted_by: Array.from(new Set([...(m.deleted_by || []), currentUserId])) }
                    : m
                )
              )
              successCount++
            } else {
              failCount++
            }
          }
        } catch (error) {
          console.error(`Failed to delete message ${messageId}:`, error)
          failCount++
        }
      }

      if (successCount > 0) {
        toast({
          title: "Success",
          description: `Deleted ${successCount} message${successCount > 1 ? 's' : ''}`,
        })
      }
      if (failCount > 0) {
        toast({
          title: "Error",
          description: `Failed to delete ${failCount} message${failCount > 1 ? 's' : ''}`,
          variant: "destructive",
        })
      }

      setSelectedMessages(new Set())
      setIsSelectMode(false)
    } catch (error: any) {
      console.error("Error deleting messages:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete messages",
        variant: "destructive",
      })
    }
  }

  // Close header menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false)
      }
    }

    if (isHeaderMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isHeaderMenuOpen])

  const isMatrimony = matchType === 'matrimony'

  if (loading) {
    return (
      <div className={cn("flex flex-col h-screen relative", isMatrimony ? "bg-white" : "bg-[#0E0F12]")}>
        <StaticBackground />
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto border-4 border-[#97011A] border-t-transparent rounded-full animate-spin" />
            <p className={cn("text-sm", isMatrimony ? "text-black" : "text-white")}>Loading chat...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!matchId || !chatUser) {
    return (
      <div className={cn("flex flex-col h-screen relative", isMatrimony ? "bg-white" : "bg-[#0E0F12]")}>
        <StaticBackground />
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <p className={cn("text-sm", isMatrimony ? "text-black" : "text-white")}>Chat not found</p>
            {onBack && (
              <Button 
                onClick={onBack} 
                variant="outline" 
                className={isMatrimony ? "bg-white border-[#E5E5E5] text-black" : "bg-[#14161B] border-white/20 text-white"}
              >
                Go Back
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-screen relative", isMatrimony ? "bg-white" : "bg-[#0E0F12]")}>
      {/* Static Background */}
      <StaticBackground />
      
      {/* Header */}
      <div className={cn(
        "flex-shrink-0 p-4 border-b backdrop-blur-xl relative z-[40] shadow-lg",
        isMatrimony ? "border-[#E5E5E5] bg-white" : "border-white/20 bg-[#14161B]/50"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "p-2 rounded-full backdrop-blur-xl border",
                  isMatrimony ? "hover:bg-gray-50 bg-white border-[#E5E5E5]" : "hover:bg-white/10 bg-white/10 border-white/20"
                )}
                onClick={onBack}
              >
                <ArrowLeft className={cn("w-5 h-5", isMatrimony ? "text-black" : "text-white")} />
              </Button>
            )}

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className={cn("w-12 h-12 border-2", isMatrimony ? "border-[#E5E5E5]" : "border-white/30")}>
                  <AvatarImage src={chatUser.avatar || "/placeholder.svg"} alt={chatUser.name} />
                  <AvatarFallback className={cn("text-lg", isMatrimony ? "bg-gray-100 text-black" : "bg-white/20 text-white")}>
                    {chatUser.name[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                {chatUser.isOnline && (
                  <div className={cn("absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 rounded-full", isMatrimony ? "border-white" : "border-[#0E0F12]")} />
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h2 className={cn("font-bold text-lg", isMatrimony ? "text-black" : "text-white")}>{chatUser.name}</h2>
                  {chatUser.isPremium && (
                    <Badge className="bg-[#97011A] text-white text-xs px-2 py-0">
                      Premium
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <p className={cn("text-sm", isMatrimony ? "text-[#444444]" : "text-[#A1A1AA]")}>
                    {isTyping ? "typing..." : chatUser.isOnline ? "Online now" : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isSelectMode && selectedMessages.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="mr-2"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedMessages.size})
              </Button>
            )}
            {isSelectMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectMode}
                className={cn("mr-2", isMatrimony ? "text-black" : "text-white")}
              >
                Cancel
              </Button>
            )}
            {!isSelectMode && (
              <div className="relative z-[50]" ref={headerMenuRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("p-2 rounded-full", isMatrimony ? "hover:bg-gray-50 text-black" : "hover:bg-white/10 text-white")}
                  onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                >
                  <MoreVertical className={cn("w-5 h-5", isMatrimony ? "text-black" : "text-white")} />
                </Button>

                {/* Header Menu */}
                {isHeaderMenuOpen && (
                  <div className={cn(
                    "absolute right-0 top-full mt-2 z-[9999] min-w-[160px] rounded-2xl border text-sm shadow-2xl backdrop-blur-lg pointer-events-auto",
                    isMatrimony ? "border-[#E5E5E5] bg-white text-black" : "border-white/10 bg-black/90 text-white"
                  )}>
                    <div className="flex flex-col py-1">
                      <button
                        onClick={() => {
                          toggleSelectMode()
                        }}
                        className={cn("flex w-full items-center gap-3 px-4 py-2 text-left transition-colors pointer-events-auto", isMatrimony ? "hover:bg-gray-50 active:bg-gray-100" : "hover:bg-white/10 active:bg-white/20")}
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>Select</span>
                      </button>
                      <button
                        onClick={() => {
                          // Select all messages
                          setIsSelectMode(true)
                          setSelectedMessages(new Set(messages.map(m => m.id)))
                          setIsHeaderMenuOpen(false)
                        }}
                        className={cn("flex w-full items-center gap-3 px-4 py-2 text-left transition-colors pointer-events-auto", isMatrimony ? "hover:bg-gray-50 active:bg-gray-100" : "hover:bg-white/10 active:bg-white/20")}
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>Select all</span>
                      </button>
                      <button
                        onClick={() => {
                          // Navigate to user's profile
                          setIsHeaderMenuOpen(false)
                          if (onViewProfile) {
                            onViewProfile(chatUser.id, matchType)
                          } else {
                            // Fallback to router navigation if onViewProfile not provided
                            router.push(`/profile?userId=${chatUser.id}&mode=${matchType}`)
                          }
                        }}
                        className={cn("flex w-full items-center gap-3 px-4 py-2 text-left transition-colors pointer-events-auto", isMatrimony ? "hover:bg-gray-50 active:bg-gray-100" : "hover:bg-white/10 active:bg-white/20")}
                      >
                        <User className="w-4 h-4" />
                        <span>View profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsHeaderMenuOpen(false)
                          setShowBlockDialog(true)
                        }}
                        className={cn("flex w-full items-center gap-3 px-4 py-2 text-left transition-colors pointer-events-auto", isMatrimony ? "hover:bg-gray-50 active:bg-gray-100" : "hover:bg-white/10 active:bg-white/20")}
                      >
                        <Ban className="w-4 h-4" />
                        <span>Block</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsHeaderMenuOpen(false)
                          setShowReportDialog(true)
                        }}
                        className={cn("flex w-full items-center gap-3 px-4 py-2 text-left transition-colors pointer-events-auto", isMatrimony ? "hover:bg-gray-50 active:bg-gray-100" : "hover:bg-white/10 active:bg-white/20")}
                      >
                        <Flag className="w-4 h-4" />
                        <span>Report</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-page Notification */}
      {inPageNotification && (
        <div className="flex-shrink-0 px-4 py-2 animate-in slide-in-from-top duration-300">
          <div className="bg-primary/90 backdrop-blur-sm border border-primary/50 rounded-lg px-4 py-2 shadow-lg">
            <p className="text-sm" style={{ color: '#FFFFFF' }}>
              <span className="font-semibold">New message from {inPageNotification.senderName}:</span>
              <span className="ml-2">{inPageNotification.message}</span>
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", isMatrimony ? "bg-gray-100" : "bg-white/10")}>
              <Heart className={cn("w-8 h-8", isMatrimony ? "text-[#444444]" : "text-[#A1A1AA]")} />
            </div>
            <h3 className={cn("text-lg font-semibold mb-2", isMatrimony ? "text-black" : "text-white")}>It's a Match!</h3>
            <p className={cn("text-sm", isMatrimony ? "text-[#444444]" : "text-[#A1A1AA]")}>Start the conversation with {chatUser.name}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(() => {
              // Filter visible messages first
              const visibleMessages = messages.filter((msg) => {
                if (shouldHideMessage(msg.content)) return false
                if (hideMessageForCurrentUser(msg)) return false
                return true
              })

              return visibleMessages.map((message, visibleIndex) => {
                const originalIndex = messages.findIndex((m) => m.id === message.id)
                const isOwn = message.sender_id === currentUserId
                const shouldTrackVisibility = !isOwn && message.receiver_id === currentUserId && !message.seen_at
                const repliedMessage = message.reply_to_message_id
                  ? messages.find((m) => m.id === message.reply_to_message_id)
                  : null
                
                // Check if we need to show a date separator
                const previousVisibleMessage = visibleIndex > 0 ? visibleMessages[visibleIndex - 1] : null
                const showDateSeparator = !previousVisibleMessage || 
                  isDifferentDate(message.created_at, previousVisibleMessage.created_at)

                return (
                  <div key={message.id}>
                    {/* Date Separator */}
                    {showDateSeparator && (
                      <div className="flex items-center justify-center my-4">
                        <div className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          isMatrimony 
                            ? "bg-gray-200 text-[#444444]" 
                            : "bg-white/10 text-white/80 backdrop-blur-sm"
                        )}>
                          {formatDateSeparator(message.created_at)}
                        </div>
                      </div>
                    )}
                    
                    <div className="animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${originalIndex * 50}ms` }}>
                  <div className={cn("flex mb-3 items-start gap-2", isOwn ? "justify-end" : "justify-start")}>
                    {/* Checkbox for received messages (left side) */}
                    {isSelectMode && !isOwn && (
                      <div className="flex items-center pt-2">
                        <input
                          type="checkbox"
                          checked={selectedMessages.has(message.id)}
                          onChange={() => toggleMessageSelection(message.id)}
                          className="w-5 h-5 rounded border-white/30 bg-white/10 text-primary focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    )}
                    
                    <div className="relative max-w-[85%] sm:max-w-[80%]">
                      <div
                        ref={getVisibilityRef(message.id, shouldTrackVisibility)}
                        data-message-id={message.id}
                        onClick={(event) => {
                          event.stopPropagation()
                          if (isSelectMode) {
                            toggleMessageSelection(message.id)
                          } else {
                            showMenuForMessage(event.currentTarget, {
                              messageId: message.id,
                              messageText: message.content,
                              isOwn,
                            })
                          }
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault()
                          if (!isSelectMode) {
                            showMenuForMessage(event.currentTarget, {
                              messageId: message.id,
                              messageText: message.content,
                              isOwn,
                            })
                          }
                        }}
                        className={cn(
                          "px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl backdrop-blur-sm border",
                          isSelectMode ? "cursor-pointer" : "cursor-pointer",
                          isOwn
                            ? isMatrimony 
                              ? "bg-[#97011A] border-[#97011A] rounded-br-md text-white"
                              : "bg-white/20 border-white/30 rounded-br-md"
                            : isMatrimony
                              ? "bg-gray-100 border-[#E5E5E5] rounded-bl-md text-black"
                              : "bg-white/15 border-white/20 rounded-bl-md",
                          activeMenu?.messageId === message.id && !isSelectMode && (isMatrimony ? "ring-2 ring-[#97011A]/40" : "ring-2 ring-white/60"),
                          selectedMessages.has(message.id) && "ring-2 ring-primary",
                        )}
                      >
                        {repliedMessage && (
                          <div className={cn("mb-2 rounded-xl border px-3 py-2 text-xs", isMatrimony ? "border-[#E5E5E5] bg-gray-50" : "border-white/10 bg-white/10")}>
                            <p className={cn("text-[11px] uppercase tracking-wide", isMatrimony ? "text-[#444444]" : "text-[#A1A1AA]")}>
                              Reply to {repliedMessage.sender_id === currentUserId ? "You" : chatUser.name}
                            </p>
                            <p className={cn("line-clamp-2", isMatrimony ? "text-black" : "text-white/90")}>
                              {repliedMessage.content || "Message deleted"}
                            </p>
                          </div>
                        )}
                        {message.content.trim() && (
                          <p className={cn("text-sm leading-relaxed whitespace-pre-line break-words", isOwn ? (isMatrimony ? "text-white" : "text-white") : (isMatrimony ? "text-black" : "text-white"))}>
                            {message.content}
                          </p>
                        )}
                        <div
                          className={cn(
                            "flex items-center justify-end mt-2",
                            "",
                          )}
                        >
                          {isOwn ? (
                            <span className={cn("text-xs font-medium transition-all duration-200", isMatrimony ? "text-white/90" : "text-white/80")}>
                              {getMessageStatusText(message)}
                            </span>
                          ) : (
                            <span className={cn("text-xs", isMatrimony ? "text-[#444444]" : "text-white/60")}>{formatClockTime(message.created_at)}</span>
                          )}
                        </div>
                      </div>
                      {activeMenu?.messageId === message.id && activeMenu && !isSelectMode && (
                        <MessageActionMenu
                          messageId={message.id}
                          messageText={message.content}
                          isOwnMessage={isOwn}
                          anchor={isOwn ? "right" : "left"}
                          anchorElement={activeMenu.anchorElement}
                          preferredPlacement={activeMenu.preferredPlacement}
                          onReply={() => {
                            setReplyPreview({
                              messageId: message.id,
                              text: message.content,
                              senderLabel: isOwn ? "You" : chatUser.name,
                            })
                          }}
                          onCopy={async () => {
                            try {
                              await navigator.clipboard.writeText(message.content)
                              toast({
                                title: "Copied",
                                description: "Message copied to clipboard",
                              })
                            } catch (error) {
                              console.error("Copy failed", error)
                              toast({
                                title: "Unable to copy",
                                description: "Clipboard permission denied",
                                variant: "destructive",
                              })
                            }
                          }}
                          onDeleteMe={async () => {
                            if (!currentUserId) return
                            const previousDeletedBy = message.deleted_by || []
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === message.id
                                  ? {
                                      ...m,
                                      deleted_by: Array.from(new Set([...(m.deleted_by || []), currentUserId])),
                                    }
                                  : m,
                              ),
                            )
                            const updated = await deleteMessageForMe(message.id, currentUserId)
                            if (!updated) {
                              toast({
                                title: "Delete failed",
                                description: "Unable to delete message for you",
                                variant: "destructive",
                              })
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === message.id ? { ...m, deleted_by: previousDeletedBy } : m,
                                ),
                              )
                            }
                          }}
                          onDeleteEveryone={async () => {
                            if (!currentUserId) return
                            const deletedMessageSnapshot = message
                            setMessages((prev) => prev.filter((m) => m.id !== message.id))
                            const success = await deleteMessageForEveryone(message.id, currentUserId)
                            if (!success) {
                              toast({
                                title: "Delete failed",
                                description: "Unable to delete message for everyone",
                                variant: "destructive",
                              })
                              setMessages((prev) => {
                                if (prev.some((m) => m.id === deletedMessageSnapshot.id)) {
                                  return prev
                                }
                                return [...prev, deletedMessageSnapshot].sort(
                                  (a, b) =>
                                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
                                )
                              })
                            }
                          }}
                          onClose={() => setActiveMenu(null)}
                        />
                      )}
                    </div>
                    {isSelectMode && isOwn && (
                      <div className="flex items-center pt-2">
                        <input
                          type="checkbox"
                          checked={selectedMessages.has(message.id)}
                          onChange={() => toggleMessageSelection(message.id)}
                          className="w-5 h-5 rounded border-white/30 bg-white/10 text-primary focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    )}
                  </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}
        
        {/* Typing Indicator */}
        {otherUserTyping && (
          <div className="flex justify-start mb-3">
            <div className={cn(
              "backdrop-blur-sm rounded-2xl rounded-bl-md px-4 py-2 max-w-[85%] sm:max-w-[80%] shadow-lg border",
              isMatrimony ? "bg-gray-100 border-[#E5E5E5] text-black" : "bg-white/15 border-white/20 text-white"
            )}>
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className={cn("w-2 h-2 rounded-full animate-bounce", isMatrimony ? "bg-[#444444]" : "bg-white/70")} style={{ animationDelay: '0ms' }} />
                  <div className={cn("w-2 h-2 rounded-full animate-bounce", isMatrimony ? "bg-[#444444]" : "bg-white/70")} style={{ animationDelay: '150ms' }} />
                  <div className={cn("w-2 h-2 rounded-full animate-bounce", isMatrimony ? "bg-[#444444]" : "bg-white/70")} style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className={cn(
        "flex-shrink-0 p-4 border-t backdrop-blur-xl shadow-lg",
        isMatrimony ? "border-[#E5E5E5] bg-white" : "border-white/20 bg-[#14161B]/50"
      )}>
        {replyPreview && (
          <div className={cn(
            "mb-2 flex items-center justify-between rounded-2xl border px-3 py-2 text-sm",
            isMatrimony ? "border-[#E5E5E5] bg-gray-50 text-black" : "border-white/10 bg-white/10 text-white"
          )}>
            <div>
              <p className={cn("text-xs uppercase tracking-wide", isMatrimony ? "text-[#444444]" : "text-[#A1A1AA]")}>
                Replying to {replyPreview.senderLabel}
              </p>
              <p className={cn("line-clamp-2", isMatrimony ? "text-black" : "text-white/90")}>
                {replyPreview.text || "Media message"}
              </p>
            </div>
            <button
              type="button"
              className={cn("ml-3 rounded-full p-1", isMatrimony ? "text-[#444444] hover:bg-gray-200" : "text-white/70 hover:bg-white/20")}
              onClick={() => setReplyPreview(null)}
              aria-label="Cancel reply"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              onKeyPress={handleKeyPress}
              className={cn(
                "pr-12 rounded-full text-sm border-2 backdrop-blur-sm focus:border-[#97011A]/50 transition-colors",
                isMatrimony 
                  ? "border-[#E5E5E5] bg-white text-black placeholder:text-[#444444]"
                  : "border-white/20 bg-[#14161B] text-white"
              )}
              disabled={uploading}
            />
            <Button
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full p-0 bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || uploading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedMessages.size} {selectedMessages.size === 1 ? 'message' : 'messages'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Choose how you want to delete the selected {selectedMessages.size === 1 ? 'message' : 'messages'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false)
                  handleDeleteSelected('me')
                }}
                className="flex-1 sm:flex-initial"
              >
                Delete for me
              </Button>
              {currentUserId && Array.from(selectedMessages).some(msgId => {
                const msg = messages.find(m => m.id === msgId)
                return msg?.sender_id === currentUserId
              }) && (
                <AlertDialogAction
                  onClick={() => {
                    setShowDeleteDialog(false)
                    handleDeleteSelected('everyone')
                  }}
                  className="flex-1 sm:flex-initial"
                >
                  Delete for everyone
                </AlertDialogAction>
              )}
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {chatUser?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will block {chatUser?.name} and you won't be able to message each other anymore. The match will be deactivated. You can unblock them later from your settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowBlockDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockUser} className="bg-red-600 hover:bg-red-700">
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      {currentUserId && chatUser && (
        <ReportDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          reportedUserId={chatUser.id}
          reporterId={currentUserId}
          matchType={matchType}
          userName={chatUser.name}
          onSuccess={() => {
            toast({
              title: "Report Submitted",
              description: `Your report for ${chatUser.name} has been submitted for review.`,
            })
          }}
        />
      )}
    </div>
  )
}
