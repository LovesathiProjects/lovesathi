"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  User,
  Bell,
  Shield,
  Crown,
  HelpCircle,
  LogOut,
  ChevronRight,
  Settings,
  MessageCircle,
  Info,
  Mail,
  Bug,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from "lucide-react"
import { StaticBackground } from "@/components/discovery/static-background"
import { supabase } from "@/lib/supabaseClient"
import { getIDVerification } from "@/lib/verificationApi"

interface SettingsSection {
  title: string
  items: SettingsItem[]
}

interface SettingsItem {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  type: "toggle" | "navigation" | "action"
  value?: boolean
  badge?: string
  destructive?: boolean
}

type SettingsNavigateHandler = (id: string) => void

const settingsSections: SettingsSection[] = [
  {
    title: "Profile & Membership",
    items: [
      {
        id: "profile",
        label: "Edit Profile",
        description: "Update your photos and information",
        icon: User,
        type: "navigation",
      },
      {
        id: "premium",
        label: "Premium Features",
        description: "Upgrade to unlock all features",
        icon: Crown,
        type: "navigation",
        badge: "Upgrade",
      },
      {
        id: "verification",
        label: "Profile Verification",
        description: "Verify your profile with photo ID",
        icon: Shield,
        type: "navigation",
      },
    ],
  },
  {
    title: "Trust & Support",
    items: [
      {
        id: "app_settings",
        label: "Privacy & App Settings",
        description: "Control visibility, notifications, and preferences",
        icon: Settings,
        type: "navigation",
      },
      {
        id: "help_faq",
        label: "FAQ",
        description: "Answers about profiles, privacy, premium, and verification",
        icon: HelpCircle,
        type: "navigation",
      },
      {
        id: "help_safety",
        label: "Safety Centre",
        description: "Read verification, reporting, and safe matrimony guidance",
        icon: Info,
        type: "navigation",
      },
      {
        id: "help_contact",
        label: "Contact Support",
        description: "Get help with verification, profiles, or reports",
        icon: Mail,
        type: "navigation",
      },
      {
        id: "help_report_bug",
        label: "Report a Bug",
        description: "Tell us if something feels broken",
        icon: Bug,
        type: "navigation",
      },
    ],
  },
  {
    title: "Account Control",
    items: [
      {
        id: "logout",
        label: "Log Out",
        description: "Sign out of Lovesathi on this device",
        icon: LogOut,
        type: "action",
      },
    ],
  },
]

interface UserInfo {
  name: string
  email: string
  photo: string | null
  accountType: string
}

