"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Bell, HeartHandshake, MessageCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount"
import { useUnreadActivityCount } from "@/hooks/useUnreadActivityCount"

interface TabItem {
  id: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const allTabs: TabItem[] = [
  { id: "discover", label: "Discover", icon: HeartHandshake },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "activity", label: "Activity", icon: Bell },
  { id: "profile", label: "Profile", icon: User },
]

interface BottomTabsProps {
  activeTab?: string
  onTabChange?: (tabId: string) => void
  mode?: 'matrimony'
}

export function BottomTabs({ activeTab = "discover", onTabChange }: BottomTabsProps) {
  const [currentTab, setCurrentTab] = useState(activeTab)
  const unreadCount = useUnreadMessageCount()
  const { unreadCount: activityUnreadCount } = useUnreadActivityCount()
  
  // Sync currentTab with activeTab prop
  useEffect(() => {
    setCurrentTab(activeTab)
  }, [activeTab])

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId)
    onTabChange?.(tabId)
  }

  return (
    <>
      <nav 
        data-bottom-nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl",
          "border-[#E83262]/24 bg-[#F6F7FB]/92 shadow-[0_-18px_50px_rgba(24,17,13,0.08)]"
        )}
      >
        <div className="mx-auto flex max-w-xl items-center justify-around px-2 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-2">
          {allTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = currentTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl p-2 transition-all duration-150 ease-in-out",
                  isActive ? "" : "cursor-pointer hover:bg-[#E83262]/8"
                )}
              >
                <div className={cn(
                  "relative flex items-center justify-center",
                  isActive && "rounded-full bg-[#E83262]/18 p-2 shadow-[0_8px_22px_rgba(194,165,116,0.16)] backdrop-blur-[8px]"
                )}>
                  <Icon 
                    className={cn(
                      "w-5 h-5 sm:w-6 sm:h-6 mb-1 transition-all duration-150 ease-in-out",
                      isActive && "stroke-[2.5]"
                    )}
                    stroke={isActive ? "#26364A" : "#6F7C8B"}
                    strokeWidth={isActive ? 2.5 : 2}
                    fill="none"
                    style={{
                      color: isActive ? '#26364A' : '#6F7C8B',
                      stroke: isActive ? '#26364A' : '#6F7C8B',
                      fill: 'none',
                      opacity: isActive ? 1 : 0.75
                    }}
                  />
                  {/* Unread message badge for messages icon */}
                  {tab.id === "messages" && unreadCount > 0 && (
                    <div className={cn(
                      "absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-[#E83262] text-white text-[10px] font-bold shadow-md z-10",
                      "border-2 border-white"
                    )}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                  {/* Unread activity badge for activity icon */}
                  {tab.id === "activity" && activityUnreadCount > 0 && (
                    <div className={cn(
                      "absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-[#E83262] text-white text-[10px] font-bold shadow-md z-10",
                      "border-2 border-white"
                    )}>
                      {activityUnreadCount > 99 ? '99+' : activityUnreadCount}
                    </div>
                  )}
                </div>
                <span 
                  className={cn(
                    "text-xs font-semibold truncate transition-colors duration-150 ease-in-out",
                    isActive ? "text-[#26364A]" : "text-[#6F7C8B]"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
