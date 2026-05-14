"use client"

import { ArrowLeft, Bell, ChevronRight, EyeOff, LockKeyhole, LogOut, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

type SettingsNavigateHandler = (id: string) => void

interface AppSettingsProps {
  onNavigate?: SettingsNavigateHandler
  onLogout?: () => void
  onBack?: () => void
  mode?: "matrimony"
}

const accountRows = [
  { id: "privacy", label: "Privacy Settings", icon: ShieldCheck },
  { id: "change_password", label: "Change Password", icon: LockKeyhole },
  { id: "hide_profile", label: "Hide Profile", icon: EyeOff },
  { id: "notifications", label: "Notifications & Alert Manager", icon: Bell },
]

export function AppSettings({ onNavigate, onLogout, onBack }: AppSettingsProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-white text-[#26364A]">
      <header className="shrink-0 border-b border-[#E6EAF1] bg-white px-4 pt-[calc(0.85rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 pb-5">
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
          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-2xl font-black tracking-[-0.03em] text-[#26364A]">Account & Settings</h1>
            <p className="mt-1 text-sm font-semibold text-[#6F7C8B]">Update these details to get suitable matches</p>
          </div>
          <div className="h-11 w-11 shrink-0" />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-[1.25rem] border border-[#E6EAF1] bg-white shadow-[0_12px_34px_rgba(31,44,60,0.06)]">
          {accountRows.map((row) => {
            const Icon = row.icon
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onNavigate?.(row.id)}
                className="flex w-full items-center gap-4 border-b border-[#EEF1F6] px-5 py-5 text-left transition hover:bg-[#F8FAFC]"
              >
                <Icon className="h-5 w-5 shrink-0 text-[#8B96A5]" />
                <span className="min-w-0 flex-1 text-base font-black text-[#5A6878]">{row.label}</span>
                <ChevronRight className="h-5 w-5 shrink-0 text-[#8B96A5]" />
              </button>
            )
          })}
          <Button
            type="button"
            variant="ghost"
            onClick={onLogout}
            className="flex h-16 w-full justify-start gap-4 rounded-none px-5 text-base font-black text-[#5A6878] hover:bg-[#F8FAFC]"
          >
            <LogOut className="h-5 w-5 text-[#8B96A5]" />
            Logout
          </Button>
        </div>
      </main>
    </div>
  )
}
