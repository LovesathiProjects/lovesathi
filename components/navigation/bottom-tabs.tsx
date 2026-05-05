"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { MessageCircle, User, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount"
import { useUnreadActivityCount } from "@/hooks/useUnreadActivityCount"

interface TabItem {
  id: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const allTabs: TabItem[] = [
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
          "fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t z-50",
          "bg-white border-[#E5E5E5] shadow-[0_-2px_8px_rgba(0,0,0,0.08)]"
        )}
      >
        <div className="flex items-center justify-around py-2 px-2">
          {allTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = currentTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 min-w-0 flex-1 transition-all duration-150 ease-in-out",
                  isActive ? "" : "hover:bg-black/4 cursor-pointer"
                )}
              >
                <div className={cn(
                  "relative flex items-center justify-center",
                  isActive && "p-2 rounded-full bg-black/8 backdrop-blur-[8px] shadow-[0_4px_10px_rgba(0,0,0,0.08)]"
                )}>
                  <Icon 
                    className={cn(
                      "w-5 h-5 sm:w-6 sm:h-6 mb-1 transition-all duration-150 ease-in-out",
                      isActive && "stroke-[2.5]"
                    )}
                    stroke={isActive ? "#000000" : "rgba(0,0,0,0.75)"}
                    strokeWidth={isActive ? 2.5 : 2}
                    fill="none"
                    style={{
                      color: isActive ? '#000000' : 'rgba(0,0,0,0.75)',
                      stroke: isActive ? '#000000' : 'rgba(0,0,0,0.75)',
                      fill: 'none',
                      opacity: isActive ? 1 : 0.75
                    }}
                  />
                  {/* Unread message badge for messages icon */}
                  {tab.id === "messages" && unreadCount > 0 && (
                    <div className={cn(
                      "absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-[#97011A] text-white text-[10px] font-bold shadow-md z-10",
                      "border-2 border-white"
                    )}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                  {/* Unread activity badge for activity icon */}
                  {tab.id === "activity" && activityUnreadCount > 0 && (
                    <div className={cn(
                      "absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-[#97011A] text-white text-[10px] font-bold shadow-md z-10",
                      "border-2 border-white"
                    )}>
                      {activityUnreadCount > 99 ? '99+' : activityUnreadCount}
                    </div>
                  )}
                </div>
                <span 
                  className={cn(
                    "text-xs font-semibold truncate transition-colors duration-150 ease-in-out",
                    isActive ? "text-black" : "text-black/75"
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
