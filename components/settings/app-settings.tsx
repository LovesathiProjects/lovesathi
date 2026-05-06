"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  Shield,
  Crown,
  HelpCircle,
  LogOut,
  ChevronRight,
  Settings,
  Power,
  MessageCircle,
  Info,
  Mail,
  Bug,
  ArrowLeft,
} from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/hooks/use-toast"
import { StaticBackground } from "@/components/discovery/static-background"
import { handleLogout } from "@/lib/logout"
import { cn } from "@/lib/utils"

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
    title: "Notifications",
    items: [
      {
        id: "push_notifications",
        label: "Push Notifications",
        description: "Get notified about matches and messages",
        icon: Bell,
        type: "toggle",
        value: true,
      },
      {
        id: "message_notifications",
        label: "Message Notifications",
        description: "Notifications for new messages",
        icon: MessageCircle,
        type: "toggle",
        value: true,
      },
    ],
  },
  {
    title: "App Settings",
    items: [
      {
        id: "profile_visibility",
        label: "Profile Visibility",
        description: "Show or hide your profile",
        icon: Power,
        type: "toggle",
        value: true,
      },
      {
        id: "hide_age",
        label: "Hide My Age",
        description: "Don't show your age on profile",
        icon: Info,
        type: "toggle",
        value: false,
      },
      {
        id: "hide_distance",
        label: "Hide My Distance",
        description: "Don't show distance on profile",
        icon: Info,
        type: "toggle",
        value: false,
      },
    ],
  },
  {
    title: "Help & Support",
    items: [
      {
        id: "help_faq",
        label: "FAQ",
        description: "Common questions about the app",
        icon: HelpCircle,
        type: "navigation",
      },
      {
        id: "help_contact",
        label: "Contact Us",
        description: "Reach out to our team",
        icon: Mail,
        type: "navigation",
      },
      {
        id: "help_report_bug",
        label: "Report a Bug",
        description: "Found an issue? Tell us",
        icon: Bug,
        type: "navigation",
      },
      {
        id: "app_settings",
        label: "App Settings",
        description: "Privacy, safety, and more",
        icon: Settings,
        type: "navigation",
      },
    ],
  },
  {
    title: "Account Actions",
    items: [
      {
        id: "delete_account",
        label: "Delete Account",
        description: "Permanently delete your account",
        icon: Settings,
        type: "action",
        destructive: true,
      },
      {
        id: "logout",
        label: "Log Out",
        icon: LogOut,
        type: "action",
        destructive: true,
      },
    ],
  },
]

interface AppSettingsProps {
  onNavigate?: SettingsNavigateHandler
  onLogout?: () => void
  onBack?: () => void
  mode?: 'matrimony'
}

export function AppSettings({ onNavigate, onLogout, onBack, mode = 'matrimony' }: AppSettingsProps) {
  const isMatrimony = true
  const [settings, setSettings] = useState<Record<string, boolean>>({
    push_notifications: true,
    message_notifications: true,
    profile_visibility: true,
    hide_age: false,
    hide_distance: false,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const handleToggle = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const handleNavigation = (id: string) => {
    if (onNavigate) onNavigate(id)
  }

  const handleAction = (id: string) => {
    if (id === "logout") {
      onLogout?.()
    }
    if (id === "delete_account") {
      const trigger = document.getElementById("delete-account-trigger") as HTMLButtonElement | null
      trigger?.click()
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast({
          title: "Error",
          description: "Please sign in again before deleting your account.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!data.success) {
        toast({
          title: "Deletion Failed",
          description: data.error || "Failed to delete account. Please try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Account Deleted",
        description: "Your account and all data have been permanently deleted.",
      })
      setTimeout(() => {
        handleLogout()
      }, 1500)

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={cn("relative flex h-full min-h-screen flex-col", isMatrimony ? "luxe-light-page" : "bg-[#0E0F12]")}>
      {!isMatrimony && <StaticBackground />}
      {/* Header */}
      <div className={cn(
        "flex-shrink-0 p-4 border-b shadow-lg",
        isMatrimony 
          ? "border-[#E5E5E5] bg-white" 
          : "border-white/20 bg-[#14161B]/50 backdrop-blur-xl"
      )}>
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "p-2 rounded-full border",
                isMatrimony
                  ? "hover:bg-gray-50 bg-white border-[#E5E5E5]"
                  : "hover:bg-white/10 bg-white/10 backdrop-blur-xl border-white/20"
              )}
              onClick={onBack}
            >
              <ArrowLeft className={cn("w-5 h-5", isMatrimony ? "text-black" : "text-white")} />
            </Button>
          )}
          <div>
            <p className="luxe-kicker text-[0.62rem] text-[#8f001c]">controls</p>
            <h1 className={cn("font-serif text-3xl font-bold tracking-[-0.05em]", isMatrimony ? "text-[#18110d]" : "text-white")}>Settings</h1>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {settingsSections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h2 className={cn("luxe-kicker", isMatrimony ? "text-[#8f001c]" : "text-white")}>{section.title}</h2>

              <Card className={cn(
                "overflow-hidden shadow-sm",
                isMatrimony 
                  ? "luxe-card border-[#d9b978]/24"
                  : "bg-[#14161B]/50 border border-white/20"
              )}>
                <CardContent className="p-0">
                  {section.items.map((item, index) => (
                    <div key={item.id}>
                      <div
                        className={cn(
                          "flex items-center justify-between p-4 transition-colors",
                          item.type !== "toggle" && (isMatrimony ? "cursor-pointer hover:bg-gray-50" : "cursor-pointer hover:bg-white/10")
                        )}
                        onClick={() => {
                          if (item.type === "navigation") handleNavigation(item.id)
                          if (item.type === "action") handleAction(item.id)
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              item.destructive 
                                ? "bg-[#97011A]/10" 
                                : isMatrimony 
                                  ? "bg-gray-100" 
                                  : "bg-white/10"
                            )}
                          >
                            <item.icon
                              className={cn(
                                "w-5 h-5",
                                item.destructive 
                                  ? "text-[#97011A]" 
                                  : isMatrimony 
                                    ? "text-black" 
                                    : "text-white"
                              )}
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span 
                                className={cn(
                                  "font-medium",
                                  item.destructive 
                                    ? "text-[#97011A]" 
                                    : isMatrimony 
                                      ? "text-black" 
                                      : "text-white"
                                )}
                              >
                                {item.label}
                              </span>
                              {item.badge && (
                                <Badge variant="secondary" className={cn(
                                  "text-xs",
                                  isMatrimony 
                                    ? "bg-[#97011A] text-white border-0" 
                                    : ""
                                )}>
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className={cn("text-sm", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center">
                          {item.type === "toggle" && (
                            <Switch
                              checked={settings[item.id] || false}
                              onCheckedChange={() => handleToggle(item.id)}
                              mode={mode}
                            />
                          )}
                          {item.type === "navigation" && (
                            <ChevronRight 
                              className={cn("w-5 h-5", isMatrimony ? "text-[#666666]" : "text-white")} 
                            />
                          )}
                        </div>
                      </div>

                      {index < section.items.length - 1 && (
                        <Separator className={cn("ml-16 mr-4", isMatrimony ? "bg-[#E5E5E5]" : "bg-white/20")} />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Account Confirmation */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="hidden" id="delete-account-trigger" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account, profile, verification records, photos, matches, messages, and saved profiles where database cascades apply.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteAccount()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
