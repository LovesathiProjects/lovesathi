"use client"

import type React from "react"
import { useState } from "react"
import {
  ArrowLeft,
  Bell,
  Bug,
  ChevronRight,
  Eye,
  HelpCircle,
  LogOut,
  Mail,
  MessageCircle,
  Power,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/hooks/use-toast"
import { handleLogout } from "@/lib/logout"
import { cn } from "@/lib/utils"

type SettingsNavigateHandler = (id: string) => void

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

interface SettingsSection {
  title: string
  description: string
  items: SettingsItem[]
}

const settingsSections: SettingsSection[] = [
  {
    title: "Communication",
    description: "Choose what deserves your attention.",
    items: [
      {
        id: "push_notifications",
        label: "Push notifications",
        description: "Important matches, profile views, and safety updates.",
        icon: Bell,
        type: "toggle",
        value: true,
      },
      {
        id: "message_notifications",
        label: "Message notifications",
        description: "Notify me when a match replies.",
        icon: MessageCircle,
        type: "toggle",
        value: true,
      },
    ],
  },
  {
    title: "Privacy",
    description: "Control what others can discover about you.",
    items: [
      {
        id: "profile_visibility",
        label: "Profile visibility",
        description: "Keep your profile visible in curated discovery.",
        icon: Eye,
        type: "toggle",
        value: true,
      },
      {
        id: "hide_age",
        label: "Hide my age",
        description: "Show less personal detail until you are comfortable.",
        icon: ShieldCheck,
        type: "toggle",
        value: false,
      },
    ],
  },
  {
    title: "Help",
    description: "Answers, safety guidance, and support.",
    items: [
      {
        id: "help_faq",
        label: "FAQ",
        description: "Common questions about profiles, matches, verification, and premium.",
        icon: HelpCircle,
        type: "navigation",
      },
      {
        id: "help_safety",
        label: "Safety centre",
        description: "How to verify, report, and move carefully.",
        icon: ShieldCheck,
        type: "navigation",
      },
      {
        id: "help_contact",
        label: "Contact support",
        description: "Get help with account, profile, or billing questions.",
        icon: Mail,
        type: "navigation",
      },
      {
        id: "help_report_bug",
        label: "Report a bug",
        description: "Tell us what broke so we can fix it quickly.",
        icon: Bug,
        type: "navigation",
      },
    ],
  },
  {
    title: "Account",
    description: "Session and account controls.",
    items: [
      {
        id: "logout",
        label: "Log out",
        description: "Sign out from this device.",
        icon: LogOut,
        type: "action",
      },
      {
        id: "delete_account",
        label: "Delete account",
        description: "Permanently delete your account and Lovesathi profile.",
        icon: Trash2,
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
  mode?: "matrimony"
}

export function AppSettings({ onNavigate, onLogout, onBack, mode = "matrimony" }: AppSettingsProps) {
  const [settings, setSettings] = useState<Record<string, boolean>>({
    push_notifications: true,
    message_notifications: true,
    profile_visibility: true,
    hide_age: false,
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
    onNavigate?.(id)
  }

  const handleAction = (id: string) => {
    if (id === "logout") {
      onLogout?.()
      return
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
        throw new Error("Please sign in again before deleting your account.")
      }

      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete account. Please try again.")
      }

      toast({
        title: "Account deleted",
        description: "Your account and profile data have been permanently deleted.",
      })

      setTimeout(() => {
        handleLogout()
      }, 1200)
    } catch (error: any) {
      toast({
        title: "Could not delete account",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="luxe-light-page flex min-h-[100dvh] flex-col overflow-x-hidden">
      <div className="sticky top-0 z-30 border-b border-[#482b1a]/10 bg-[#F7F3EE]/86 px-4 pb-4 pt-[calc(0.85rem+env(safe-area-inset-top))] shadow-[0_18px_55px_rgba(24,17,13,0.08)] backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              className="h-11 w-11 rounded-full border border-[#C2A574]/24 bg-white/76 p-0 text-[#3A2B24] shadow-sm"
              onClick={onBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <p className="luxe-kicker text-[0.6rem] text-[#C2A574] sm:text-[0.68rem]">app controls</p>
            <h1 className="truncate font-serif text-3xl font-bold tracking-[-0.06em] text-[#3A2B24] sm:text-4xl">Settings</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#8B7B70]">
              Privacy, notifications, support, and account controls in one calm place.
            </p>
          </div>
          <Badge className="hidden border border-[#C2A574]/24 bg-white/70 px-3 py-1.5 text-[#3A2B24] sm:inline-flex">
            Lovesathi
          </Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:py-8">
        <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-2 xl:gap-5">
          {settingsSections.map((section) => (
            <section key={section.title} className="min-w-0">
              <div className="mb-3 px-1">
                <p className="luxe-kicker text-[0.62rem] text-[#C2A574]">{section.title}</p>
                <p className="mt-1 text-sm leading-6 text-[#8B7B70]">{section.description}</p>
              </div>

              <Card className="luxe-card overflow-hidden rounded-[1.75rem] border-[#C2A574]/24">
                <CardContent className="p-0">
                  {section.items.map((item, index) => {
                    const Icon = item.icon

                    return (
                      <div key={item.id}>
                        <button
                          type="button"
                          className={cn(
                            "flex w-full items-center justify-between gap-3 p-4 text-left transition sm:p-5",
                            item.type !== "toggle" && "hover:bg-white/54",
                          )}
                          onClick={() => {
                            if (item.type === "navigation") handleNavigation(item.id)
                            if (item.type === "action") handleAction(item.id)
                          }}
                        >
                          <span className="flex min-w-0 items-start gap-3">
                            <span
                              className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border",
                                item.destructive
                                  ? "border-[#b91c1c]/16 bg-[#b91c1c]/8 text-[#b91c1c]"
                                  : "border-[#C2A574]/24 bg-[#F7F3EE] text-[#C2A574]",
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  "flex flex-wrap items-center gap-2 font-bold",
                                  item.destructive ? "text-[#b91c1c]" : "text-[#3A2B24]",
                                )}
                              >
                                {item.label}
                                {item.badge && <Badge className="bg-[#C2A574] text-[#3A2B24]">{item.badge}</Badge>}
                              </span>
                              {item.description && <span className="mt-1 block text-sm leading-5 text-[#8B7B70]">{item.description}</span>}
                            </span>
                          </span>

                          <span className="flex shrink-0 items-center">
                            {item.type === "toggle" && (
                              <Switch
                                checked={settings[item.id] || false}
                                onCheckedChange={() => handleToggle(item.id)}
                                mode={mode}
                              />
                            )}
                            {item.type === "navigation" && <ChevronRight className="h-5 w-5 text-[#C2A574]" />}
                            {item.type === "action" && item.id === "logout" && <Power className="h-5 w-5 text-[#C2A574]" />}
                          </span>
                        </button>

                        {index < section.items.length - 1 && <Separator className="mx-5 bg-[#482b1a]/10" />}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="hidden" id="delete-account-trigger" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. It will permanently delete your account, profile, verification records, photos, matches, messages, and saved profiles where database cascades apply.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteAccount()
              }}
              disabled={isDeleting}
              className="bg-[#b91c1c] text-white hover:bg-[#991b1b]"
            >
              {isDeleting ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
