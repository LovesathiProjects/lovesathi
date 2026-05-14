"use client"

import { cn } from "@/lib/utils"
import { Settings } from "lucide-react"

import type { ReactNode } from "react"
import { BottomTabs } from "@/components/navigation/bottom-tabs"

interface AppLayoutProps {
  children: ReactNode
  activeTab?: string
  onTabChange?: (tabId: string) => void
  showBottomTabs?: boolean
  onSettingsClick?: () => void
  showSettingsButton?: boolean
  currentScreen?: string
  mode?: 'matrimony'
}

export function AppLayout({ 
  children, 
  activeTab, 
  onTabChange, 
  showBottomTabs = true, 
  onSettingsClick,
  showSettingsButton = true,
  currentScreen,
  mode = 'matrimony'
}: AppLayoutProps) {
  const isDiscoverScreen = currentScreen === "discover"
  
  return (
    <div className={cn(
      "min-h-[100dvh] w-full overflow-x-hidden",
      "luxe-light-page",
      isDiscoverScreen && "h-[100dvh] overflow-hidden"
    )}>
      {/* Settings Icon - Only show on profile page */}
      {showSettingsButton && onSettingsClick && currentScreen === "profile" && (
        <div className="fixed right-4 top-[calc(1rem+env(safe-area-inset-top))] z-40">
          <button
            type="button"
            aria-label="Open settings"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E83262]/30 bg-white/82 shadow-[0_16px_45px_rgba(24,17,13,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#E83262]"
            onClick={onSettingsClick}
          >
            <Settings className="h-5 w-5 text-[#26364A]" strokeWidth={2.2} />
          </button>
        </div>
      )}

      <main className={cn(
        "min-h-[100dvh] w-full pb-16 sm:pb-20",
        !showBottomTabs && "pb-0",
        isDiscoverScreen && "h-full overflow-hidden"
      )}>{children}</main>

      {showBottomTabs && <BottomTabs activeTab={activeTab} onTabChange={onTabChange} mode={mode} />}
    </div>
  )
}
