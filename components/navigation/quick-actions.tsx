"use client"

import type React from "react"
import { Compass, MessageCircle, User, Bell, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount"
import { useUnreadActivityCount } from "@/hooks/useUnreadActivityCount"

interface QuickActionsProps {
  onOpenChat: () => void
  onOpenProfile: () => void
  onDiscover?: () => void
  onOpenActivity?: () => void
  onOpenEvents?: () => void
  onOpenShortlist?: () => void
  showShortlist?: boolean
  activeTab?: string
  className?: string
  mode?: 'matrimony'
}

export function QuickActions({
  onOpenChat,
  onOpenProfile,
  onDiscover,
  onOpenActivity,
  onOpenEvents,
  onOpenShortlist,
  showShortlist = false,
  activeTab,
  className,
}: QuickActionsProps) {
  const unreadCount = useUnreadMessageCount()
  const { unreadCount: activityUnreadCount } = useUnreadActivityCount()
  
  const tabs: Array<{
    id: string
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    onClick?: () => void
    show: boolean
  }> = [
    { id: "discover", icon: Compass, onClick: onDiscover, show: !!onDiscover },
    { id: "shortlist", icon: Star, onClick: onOpenShortlist, show: showShortlist && !!onOpenShortlist },
    { id: "messages", icon: MessageCircle, onClick: onOpenChat, show: true },
    { id: "activity", icon: Bell, onClick: onOpenActivity, show: !!onOpenActivity },
    { id: "profile", icon: User, onClick: onOpenProfile, show: true },
  ].filter(tab => tab.show)

  return (
    <div
      className={cn(
        "fixed bottom-[calc(0.85rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-[min(calc(100vw-1rem),28rem)] -translate-x-1/2 sm:bottom-[calc(1rem+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <div className={cn(
        "flex w-full items-center justify-between gap-1 rounded-[2rem] border border-[#C2A574]/34 bg-[#ffffff]/90 px-3 py-2.5 shadow-[0_22px_70px_rgba(24,17,13,0.2)] ring-1 ring-white/60 backdrop-blur-2xl sm:gap-4 sm:px-8 sm:py-3",
      )}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={tab.onClick}
              className={cn(
                "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-150 ease-in-out sm:h-11 sm:w-11",
                isActive ? "bg-[#C2A574] shadow-[0_14px_34px_rgba(194,165,116,0.28)]" : "cursor-pointer hover:bg-[#C2A574]/8"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center",
                isActive && "p-2 rounded-full"
              )}>
                <Icon 
                  className={cn(
                    "w-5 h-5 transition-all duration-150 ease-in-out"
                  )} 
                  stroke={isActive ? "#ffffff" : "#8B7B70"}
                  strokeWidth={isActive ? 2.5 : 2}
                  fill="none"
                  style={{
                    color: isActive ? '#ffffff' : '#8B7B70',
                    stroke: isActive ? '#ffffff' : '#8B7B70',
                    fill: 'none',
                    opacity: isActive ? 1 : 0.9
                  }}
                />
                {/* Unread message badge for messages icon */}
                {tab.id === "messages" && unreadCount > 0 && (
                  <div className={cn(
                    "absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center px-1 rounded-full bg-[#C2A574] backdrop-blur-md border text-[#3A2B24] text-xs font-bold shadow-md z-10",
                    "border-white"
                  )} style={{ color: '#FFFFFF' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
                {/* Unread activity badge for activity icon */}
                {tab.id === "activity" && activityUnreadCount > 0 && (
                  <div className={cn(
                    "absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center px-1 rounded-full bg-[#C2A574] backdrop-blur-md border text-[#3A2B24] text-xs font-bold shadow-md z-10",
                    "border-white"
                  )} style={{ color: '#FFFFFF' }}>
                    {activityUnreadCount > 99 ? '99+' : activityUnreadCount}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
