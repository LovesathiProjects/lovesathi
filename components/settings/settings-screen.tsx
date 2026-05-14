"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Edit3,
  HeartHandshake,
  HelpCircle,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabaseClient"
import { formatPublicProfileName } from "@/lib/displayName"
import { getPublicProfileId } from "@/lib/profileIdentity"
import { getProfileFallbackImage } from "@/lib/profileImages"

type SettingsNavigateHandler = (id: string) => void

interface DrawerItem {
  id: string
  label: string
  icon: React.ElementType
}

const drawerItems: DrawerItem[] = [
  { id: "profile", label: "Edit Profile", icon: Edit3 },
  { id: "partner_preferences", label: "Partner Preferences", icon: HeartHandshake },
  { id: "astrology", label: "Astrology Services", icon: Sparkles },
  { id: "phonebook", label: "Phonebook", icon: BookOpen },
  { id: "app_settings", label: "Account & Settings", icon: Settings },
  { id: "help_safety", label: "Safety Centre", icon: ShieldCheck },
  { id: "help_support", label: "Help & Support", icon: HelpCircle },
  { id: "success_stories", label: "Success Stories", icon: Trophy },
]

interface UserInfo {
  name: string
  email: string
  photo: string | null
  publicId: string
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "L"
  )
}

export function SettingsScreen({
  onNavigate,
  onLogout,
  onBack,
}: {
  onNavigate?: SettingsNavigateHandler
  onLogout?: () => void
  mode?: "matrimony"
  onBack?: () => void
}) {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "Lovesathi Member",
    email: "",
    photo: null,
    publicId: "LS000000",
  })

  useEffect(() => {
    let cancelled = false

    async function fetchUserInfo() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || cancelled) return

      let name = String(user.user_metadata?.name || user.email?.split("@")[0] || "Lovesathi Member")
      let photo: string | null = null

      const { data: profile } = await supabase
        .from("matrimony_profile_full")
        .select("user_id, public_profile_id, name, photos")
        .eq("user_id", user.id)
        .maybeSingle()

      if (profile?.name) name = profile.name
      const photos = Array.isArray(profile?.photos) ? (profile?.photos as string[]) : []
      photo = photos[0] || null

      if (!cancelled) {
        setUserInfo({
          name,
          email: user.email || "",
          photo: photo || getProfileFallbackImage(name, user.id),
          publicId: getPublicProfileId(profile || { user_id: user.id }),
        })
      }
    }

    void fetchUserInfo()

    return () => {
      cancelled = true
    }
  }, [])

  const displayName = useMemo(() => formatPublicProfileName(userInfo.name), [userInfo.name])

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white text-[#26364A]">
      <header className="shrink-0 border-b border-[#E6EAF1] bg-white px-4 pt-[calc(0.85rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 pb-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E1E6EE] bg-white text-[#26364A] shadow-sm"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#E83262]">My Lovesathi</p>
            <h1 className="truncate text-2xl font-black tracking-[-0.03em] text-[#26364A]">Profile Centre</h1>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-md">
          <section className="rounded-[1.35rem] border border-[#E6EAF1] bg-white p-4 shadow-[0_12px_34px_rgba(31,44,60,0.07)]">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border border-[#E6EAF1] bg-[#F2F5FA]">
                <AvatarImage src={userInfo.photo || getProfileFallbackImage(userInfo.name, userInfo.publicId)} alt={displayName} />
                <AvatarFallback className="bg-[#E8EDF4] text-xl font-black text-[#AAB4C1]">
                  {getInitials(userInfo.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-black text-[#26364A]">{displayName}</h2>
                <p className="mt-0.5 text-sm font-bold text-[#6F7C8B]">ID - {userInfo.publicId}</p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => onNavigate?.("premium")}
              className="mt-5 h-12 w-full rounded-xl bg-[#E83262] text-base font-black text-white shadow-[0_14px_30px_rgba(232,50,98,0.2)] hover:bg-[#C3264E]"
            >
              Upgrade Membership
            </Button>
            <p className="mt-2 text-center text-xs font-semibold text-[#6F7C8B]">Flat 70% OFF launch offer</p>
          </section>

          <nav className="mt-5 overflow-hidden rounded-[1.35rem] border border-[#E6EAF1] bg-white shadow-[0_12px_34px_rgba(31,44,60,0.05)]">
            {drawerItems.map((item, index) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate?.(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-1 py-0 text-left transition hover:bg-[#F8FAFC]",
                    index !== drawerItems.length - 1 && "border-b border-[#EEF1F6]",
                  )}
                >
                  <span className="flex h-[3.55rem] w-12 shrink-0 items-center justify-center text-[#8B96A5]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1 text-[0.95rem] font-bold text-[#26364A]">{item.label}</span>
                  <ChevronRight className="mr-3 h-5 w-5 shrink-0 text-[#9AA5B2]" />
                </button>
              )
            })}
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 border-t border-[#EEF1F6] px-1 py-0 text-left text-[#26364A] transition hover:bg-[#F8FAFC]"
            >
              <span className="flex h-[3.55rem] w-12 shrink-0 items-center justify-center text-[#8B96A5]">
                <LogOut className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 text-[0.95rem] font-bold">Logout</span>
            </button>
          </nav>

          <button
            type="button"
            onClick={() => onNavigate?.("help_support")}
            className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-5 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#E83262] shadow-[0_14px_36px_rgba(31,44,60,0.16)]"
            aria-label="Support"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>
      </main>
    </div>
  )
}