export function SettingsScreen({ onNavigate, onLogout, onBack }: { onNavigate?: SettingsNavigateHandler; onLogout?: () => void; mode?: 'matrimony'; onBack?: () => void }) {
  const isMatrimony = true
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "Loading...",
    email: "Loading...",
    photo: null,
    accountType: "Standard Membership",
  })
  const [loading, setLoading] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected' | 'in_review' | null>(null)

  useEffect(() => {
    fetchUserInfo()
    checkVerificationStatus()
  }, [])

  const checkVerificationStatus = async () => {
    try {
      const result = await getIDVerification()
      if (result.success && result.data) {
        setVerificationStatus(result.data.verification_status as 'pending' | 'approved' | 'rejected' | 'in_review')
      } else {
        setVerificationStatus(null)
      }
    } catch (error) {
      console.error('Error checking verification status:', error)
      setVerificationStatus(null)
    }
  }

  const fetchUserInfo = async () => {
    try {
      setLoading(true)

      // Get auth user for email
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        console.error("Error fetching auth user:", authError)
        setUserInfo({
          name: "User",
          email: "Not available",
          photo: null,
          accountType: "Standard Membership",
        })
        setLoading(false)
        return
      }

      const email = user.email || "Not available"

      let name = "User"
      let photo: string | null = null

      const { data: matrimonyProfile, error: matrimonyError } = await supabase
        .from('matrimony_profile_full')
        .select('name, photos')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!matrimonyError && matrimonyProfile) {
        name = matrimonyProfile.name || name
        const photos = (matrimonyProfile.photos as string[]) || []
        photo = photos.length > 0 ? photos[0] : null
      }

      // Get initials for fallback
      const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || "U"

      setUserInfo({
        name,
        email,
        photo,
        accountType: "Standard Membership",
      })
    } catch (error) {
      console.error("Error fetching user info:", error)
      setUserInfo({
        name: "User",
        email: "Not available",
        photo: null,
        accountType: "Standard Membership",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNavigation = (id: string) => {
    if (onNavigate) onNavigate(id)
  }

  const handleAction = (id: string) => {
    if (id === "logout") {
      onLogout?.()
    }
  }

  // Get initials for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || "U"
  }

  return (
    <div className={cn("relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden", isMatrimony ? "luxe-light-page" : "bg-[#0E0F12]")}>
      {/* Static Background */}
      <StaticBackground />

      {/* Header */}
      <div className={cn(
        "sticky top-0 z-20 flex-shrink-0 border-b px-4 pb-4 pt-[calc(0.85rem+env(safe-area-inset-top))] backdrop-blur-xl sm:px-6 sm:pb-5",
        isMatrimony ? "border-[#482b1a]/10 bg-[#ffffff]/84 shadow-[0_18px_55px_rgba(24,17,13,0.08)]" : "border-white/20 bg-[#14161B]/50"
      )}>
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 sm:gap-4">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-11 w-11 shrink-0 rounded-full border p-0",
                isMatrimony ? "border-[#C2A574]/24 bg-white/76 text-[#3A2B24] hover:bg-white" : "border-white/20 bg-white/10 text-white hover:bg-white/10"
              )}
              onClick={onBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className={cn("h-14 w-14 shrink-0 border-2 shadow-lg sm:h-16 sm:w-16", isMatrimony ? "border-[#C2A574]/50" : "border-white/30")}>
            <AvatarImage src={userInfo.photo || "/placeholder-user.jpg"} alt="Profile" />
            <AvatarFallback className={cn("font-semibold", isMatrimony ? "bg-gray-100 text-black" : "bg-white/20 text-white")}>
              {getInitials(userInfo.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className={cn("truncate font-serif text-2xl font-bold tracking-[-0.05em] sm:text-3xl", isMatrimony ? "text-[#3A2B24]" : "text-white")}>{userInfo.name}</h1>
            <p className={cn("truncate text-sm font-medium", isMatrimony ? "text-[#8B7B70]" : "text-white/75")}>{userInfo.email}</p>
            <Badge variant="secondary" className={cn(
              "max-w-full truncate text-xs font-semibold",
              isMatrimony
                ? "border-[#C2A574]/35 bg-[#ffffff] text-[#C2A574]"
                : "bg-white/20 text-white border-white/30"
            )}>
              {userInfo.accountType}
            </Badge>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:py-8">
        <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-2 xl:gap-5">
          {settingsSections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h2 className={cn("px-1 luxe-kicker", isMatrimony ? "text-[#C2A574]" : "text-white/75")}>
                {section.title}
              </h2>

              <Card className={cn(
                "overflow-hidden rounded-[1.75rem] backdrop-blur-sm",
                isMatrimony
                  ? "luxe-card border-[#C2A574]/24"
                  : "bg-[#14161B] border-white/20"
              )}>
                <CardContent className="p-0">
                  {section.items.map((item, index) => (
                    <div key={item.id}>
                      <div
                        className={cn(
                          "flex items-center justify-between gap-3 p-4 transition-colors sm:p-5",
                          item.type !== "toggle" && (isMatrimony ? "cursor-pointer hover:bg-white/54" : "cursor-pointer hover:bg-white/10")
                        )}
                        onClick={() => {
                          if (item.type === "navigation") handleNavigation(item.id)
                          if (item.type === "action") handleAction(item.id)
                        }}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border",
                              item.destructive
                                ? "border-[#b91c1c]/16 bg-[#b91c1c]/8"
                                : isMatrimony
                                  ? "border-[#C2A574]/24 bg-[#F7F3EE]"
                                  : "bg-white/10"
                            )}
                          >
                            <item.icon
                              className={cn(
                                "w-5 h-5",
                                item.destructive
                                  ? "text-[#C2A574]"
                                  : isMatrimony
                                    ? "text-black"
                                    : "text-white"
                              )}
                            />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn(
                                "font-semibold",
                                item.destructive
                                  ? "text-[#b91c1c]"
                                  : isMatrimony
                                    ? "text-black"
                                    : "text-white"
                              )}>
                                {item.label}
                              </span>
                              {item.badge && (
                                <Badge variant="secondary" className="text-xs font-semibold bg-[#C2A574] text-[#3A2B24] border-0">
                                  {item.badge}
                                </Badge>
                              )}
                              {/* Verification Status Indicator */}
                              {item.id === "verification" && verificationStatus && (
                                <>
                                  {verificationStatus === 'approved' ? (
                                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-[#C2A574] flex items-center justify-center">
                                      <AlertCircle className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            {item.description && (
                              <p className={cn("text-sm", isMatrimony ? "text-[#444444]" : "text-white/70")}>
                                {item.description}
                                {item.id === "verification" && verificationStatus === 'approved' && (
                                  <span className={cn("ml-2 text-xs font-semibold", isMatrimony ? "text-green-600" : "text-green-400")}>Verification completed</span>
                                )}
                                {item.id === "verification" && verificationStatus && verificationStatus !== 'approved' && (
                                  <span className="ml-2 text-[#C2A574] text-xs font-semibold">Pending verification</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center">
                          {item.type === "navigation" && <ChevronRight className="w-5 h-5" style={{ color: isMatrimony ? '#C2A574' : 'rgba(255, 255, 255, 0.7)' }} />}
                        </div>
                      </div>

                      {index < section.items.length - 1 && <Separator className="ml-16 mr-4 bg-white/10" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
