"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowLeft, Bell, ChevronRight, EyeOff, LockKeyhole, LogOut, ShieldCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/hooks/use-toast"

type SettingsPanel = "home" | "privacy" | "change_password" | "hide_profile" | "notifications" | "delete_account"
type SettingsNavigateHandler = (id: string) => void

interface AppSettingsProps {
  onNavigate?: SettingsNavigateHandler
  onLogout?: () => void
  onBack?: () => void
  mode?: "matrimony"
}

type PrivacySettings = {
  showOnlineStatus: boolean
  showContactAfterMatch: boolean
  showProfileToFreeUsers: boolean
}

type NotificationSettings = {
  emailAlerts: boolean
  matchAlerts: boolean
  messageAlerts: boolean
  premiumReminders: boolean
}

const defaultPrivacy: PrivacySettings = {
  showOnlineStatus: true,
  showContactAfterMatch: true,
  showProfileToFreeUsers: true,
}

const defaultNotifications: NotificationSettings = {
  emailAlerts: true,
  matchAlerts: true,
  messageAlerts: true,
  premiumReminders: true,
}

const accountRows: Array<{ id: SettingsPanel; label: string; icon: React.ElementType }> = [
  { id: "privacy", label: "Privacy Settings", icon: ShieldCheck },
  { id: "change_password", label: "Change Password", icon: LockKeyhole },
  { id: "hide_profile", label: "Hide Profile", icon: EyeOff },
  { id: "notifications", label: "Notifications & Alert Manager", icon: Bell },
  { id: "delete_account", label: "Delete Account", icon: Trash2 },
]

