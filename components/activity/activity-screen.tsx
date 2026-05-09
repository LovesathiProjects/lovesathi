"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarDays, Crown, Eye, Gem, Heart, Sparkles, Loader2, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { StaticBackground } from "@/components/discovery/static-background"
import { supabase } from "@/lib/supabaseClient"
import { 
  getMatrimonyActivity,
  recordMatrimonyLike,
  type ActivityItem 
} from "@/lib/matchmakingService"
import { getUserEntitlementStatus } from "@/lib/planLimits"
import { useToast } from "@/hooks/use-toast"
import { formatPublicProfileName, getDisplayInitial } from "@/lib/displayName"

interface ActivityScreenProps {
  onProfileClick?: (userId: string) => void
  onMatchClick?: (matchId: string) => void
  mode?: 'matrimony'
  onBack?: () => void
  onUpgrade?: () => void
}

type ActivityTab = 'all_matches' | 'today_matches' | 'super_liked' | 'recent_views'

export function ActivityScreen({ onProfileClick, onMatchClick, onBack, onUpgrade }: ActivityScreenProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>('all_matches')
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [likedBack, setLikedBack] = useState<Set<string>>(new Set())
  const [likingInProgress, setLikingInProgress] = useState<Set<string>>(new Set())
  const isMatrimony = true
  const { toast } = useToast()

  // Fetch activity data
  useEffect(() => {
    async function fetchActivity() {
      try {
        setLoading(true)
        setError(null)
        
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError("Please log in to view activity")
          setLoading(false)
          return
        }

        const activityData = await getMatrimonyActivity(user.id)
        const entitlement = await getUserEntitlementStatus(user.id)
        setIsPremium(entitlement.isPremium)
        setActivities(activityData)
      } catch (err: any) {
        console.error("Error fetching activity:", err)
        setError(err.message || "Failed to load activity")
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
  }, [])

  const handleLikeBack = async (activity: ActivityItem, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (likingInProgress.has(activity.id)) return
    
    try {
      setLikingInProgress(prev => new Set(prev).add(activity.id))
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("Please log in to like back")
        return
      }

      const result = await recordMatrimonyLike(user.id, activity.userId, 'like')
      
      if (result.success) {
        setLikedBack(prev => new Set(prev).add(activity.id))
        
        if (result.isMatch) {
          // Match created - navigate to chat immediately
          setError(null) // Clear any errors
          if (result.matchId && onMatchClick) {
            onMatchClick(result.matchId) // Navigate immediately, no delay
          }
          // Don't refresh activity - let navigation happen
        } else {
          // Not a match - refresh activity list (but don't let errors block UI)
          try {
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            if (currentUser) {
              const updatedActivity = await getMatrimonyActivity(currentUser.id)
              setActivities(updatedActivity)
            }
          } catch (refreshError) {
            // Log but don't show error - the like was successful
            console.error("Error refreshing activity:", refreshError)
          }
        }
      } else {
        toast({
          title: "Could not like back",
          description: result.error || "Please try again.",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      console.error("Error liking back:", err)
      toast({
        title: "Could not like back",
        description: err.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLikingInProgress(prev => {
        const next = new Set(prev)
        next.delete(activity.id)
        return next
      })
    }
  }

  const filteredActivities = activities.filter(activity => {
    if (activeTab === 'all_matches') return activity.type === 'match'
    if (activeTab === 'today_matches') {
      if (activity.type !== 'match') return false
      const occurredAt = activity.occurredAt || activity.timestamp
      const occurred = new Date(occurredAt)
      const today = new Date()
      return (
        occurred.getFullYear() === today.getFullYear() &&
        occurred.getMonth() === today.getMonth() &&
        occurred.getDate() === today.getDate()
      )
    }
    if (activeTab === 'super_liked') return activity.type === 'super_like'
    return activity.type === 'view'
  })

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'match':
        return <Sparkles className="w-4 h-4 text-[#C2A574]" />
      case 'like':
        return <Heart className="w-4 h-4 text-red-500 fill-current" />
      case 'super_like':
        return <Gem className="w-4 h-4 text-[#b8892f] fill-current" />
      case 'view':
        return <Eye className="w-4 h-4 text-[#C2A574]" />
      default:
        return null
    }
  }

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'match':
        return 'You matched!'
      case 'like':
        return 'liked your profile'
      case 'super_like':
        return 'sent you a Super Like'
      case 'view':
        return 'viewed your profile'
      default:
        return ''
    }
  }

  const tabs = [
    { id: 'all_matches' as const, label: 'All time matched', shortLabel: 'All matches', count: activities.filter(a => a.type === 'match').length, icon: Sparkles },
    { id: 'today_matches' as const, label: 'Matched today', count: activities.filter((a) => {
      if (a.type !== 'match') return false
      const occurred = new Date(a.occurredAt || a.timestamp)
      const today = new Date()
      return occurred.getFullYear() === today.getFullYear() && occurred.getMonth() === today.getMonth() && occurred.getDate() === today.getDate()
    }).length, shortLabel: 'Today', icon: CalendarDays },
    { id: 'super_liked' as const, label: 'Super liked', shortLabel: 'Super Likes', count: activities.filter(a => a.type === 'super_like').length, icon: Gem },
    { id: 'recent_views' as const, label: 'Recently viewed', shortLabel: 'Views', count: activities.filter(a => a.type === 'view').length, icon: Eye },
  ]

  return (
    <div className={cn("relative flex h-full flex-col", isMatrimony ? "luxe-light-page" : "bg-[#0E0F12]")}>
      {/* Static Background */}
      <StaticBackground />
      
      {/* Header with Back Button */}
      <div className={cn(
        "flex-shrink-0 p-4 border-b backdrop-blur-xl shadow-lg",
        isMatrimony ? "border-[#482b1a]/10 bg-[#ffffff]/84" : "border-white/20 bg-[#14161B]/50"
      )}>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
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
            <div>
              <p className="luxe-kicker text-[0.62rem] text-[#C2A574]">interest ledger</p>
              <h1 className={cn("font-serif text-3xl font-bold tracking-[-0.05em]", isMatrimony ? "text-[#3A2B24]" : "text-white")}>Activity</h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="-mx-4 flex max-w-[100vw] gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors",
                  activeTab === tab.id
                    ? "bg-[#C2A574] text-[#3A2B24] shadow-[0_12px_28px_rgba(194,165,116,0.22)]"
                    : isMatrimony 
                      ? "border border-[#482b1a]/10 bg-white/70 text-[#8B7B70] hover:bg-white"
                      : "bg-white/10 hover:bg-white/20 text-[#A1A1AA]"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && (
                  <Badge className={cn(
                    "ml-1 text-xs sm:ml-2",
                    activeTab === tab.id 
                      ? "bg-white/20 text-white"
                      : isMatrimony
                        ? "bg-gray-200 text-black"
                        : "bg-white/20 text-white"
                  )}>
                    {tab.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

        {/* Activity List */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Loader2 className={cn("w-8 h-8 animate-spin mb-4", isMatrimony ? "text-[#C2A574]" : "text-white")} />
            <p className={cn("text-sm", isMatrimony ? "text-black" : "text-white")}>Loading activity...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", isMatrimony ? "bg-gray-100" : "bg-white/10")}>
              <Heart className={cn("w-8 h-8", isMatrimony ? "text-[#444444]" : "text-[#A1A1AA]")} />
            </div>
            <h3 className={cn("text-lg font-semibold mb-2", isMatrimony ? "text-black" : "text-white")}>Error loading activity</h3>
            <p className={cn("text-sm mb-4", isMatrimony ? "text-[#444444]" : "text-[#A1A1AA]")}>{error}</p>
            <Button
              onClick={async () => {
                setError(null)
                setLoading(true)
                try {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (user) {
                    const activityData = await getMatrimonyActivity(user.id)
                    setActivities(activityData)
                  }
                } catch (err: any) {
                  setError(err.message || "Failed to load activity")
                } finally {
                  setLoading(false)
                }
              }}
              variant="outline"
              className={isMatrimony ? "border-[#E5E5E5] text-black" : ""}
            >
              Retry
            </Button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", isMatrimony ? "bg-gray-100" : "bg-white/10")}>
              <Heart className={cn("w-8 h-8", isMatrimony ? "text-[#444444]" : "text-[#A1A1AA]")} />
            </div>
            <h3 className={cn("text-lg font-semibold mb-2", isMatrimony ? "text-black" : "text-white")}>No activity yet</h3>
            <p className={cn("text-sm", isMatrimony ? "text-[#444444]" : "text-[#A1A1AA]")}>
              Explore curated profiles to see interests and matches here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const maskedView = activity.type === 'view' && !isPremium
                return (
              <div
                key={activity.id}
                className={cn(
                  "border backdrop-blur-sm rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer",
                  isMatrimony 
                    ? "luxe-card border-[#C2A574]/24 hover:bg-[#ffffff]"
                    : "bg-[#14161B] border-white/20 hover:bg-white/10"
                )}
                onClick={() => {
                  if (maskedView) {
                    onUpgrade?.()
                    toast({
                      title: "Unlock profile viewers",
                      description: "Subscribe to see who recently viewed your profile.",
                    })
                    return
                  }
                  onProfileClick?.(activity.userId)
                }}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className={cn("w-12 h-12 border-2", isMatrimony ? "border-[#E5E5E5]" : "border-white/30")}>
                      <AvatarImage src={maskedView ? "" : activity.avatar || "/placeholder.svg"} alt={maskedView ? "Premium viewer" : formatPublicProfileName(activity.name)} />
                      <AvatarFallback className={cn(isMatrimony ? "bg-gray-100 text-black" : "bg-white/20 text-white")}>
                        {maskedView ? "?" : getDisplayInitial(activity.name)}
                      </AvatarFallback>
                    </Avatar>
                    {maskedView && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[#3A2B24]/20 backdrop-blur-sm">
                        <Crown className="h-4 w-4 text-[#C2A574]" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getActivityIcon(activity.type)}
                      <h3 className={cn("font-semibold text-sm truncate", isMatrimony ? "text-black" : "text-white")}>
                        {maskedView ? "Premium viewer" : formatPublicProfileName(activity.name)}
                        {!maskedView && activity.age && <span className={cn("ml-1", isMatrimony ? "text-[#444444]" : "text-[#A1A1AA]")}>, {activity.age}</span>}
                      </h3>
                      {activity.isNew && (
                        <Badge className="bg-[#C2A574] text-[#3A2B24] text-xs px-1.5 py-0.5 border border-[#C2A574]">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className={cn("text-sm", isMatrimony ? "text-[#444444]" : "text-[#A1A1AA]")}>
                      {maskedView ? "viewed your profile. Unlock to see who it was." : getActivityText(activity)}
                    </p>
                    <p className={cn("text-xs mt-1", isMatrimony ? "text-[#444444]" : "text-white/60")}>
                      {activity.timestamp}
                    </p>
                  </div>

                  {activity.type === 'match' && (
                    <Button
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation()
                        const { data: { user } } = await supabase.auth.getUser()
                        if (user) {
                          const { getMatchId } = await import('@/lib/chatService')
                          const matchId = await getMatchId(user.id, activity.userId, 'matrimony')
                          
                          if (matchId && onMatchClick) {
                            onMatchClick(matchId)
                          } else if (onProfileClick) {
                            // Fall back to opening profile if matchId not found
                            onProfileClick(activity.userId)
                          }
                        }
                      }}
                      className="bg-[#C2A574] hover:bg-[#B9975E] text-[#3A2B24]"
                    >
                      Chat
                    </Button>
                  )}

                  {(activity.type === 'like' || activity.type === 'super_like') && (
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={(e) => handleLikeBack(activity, e)}
                        disabled={likingInProgress.has(activity.id) || likedBack.has(activity.id)}
                        className={cn(
                          "rounded-full p-1.5 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-2",
                          likedBack.has(activity.id)
                            ? "bg-red-500/20 border-red-500"
                            : isMatrimony
                              ? "bg-gray-100 border-[#E5E5E5] hover:border-[#C2A574]"
                              : "bg-black/40 border-white/60 hover:border-white/80"
                        )}
                      >
                        {likingInProgress.has(activity.id) ? (
                          <Loader2 className={cn("w-4 h-4 animate-spin", isMatrimony ? "text-[#C2A574]" : "text-white")} />
                        ) : (
                          <Heart
                            className={cn(
                              "w-4 h-4 transition-all duration-200",
                              likedBack.has(activity.id)
                                ? "text-red-500 fill-red-500"
                                : isMatrimony
                                  ? "text-[#C2A574] fill-[#C2A574]"
                                  : "text-white fill-white"
                            )}
                          />
                        )}
                      </button>
                      <span className={cn(
                        "text-[10px] font-medium transition-colors",
                        likedBack.has(activity.id)
                          ? "text-red-400"
                          : "text-white/70"
                      )}>
                        {likingInProgress.has(activity.id) 
                          ? "Liking..." 
                          : likedBack.has(activity.id) 
                            ? "Liked!" 
                            : "Like Back"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