function SettingToggle({
  title,
  body,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string
  body: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#EEF1F6] px-5 py-5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-base font-black text-[#26364A]">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#6F7C8B]">{body}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function AppSettings({ onNavigate, onLogout, onBack }: AppSettingsProps) {
  const [panel, setPanel] = useState<SettingsPanel>("home")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileHidden, setProfileHidden] = useState(false)
  const [privacy, setPrivacy] = useState<PrivacySettings>(defaultPrivacy)
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const headerCopy = useMemo(() => {
    if (panel === "privacy") return ["Privacy Settings", "Control how much your profile reveals before a trusted match."]
    if (panel === "change_password") return ["Change Password", "Update your Lovesathi login password securely."]
    if (panel === "hide_profile") return ["Hide Profile", "Pause discovery without deleting your account or profile."]
    if (panel === "notifications") return ["Notifications & Alert Manager", "Choose which important Lovesathi alerts you want."]
    if (panel === "delete_account") return ["Delete Account", "Permanently remove your account, profile, photos, and access."]
    return ["Account & Settings", "Update these details to get suitable matches"]
  }, [panel])

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const [{ data: settings }, { data: profile }] = await Promise.all([
        supabase.from("user_app_settings").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("matrimony_profile_full").select("profile_hidden").eq("user_id", user.id).maybeSingle(),
      ])

      if (cancelled) return

      const privacySettings = (settings?.privacy_settings || {}) as Partial<PrivacySettings>
      const notificationSettings = (settings?.notification_settings || {}) as Partial<NotificationSettings>
      setPrivacy({ ...defaultPrivacy, ...privacySettings })
      setNotifications({ ...defaultNotifications, ...notificationSettings })
      setProfileHidden(Boolean(settings?.profile_hidden ?? profile?.profile_hidden))
      setLoading(false)
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  async function persistSettings(patch: {
    privacy_settings?: PrivacySettings
    notification_settings?: NotificationSettings
    profile_hidden?: boolean
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("Please sign in again to update settings.")

    const payload = {
      user_id: user.id,
      privacy_settings: patch.privacy_settings || privacy,
      notification_settings: patch.notification_settings || notifications,
      profile_hidden: patch.profile_hidden ?? profileHidden,
    }

    const { error } = await supabase.from("user_app_settings").upsert(payload, { onConflict: "user_id" })
    if (error) throw error

    if (typeof patch.profile_hidden === "boolean") {
      const { error: profileError } = await supabase
        .from("matrimony_profile_full")
        .update({ profile_hidden: patch.profile_hidden })
        .eq("user_id", user.id)

      if (profileError) throw profileError
    }
  }

  async function updatePrivacy(next: PrivacySettings) {
    const previous = privacy
    setPrivacy(next)
    setSaving(true)
    try {
      await persistSettings({ privacy_settings: next })
      toast({ title: "Privacy updated", description: "Your profile visibility settings are saved." })
    } catch (error: any) {
      setPrivacy(previous)
      toast({ title: "Could not save privacy", description: error.message || "Please try again.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function updateNotifications(next: NotificationSettings) {
    const previous = notifications
    setNotifications(next)
    setSaving(true)
    try {
      await persistSettings({ notification_settings: next })
      toast({ title: "Notifications updated", description: "Your alert preferences are saved." })
    } catch (error: any) {
      setNotifications(previous)
      toast({ title: "Could not save notifications", description: error.message || "Please try again.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function updateProfileHidden(nextHidden: boolean) {
    const previous = profileHidden
    setProfileHidden(nextHidden)
    setSaving(true)
    try {
      await persistSettings({ profile_hidden: nextHidden })
      toast({
        title: nextHidden ? "Profile hidden" : "Profile visible",
        description: nextHidden
          ? "Your profile is paused from discovery until you unhide it."
          : "Your profile can appear in discovery again.",
      })
    } catch (error: any) {
      setProfileHidden(previous)
      toast({ title: "Could not update profile", description: error.message || "Please try again.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordSave() {
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Please re-enter the same password.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword("")
      setConfirmPassword("")
      toast({ title: "Password changed", description: "Your new password is active for future logins." })
      setPanel("home")
    } catch (error: any) {
      toast({ title: "Could not change password", description: error.message || "Please try again.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      toast({ title: "Confirmation required", description: "Type DELETE to permanently delete your account.", variant: "destructive" })
      return
    }

    setDeleting(true)
    try {
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
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Account deletion failed.")
      }

      await supabase.auth.signOut()
      toast({ title: "Account deleted", description: "Your Lovesathi account has been permanently removed." })
      window.location.assign("/auth")
    } catch (error: any) {
      toast({ title: "Could not delete account", description: error.message || "Please try again.", variant: "destructive" })
      setDeleting(false)
    }
  }

  const goBack = () => {
    if (panel !== "home") {
      setPanel("home")
      return
    }
    onBack?.()
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white text-[#26364A]">
      <header className="shrink-0 border-b border-[#E6EAF1] bg-white px-4 pt-[calc(0.85rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 pb-5">
          <button
            type="button"
            onClick={goBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E1E6EE] bg-white text-[#26364A] shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-2xl font-black tracking-[-0.03em] text-[#26364A]">{headerCopy[0]}</h1>
            <p className="mt-1 text-sm font-semibold text-[#6F7C8B]">{headerCopy[1]}</p>
          </div>
          <div className="h-11 w-11 shrink-0" />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-[1.25rem] border border-[#E6EAF1] bg-white shadow-[0_12px_34px_rgba(31,44,60,0.06)]">
          {loading ? (
            <div className="p-8 text-center text-sm font-bold text-[#6F7C8B]">Loading settings...</div>
          ) : panel === "home" ? (
            <>
              {accountRows.map((row) => {
                const Icon = row.icon
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      setPanel(row.id)
                      onNavigate?.(row.id)
                    }}
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
            </>
          ) : panel === "privacy" ? (
            <>
              <SettingToggle
                title="Show online status"
                body="Let suitable matches know when you were recently active."
                checked={privacy.showOnlineStatus}
                disabled={saving}
                onCheckedChange={(checked) => updatePrivacy({ ...privacy, showOnlineStatus: checked })}
              />
              <SettingToggle
                title="Allow contact after match"
                body="Keep contact details masked until there is a match or a paid contact reveal."
                checked={privacy.showContactAfterMatch}
                disabled={saving}
                onCheckedChange={(checked) => updatePrivacy({ ...privacy, showContactAfterMatch: checked })}
              />
              <SettingToggle
                title="Show profile to free users"
                body="If disabled, free members will see a premium prompt before full details."
                checked={privacy.showProfileToFreeUsers}
                disabled={saving}
                onCheckedChange={(checked) => updatePrivacy({ ...privacy, showProfileToFreeUsers: checked })}
              />
            </>
          ) : panel === "change_password" ? (
            <div className="space-y-5 p-5">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
              <Button className="h-12 w-full rounded-xl bg-[#E83262] font-black text-white hover:bg-[#C3264E]" disabled={saving} onClick={handlePasswordSave}>
                {saving ? "Saving..." : "Update Password"}
              </Button>
            </div>
          ) : panel === "hide_profile" ? (
            <div className="p-5">
              <div className="rounded-[1.2rem] border border-[#E6EAF1] bg-[#F8FAFC] p-5">
                <p className="text-lg font-black text-[#26364A]">{profileHidden ? "Your profile is hidden" : "Your profile is visible"}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#6F7C8B]">
                  Hiding pauses your profile from discovery. Your account, chats, matches, and saved details stay safe.
                </p>
                <Button
                  className="mt-5 h-12 w-full rounded-xl bg-[#E83262] font-black text-white hover:bg-[#C3264E]"
                  disabled={saving}
                  onClick={() => updateProfileHidden(!profileHidden)}
                >
                  {profileHidden ? "Unhide Profile" : "Hide Profile"}
                </Button>
              </div>
            </div>
          ) : panel === "delete_account" ? (
            <div className="space-y-5 p-5">
              <div className="rounded-[1.2rem] border border-red-200 bg-red-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <p className="text-lg font-black text-red-900">Permanent account deletion</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-red-800/80">
                      This removes your login, profile, discovery visibility, and uploaded files where technically possible.
                      This cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirm}
                  onChange={(event) => setDeleteConfirm(event.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                className="h-12 w-full rounded-xl font-black"
                disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
                onClick={handleDeleteAccount}
              >
                {deleting ? "Deleting Account..." : "Delete Account Permanently"}
              </Button>
              <p className="text-center text-xs font-semibold leading-5 text-[#6F7C8B]">
                If you only want a break, use Hide Profile instead so matches and chats stay safe.
              </p>
            </div>
          ) : (
            <>
              <SettingToggle
                title="Email alerts"
                body="Receive account, verification, and safety emails."
                checked={notifications.emailAlerts}
                disabled={saving}
                onCheckedChange={(checked) => updateNotifications({ ...notifications, emailAlerts: checked })}
              />
              <SettingToggle
                title="Match alerts"
                body="Notify me when someone accepts interest or a new match is created."
                checked={notifications.matchAlerts}
                disabled={saving}
                onCheckedChange={(checked) => updateNotifications({ ...notifications, matchAlerts: checked })}
              />
              <SettingToggle
                title="Message alerts"
                body="Notify me when a match sends a new message."
                checked={notifications.messageAlerts}
                disabled={saving}
                onCheckedChange={(checked) => updateNotifications({ ...notifications, messageAlerts: checked })}
              />
              <SettingToggle
                title="Premium reminders"
                body="Receive renewal, discount, and contact-reveal reminders."
                checked={notifications.premiumReminders}
                disabled={saving}
                onCheckedChange={(checked) => updateNotifications({ ...notifications, premiumReminders: checked })}
              />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
