"use client"

import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock3,
  Crown,
  Database,
  FileWarning,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRoundCheck,
  Users,
  UserX,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabaseClient"

type AdminMetric = {
  label: string
  value: number
  status: "ok" | "warning"
  detail?: string
}

type ReadinessItem = {
  label: string
  status: "ok" | "warning"
  detail: string
}

type AdminRiskItem = {
  label: string
  value: number
  severity: "clear" | "watch" | "urgent"
  detail: string
}

type QueueResult<T> = {
  status: "ok" | "warning"
  detail?: string
  items: T[]
}

type AdminProfileItem = {
  id: string
  userId: string
  email: string | null
  name: string
  age: number | null
  gender: string | null
  createdBy: string | null
  city: string | null
  education: string | null
  jobTitle: string | null
  bio: string | null
  photoCount: number
  completionSteps: number
  profileCompleted: boolean
  reviewStatus: string
  reviewNotes: string | null
  reviewedAt: string | null
  isSeededProfile: boolean
  flags: string[]
  createdAt: string | null
  updatedAt: string | null
}

type AdminUserItem = {
  id: string
  email: string | null
  status: string
  provider: string | null
  emailConfirmedAt: string | null
  lastSignInAt: string | null
  suspendedUntil: string | null
  premium: {
    isPremium: boolean
    planId: string | null
    planName: string | null
    status: string | null
    activeUntil: string | null
    source: string | null
  }
  profileName: string | null
  profileCompleted: boolean
  profileReviewStatus: string | null
  createdAt: string | null
  updatedAt: string | null
}

type AdminVerificationItem = {
  id: string
  userId: string
  profileName: string
  documentType: string | null
  status: string
  documentFileName: string | null
  faceScanFileName: string | null
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
}

type AdminReportItem = {
  id: string
  reporterId: string
  reportedUserId: string
  reporterName: string
  reportedName: string
  reason: string
  description: string | null
  status: string
  createdAt: string | null
  reviewedAt: string | null
}

type AdminAuditItem = {
  id: string
  actorEmail: string | null
  action: string
  resource: string
  recordId: string | null
  previousStatus: string | null
  nextStatus: string | null
  notes: string | null
  createdAt: string | null
}

type AuthEmailCount = {
  action: string
  label: string
  description: string
  total: number
  last30Days: number
  lastSeen: string | null
}

type AuthEmailSummaryItem = {
  category: "email" | "magic_link"
  label: string
  description: string
  overall: number
  last30Days: number
  lastSeen: string | null
}

type AuthEmailEvent = {
  id: string
  action: string
  label: string
  email: string | null
  userId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string | null
}

type AuthEmailTelemetry = {
  status: "ok" | "warning"
  detail?: string
  since: string | null
  last30Since: string | null
  until: string | null
  summary: AuthEmailSummaryItem[]
  counts: AuthEmailCount[]
  events: AuthEmailEvent[]
}

type AdminOverview = {
  admin: {
    email: string
  }
  host: string
  generatedAt: string
  metrics: AdminMetric[]
  risk: AdminRiskItem[]
  queues: {
    users: QueueResult<AdminUserItem>
    profiles: QueueResult<AdminProfileItem>
    verifications: QueueResult<AdminVerificationItem>
    reports: QueueResult<AdminReportItem>
    audit: QueueResult<AdminAuditItem>
  }
  authEmailTelemetry: AuthEmailTelemetry
  readiness: ReadinessItem[]
}

const metricIcons = [Users, BadgeCheck, Clock3, ShieldCheck, FileWarning, Crown, MessageCircle, Database, Sparkles]
const riskIcons = [FileWarning, UserRoundCheck, ShieldCheck, Mail, Crown, Activity]

function matchesSearch(parts: Array<string | number | null | undefined>, query: string) {
  if (!query) return true
  return parts.some((part) => String(part || "").toLowerCase().includes(query))
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function statusLabel(value: string) {
  return value
    .split(/[_\.]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function StatusBadge({ status }: { status: string }) {
  const safeStatus = status.toLowerCase()
  const isGood = ["ok", "approved", "resolved", "active", "premium"].includes(safeStatus)
  const isWarning = ["pending", "in_review", "reviewed", "warning", "unconfirmed", "free"].includes(safeStatus)

  return (
    <Badge
      variant="outline"
      className={
        isGood
          ? "border-[#1b6b43]/20 bg-[#1b6b43]/10 text-[#1b6b43]"
          : isWarning
            ? "border-[#b79b62]/25 bg-[#b79b62]/12 text-[#8a641f]"
            : "border-[#8f001c]/20 bg-[#8f001c]/10 text-[#8f001c]"
      }
    >
      {statusLabel(status)}
    </Badge>
  )
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-[#482b1a]/18 bg-white/45 p-5 text-sm font-semibold text-[#685f58]">
      {copy}
    </div>
  )
}

export function AdminPortal() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [adminSearch, setAdminSearch] = useState("")

  const generatedAt = overview?.generatedAt ? formatDate(overview.generatedAt) : null
  const refreshing = loading && Boolean(sessionToken)
  const searchTerm = adminSearch.trim().toLowerCase()
  const authEmailOverall =
    overview?.authEmailTelemetry.summary.find((item) => item.category === "email")?.overall ||
    overview?.authEmailTelemetry.counts.reduce((total, item) => total + item.total, 0) ||
    0
  const authEmailLast30 =
    overview?.authEmailTelemetry.summary.find((item) => item.category === "email")?.last30Days || 0
  const userItems = overview?.queues.users.items || []
  const profileItems = overview?.queues.profiles.items || []
  const profileReviewActionsReady = overview?.queues.profiles.status === "ok"
  const verificationItems = overview?.queues.verifications.items || []
  const reportItems = overview?.queues.reports.items || []
  const auditItems = overview?.queues.audit.items || []
  const filteredUsers = userItems.filter((item) =>
    matchesSearch(
      [
        item.email,
        item.id,
        item.status,
        item.provider,
        item.profileName,
        item.profileReviewStatus,
        item.premium.planName,
        item.premium.status,
      ],
      searchTerm,
    ),
  )
  const filteredProfiles = profileItems.filter((profile) =>
    matchesSearch(
      [
        profile.name,
        profile.email,
        profile.userId,
        profile.gender,
        profile.city,
        profile.education,
        profile.jobTitle,
        profile.createdBy,
        profile.reviewStatus,
        profile.flags.join(" "),
      ],
      searchTerm,
    ),
  )
  const filteredVerifications = verificationItems.filter((item) =>
    matchesSearch([item.profileName, item.userId, item.documentType, item.status, item.documentFileName, item.notes], searchTerm),
  )
  const filteredReports = reportItems.filter((item) =>
    matchesSearch(
      [item.reporterName, item.reportedName, item.reporterId, item.reportedUserId, item.reason, item.description, item.status],
      searchTerm,
    ),
  )
  const filteredAudit = auditItems.filter((item) =>
    matchesSearch(
      [item.actorEmail, item.action, item.resource, item.recordId, item.previousStatus, item.nextStatus, item.notes],
      searchTerm,
    ),
  )

  useEffect(() => {
    let mounted = true

    async function hydrate() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return
      setSessionToken(session?.access_token || null)
      setLoading(false)
    }

    void hydrate()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionToken(session?.access_token || null)
      if (!session) {
        setOverview(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!sessionToken) return

    let mounted = true

    async function loadOverview() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/admin/overview", {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
          cache: "no-store",
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || "Unable to load admin overview")
        }
        if (mounted) {
          setOverview(payload)
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || "Unable to load admin overview")
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadOverview()

    return () => {
      mounted = false
    }
  }, [sessionToken, refreshIndex])

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setAuthLoading(true)
    setError(null)
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (loginError) throw loginError
      setSessionToken(data.session?.access_token || null)
    } catch (err: any) {
      setError(err.message || "Unable to sign in")
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSessionToken(null)
    setOverview(null)
  }

  async function handleAction(
    resource: "verification" | "report" | "profile" | "user" | "entitlement" | "auth_email",
    id: string,
    status: string,
    options?: Record<string, unknown>,
  ) {
    if (!sessionToken) return
    const confirmCopy =
      resource === "auth_email" && status === "resend_confirmation"
        ? "Resend a fresh email verification link to this user?"
        : `Mark this ${resource} as ${statusLabel(status)}?`
    if (!window.confirm(confirmCopy)) return

    const defaultNote =
      resource === "verification" && status === "rejected"
        ? "Rejected by Lovesathi admin review."
        : resource === "verification" && status === "approved"
          ? "Approved by Lovesathi admin review."
          : resource === "verification"
            ? "Moved to in-review by Lovesathi admin."
            : resource === "profile" && status === "approved"
              ? "Profile approved by Lovesathi admin review."
              : resource === "profile" && status === "rejected"
                ? "Profile rejected by Lovesathi admin review."
                : resource === "profile"
                  ? `Profile marked ${statusLabel(status)} by Lovesathi admin.`
                    : resource === "user" && status === "suspended"
                      ? "User access suspended by Lovesathi admin review."
                      : resource === "user"
                        ? "User access restored by Lovesathi admin review."
                        : resource === "entitlement" && status === "active"
                          ? "Premium access granted by Lovesathi admin."
                          : resource === "entitlement"
                            ? "Premium access revoked by Lovesathi admin."
                            : resource === "auth_email"
                              ? "Confirmation email resent by Lovesathi admin."
                              : `Report marked ${statusLabel(status)} by Lovesathi admin.`
    const shouldAskForNote =
      resource === "report" || resource === "user" || status === "rejected" || status === "in_review"
    const noteInput = shouldAskForNote
      ? window.prompt("Add an admin note for the audit trail:", defaultNote)
      : defaultNote

    if (noteInput === null) return

    const key = `${resource}:${id}:${status}`
    setActionKey(key)
    setError(null)
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resource,
          id,
          status,
          notes: noteInput.trim() || defaultNote,
          ...options,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update admin record")
      }
      setRefreshIndex((value) => value + 1)
    } catch (err: any) {
      setError(err.message || "Unable to update admin record")
    } finally {
      setActionKey(null)
    }
  }

  if (loading && !sessionToken) {
    return (
      <main className="luxe-page flex min-h-screen items-center justify-center px-4">
        <div className="luxe-dark-card rounded-[2rem] p-8 text-center text-[#ffffff]">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#d8c79f] border-t-transparent" />
          <p className="mt-4 font-semibold">Opening admin portal...</p>
        </div>
      </main>
    )
  }

  if (!sessionToken) {
    return (
      <main className="luxe-page flex min-h-screen items-center justify-center px-4 py-10">
        <div className="luxe-orb left-[-8rem] top-16 h-80 w-80 bg-[#d8c79f]/18" />
        <div className="luxe-orb right-[-9rem] top-10 h-96 w-96 bg-[#8f001c]/24" />
        <section className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2.5rem] border border-[#d8c79f]/24 bg-white/8 shadow-2xl backdrop-blur-xl lg:grid-cols-[1fr_0.9fr]">
          <div className="hidden min-h-[38rem] flex-col justify-between p-10 text-[#ffffff] lg:flex">
            <div>
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffffff] text-[#8f001c] shadow-xl">
                <Lock className="h-7 w-7" />
              </div>
              <p className="luxe-kicker mb-4 text-[#d8c79f]">admin.lovesathi.com</p>
              <h1 className="luxe-title max-w-lg text-7xl font-bold text-[#ffffff]">
                Private command room for the Lovesathi team.
              </h1>
            </div>
            <p className="max-w-md text-lg leading-8 text-[#d8c79f]">
              Review membership health, verification queues, safety reports, and launch readiness from one guarded portal.
            </p>
          </div>

          <div className="bg-[#ffffff] p-6 sm:p-10">
            <div className="mb-8">
              <p className="luxe-kicker mb-3 text-[#8f001c]">secure access</p>
              <h2 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#18110d]">Admin sign in</h2>
              <p className="mt-3 text-[#685f58]">Use a Supabase account listed in the production ADMIN_EMAILS allowlist.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="h-12 rounded-2xl bg-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="h-12 rounded-2xl bg-white"
                  required
                />
              </div>
              {error && (
                <div className="rounded-2xl border border-[#8f001c]/20 bg-[#8f001c]/10 p-3 text-sm font-bold text-[#8f001c]">
                  {error}
                </div>
              )}
              <Button className="luxe-button h-12 w-full rounded-2xl font-bold" disabled={authLoading}>
                {authLoading ? "Signing in..." : "Enter admin portal"}
              </Button>
            </form>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="luxe-light-page luxe-admin-grid min-h-screen px-4 py-6 sm:px-8 lg:px-10">
      <header className="mx-auto mb-8 flex max-w-7xl flex-col gap-4 rounded-[2rem] border border-[#482b1a]/10 bg-[#ffffff]/82 p-5 shadow-[0_24px_80px_rgba(24,17,13,0.1)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="luxe-kicker mb-2 text-[#8f001c]">Lovesathi admin</p>
          <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#18110d] sm:text-5xl">
            Operations command center
          </h1>
          <p className="mt-2 text-sm text-[#685f58]">
            Signed in as {overview?.admin.email || "admin"} {generatedAt ? `- refreshed ${generatedAt}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d7a55]" />
            <Input
              value={adminSearch}
              onChange={(event) => setAdminSearch(event.target.value)}
              placeholder="Search users, profiles, reports..."
              className="h-10 rounded-full border-[#482b1a]/15 bg-white pl-10 text-sm"
            />
          </div>
          <Button
            variant="outline"
            className="rounded-full border-[#482b1a]/15 bg-white"
            onClick={() => setRefreshIndex((value) => value + 1)}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Refresh
          </Button>
          <Button asChild variant="outline" className="rounded-full border-[#482b1a]/15 bg-white">
            <Link href="https://lovesathi.com">
              View site
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" className="rounded-full border-[#482b1a]/15 bg-white" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8">
        {error && (
          <div className="rounded-[1.5rem] border border-[#8f001c]/20 bg-[#8f001c]/10 p-4 font-semibold text-[#8f001c]">
            {error}
          </div>
        )}

        <section className="rounded-[2rem] border border-[#d8c79f]/24 bg-[#ffffff]/76 p-5 shadow-[0_24px_80px_rgba(24,17,13,0.08)] backdrop-blur-xl">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="luxe-kicker mb-2 text-[#8f001c]">command priorities</p>
              <h2 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#18110d] sm:text-4xl">
                What needs admin attention today
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#685f58]">
              A launch-safe queue view for reports, profile review, ID checks, email confirmation health, premium
              controls, and recent admin activity.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(overview?.risk || []).map((item, index) => {
              const Icon = riskIcons[index % riskIcons.length]
              const isUrgent = item.severity === "urgent"
              const isWatch = item.severity === "watch"
              return (
                <div
                  key={item.label}
                  className={
                    isUrgent
                      ? "rounded-[1.5rem] border border-[#8f001c]/18 bg-[#8f001c]/8 p-4"
                      : isWatch
                        ? "rounded-[1.5rem] border border-[#b79b62]/24 bg-[#b79b62]/10 p-4"
                        : "rounded-[1.5rem] border border-[#1b6b43]/14 bg-[#1b6b43]/7 p-4"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={
                          isUrgent
                            ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#8f001c] text-white"
                            : isWatch
                              ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#b79b62] text-white"
                              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1b6b43] text-white"
                        }
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-bold text-[#18110d]">{item.label}</p>
                        <p className="mt-1 text-sm leading-6 text-[#685f58]">{item.detail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-4xl font-bold tracking-[-0.06em] text-[#18110d]">
                        {item.value.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#9d7a55]">
                        {item.severity}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {(overview?.metrics || []).map((metric, index) => {
            const Icon = metricIcons[index % metricIcons.length]
            return (
              <Card key={metric.label} className="luxe-card rounded-[1.6rem] border-[#d8c79f]/24">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-bold text-[#685f58]">{metric.label}</CardTitle>
                  <Icon className={metric.status === "ok" ? "h-5 w-5 text-[#8f001c]" : "h-5 w-5 text-[#b79b62]"} />
                </CardHeader>
                <CardContent>
                  <p className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#18110d]">
                    {metric.value.toLocaleString("en-IN")}
                  </p>
                  {metric.detail && <p className="mt-2 text-xs text-[#8f001c]">{metric.detail}</p>}
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section>
          <Card className="luxe-card overflow-hidden rounded-[2rem] border-[#d8c79f]/24">
            <CardHeader className="border-b border-[#482b1a]/10 bg-white/55">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#8f001c]">member operations</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#18110d] sm:text-4xl">
                    User management
                  </CardTitle>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#685f58]">
                    Inspect recent Supabase Auth users, email confirmation state, profile completion, review status,
                    and suspend or restore access with an audit note.
                  </p>
                </div>
                <StatusBadge status={overview?.queues.users.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5 sm:p-6">
              {overview?.queues.users.detail && (
                <p className="rounded-2xl border border-[#b79b62]/20 bg-[#b79b62]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.queues.users.detail}
                </p>
              )}
              {filteredUsers.length ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {filteredUsers.map((item) => (
                    <div key={item.id} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/64 p-4 shadow-[0_16px_42px_rgba(24,17,13,0.04)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[#18110d]">{item.email || "Email unavailable"}</p>
                          <p className="mt-1 truncate text-sm text-[#685f58]">
                            {item.profileName || "No matrimony profile yet"}
                          </p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="mt-4 grid gap-2 text-xs font-semibold text-[#685f58] sm:grid-cols-2">
                        <span>Provider: {item.provider || "email"}</span>
                        <span>Profile: {item.profileCompleted ? "Complete" : "Draft or missing"}</span>
                        <span>Email: {item.emailConfirmedAt ? "Confirmed" : "Not confirmed"}</span>
                        <span>Last sign-in: {formatDate(item.lastSignInAt)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.profileReviewStatus && <StatusBadge status={item.profileReviewStatus} />}
                        <StatusBadge status={item.premium.isPremium ? "premium" : "free"} />
                        {!item.emailConfirmedAt && item.email && (
                          <Badge variant="outline" className="border-[#b79b62]/24 bg-[#b79b62]/10 text-[#8a641f]">
                            Verification email needed
                          </Badge>
                        )}
                        {item.premium.planName && (
                          <Badge variant="outline" className="border-[#d8c79f]/30 bg-[#f7f5f1] text-[#8f001c]">
                            {item.premium.planName}
                            {item.premium.activeUntil ? ` until ${formatDate(item.premium.activeUntil)}` : ""}
                          </Badge>
                        )}
                        {item.suspendedUntil && (
                          <Badge variant="outline" className="border-[#8f001c]/20 bg-[#8f001c]/10 text-[#8f001c]">
                            Suspended until {formatDate(item.suspendedUntil)}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.status === "suspended" ? (
                          <Button
                            size="sm"
                            className="rounded-full bg-[#1b6b43] text-white hover:bg-[#155333]"
                            disabled={Boolean(actionKey)}
                            onClick={() => handleAction("user", item.id, "active")}
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Restore access
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-[#8f001c]/20 bg-[#8f001c]/10 text-[#8f001c]"
                            disabled={Boolean(actionKey)}
                            onClick={() => handleAction("user", item.id, "suspended")}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Suspend
                          </Button>
                        )}
                        {!item.emailConfirmedAt && item.email && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-[#b79b62]/30 bg-[#b79b62]/10 text-[#8a641f]"
                            disabled={Boolean(actionKey)}
                            onClick={() => handleAction("auth_email", item.id, "resend_confirmation")}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Resend verification
                          </Button>
                        )}
                        {item.premium.isPremium ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-[#8f001c]/20 bg-[#8f001c]/10 text-[#8f001c]"
                            disabled={Boolean(actionKey)}
                            onClick={() => handleAction("entitlement", item.id, "canceled")}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Revoke premium
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-[#d8c79f]/30 bg-[#f7f5f1] text-[#8f001c]"
                            disabled={Boolean(actionKey)}
                            onClick={() => handleAction("entitlement", item.id, "active", { planId: "signature" })}
                          >
                            <Crown className="mr-2 h-4 w-4" />
                            Grant Signature
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState copy={searchTerm ? "No users match this admin search." : "No auth users were returned yet."} />
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="luxe-card overflow-hidden rounded-[2rem] border-[#d8c79f]/24">
            <CardHeader className="border-b border-[#482b1a]/10 bg-white/50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#8f001c]">supabase email watch</p>
                  <CardTitle className="flex items-center gap-3 font-serif text-3xl tracking-[-0.04em] text-[#18110d] sm:text-4xl">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8f001c] text-[#ffffff]">
                      <Mail className="h-5 w-5" />
                    </span>
                    Auth email telemetry
                  </CardTitle>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#685f58]">
                    Tracks Supabase Auth audit events with separate lifetime and last-30-day counters for emails and
                    clickable magic links, including confirmation and reset-password links.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={overview?.authEmailTelemetry.status || "pending"} />
                  <Badge variant="outline" className="rounded-full border-[#d8c79f]/30 bg-[#ffffff] px-4 py-2 text-[#8f001c]">
                    {authEmailOverall.toLocaleString("en-IN")} emails all time
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-[#d8c79f]/30 bg-[#ffffff] px-4 py-2 text-[#8f001c]">
                    {authEmailLast30.toLocaleString("en-IN")} emails in 30d
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-6">
              {overview?.authEmailTelemetry.detail && (
                <div className="rounded-[1.35rem] border border-[#b79b62]/20 bg-[#b79b62]/10 p-4 text-sm font-semibold leading-6 text-[#8a641f]">
                  {overview.authEmailTelemetry.detail}
                </div>
              )}

              <div className="grid gap-3 lg:grid-cols-2">
                {overview?.authEmailTelemetry.summary.length ? (
                  overview.authEmailTelemetry.summary.map((item) => (
                    <div key={item.category} className="rounded-[1.6rem] border border-[#482b1a]/10 bg-white/72 p-5 shadow-[0_18px_48px_rgba(24,17,13,0.05)]">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8f001c]">{item.label}</p>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-[1.2rem] border border-[#d8c79f]/24 bg-[#ffffff] p-4">
                          <p className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#9d7a55]">All time</p>
                          <p className="mt-2 font-serif text-4xl font-bold tracking-[-0.05em] text-[#18110d]">
                            {item.overall.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="rounded-[1.2rem] border border-[#8f001c]/14 bg-[#8f001c]/6 p-4">
                          <p className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#8f001c]">Last 30 days</p>
                          <p className="mt-2 font-serif text-4xl font-bold tracking-[-0.05em] text-[#18110d]">
                            {item.last30Days.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <p className="mt-4 min-h-12 text-xs leading-5 text-[#685f58]">{item.description}</p>
                      <p className="mt-3 text-xs font-semibold text-[#9d7a55]">Last seen {formatDate(item.lastSeen)}</p>
                    </div>
                  ))
                ) : (
                  <div className="lg:col-span-2">
                    <EmptyState copy="No Supabase auth email counters are available yet." />
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {overview?.authEmailTelemetry.counts.length ? (
                  overview.authEmailTelemetry.counts.map((item) => (
                    <div key={item.action} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/58 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8f001c]">{item.label}</p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[#9d7a55]">All time</p>
                          <p className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#18110d]">
                            {item.total.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[#9d7a55]">30d</p>
                          <p className="font-serif text-2xl font-bold tracking-[-0.05em] text-[#8f001c]">
                            {item.last30Days.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 min-h-12 text-xs leading-5 text-[#685f58]">{item.description}</p>
                      <p className="mt-3 text-xs font-semibold text-[#9d7a55]">Last seen {formatDate(item.lastSeen)}</p>
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-2 xl:col-span-5">
                    <EmptyState copy="No detailed Supabase auth email actions found yet." />
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-[#482b1a]/10 bg-[#ffffff]/70">
                <div className="flex flex-col gap-2 border-b border-[#482b1a]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#18110d]">Recent email events</p>
                    <p className="text-xs font-semibold text-[#9d7a55]">
                      Since {formatDate(overview?.authEmailTelemetry.since)}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-[#685f58]">
                    Source: Supabase `auth.audit_log_entries`
                  </p>
                </div>
                <div className="divide-y divide-[#482b1a]/10">
                  {overview?.authEmailTelemetry.events.length ? (
                    overview.authEmailTelemetry.events.map((event) => (
                      <div key={event.id} className="grid gap-3 p-4 text-sm sm:grid-cols-[1.1fr_1fr_0.9fr] sm:items-center">
                        <div>
                          <p className="font-bold text-[#18110d]">{event.label}</p>
                          <p className="mt-1 text-xs text-[#685f58]">{event.action}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-[#18110d]">{event.email || "Email not exposed in audit payload"}</p>
                          <p className="mt-1 truncate text-xs text-[#685f58]">{event.userId || "User ID unavailable"}</p>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-semibold text-[#18110d]">{formatDate(event.createdAt)}</p>
                          <p className="mt-1 text-xs text-[#685f58]">{event.ipAddress || "IP unavailable"}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4">
                      <EmptyState copy="No recent email event rows are available yet." />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="luxe-card rounded-[2rem] border-[#d8c79f]/24">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#8f001c]">member quality</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#18110d]">
                    Profile review
                  </CardTitle>
                </div>
                <StatusBadge status={overview?.queues.profiles.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview?.queues.profiles.detail && (
                <p className="rounded-2xl border border-[#b79b62]/20 bg-[#b79b62]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.queues.profiles.detail}
                </p>
              )}
              {filteredProfiles.length ? (
                filteredProfiles.map((profile) => (
                  <div key={profile.id} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#18110d]">{profile.name}</p>
                        <p className="mt-1 text-sm text-[#685f58]">
                          {[profile.age ? `${profile.age} yrs` : null, profile.gender, profile.city].filter(Boolean).join(" - ") ||
                            "Profile details pending"}
                        </p>
                        {profile.email && <p className="mt-1 text-xs font-semibold text-[#9d7a55]">{profile.email}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={profile.reviewStatus} />
                        <StatusBadge status={profile.profileCompleted ? "active" : "pending"} />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-xs font-semibold text-[#685f58] sm:grid-cols-3">
                      <span>{profile.completionSteps}/7 steps complete</span>
                      <span>{profile.photoCount} photos</span>
                      <span>{profile.createdBy ? `Created by ${profile.createdBy}` : "Creator pending"}</span>
                    </div>
                    <p className="mt-3 text-sm text-[#685f58]">
                      {[profile.education, profile.jobTitle].filter(Boolean).join(" - ") || "Career and education pending"}
                    </p>
                    {profile.bio && <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#685f58]">{profile.bio}</p>}
                    {profile.flags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.flags.map((flag) => (
                          <Badge key={flag} variant="outline" className="border-[#b79b62]/24 bg-[#b79b62]/10 text-[#8a641f]">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {profile.reviewNotes && (
                      <p className="mt-3 rounded-2xl border border-[#482b1a]/10 bg-white/60 p-3 text-xs leading-5 text-[#685f58]">
                        Admin note: {profile.reviewNotes}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-[#9d7a55]">
                      Updated {formatDate(profile.updatedAt)}
                      {profile.reviewedAt ? ` | Reviewed ${formatDate(profile.reviewedAt)}` : ""}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-full bg-[#1b6b43] text-white hover:bg-[#155333]"
                        disabled={Boolean(actionKey) || !profileReviewActionsReady}
                        onClick={() => handleAction("profile", profile.id, "approved")}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#482b1a]/15 bg-white"
                        disabled={Boolean(actionKey) || !profileReviewActionsReady}
                        onClick={() => handleAction("profile", profile.id, "in_review")}
                      >
                        <UserRoundCheck className="mr-2 h-4 w-4" />
                        In review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#8f001c]/20 bg-[#8f001c]/10 text-[#8f001c]"
                        disabled={Boolean(actionKey) || !profileReviewActionsReady}
                        onClick={() => handleAction("profile", profile.id, "rejected")}
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState copy={searchTerm ? "No profiles match this admin search." : "No matrimony profiles were returned yet."} />
              )}
            </CardContent>
          </Card>

          <Card className="luxe-dark-card rounded-[2rem] border-[#d8c79f]/24 text-[#ffffff]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#d8c79f]">identity queue</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#ffffff]">
                    Verifications
                  </CardTitle>
                </div>
                <StatusBadge status={overview?.queues.verifications.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview?.queues.verifications.detail && (
                <p className="rounded-2xl border border-[#d8c79f]/20 bg-white/8 p-3 text-sm font-semibold text-[#d8c79f]">
                  {overview.queues.verifications.detail}
                </p>
              )}
              {filteredVerifications.length ? (
                filteredVerifications.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#ffffff]">{item.profileName}</p>
                        <p className="mt-1 text-sm text-[#d8c79f]">
                          {item.documentType ? statusLabel(item.documentType) : "Document type pending"}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#d9c8a8]">
                      Document: {item.documentFileName || "Not uploaded"} | Face scan: {item.faceScanFileName || "Not uploaded"}
                    </p>
                    <p className="mt-1 text-xs text-[#d9c8a8]">Submitted {formatDate(item.createdAt)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-full bg-[#1b6b43] text-white hover:bg-[#155333]"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("verification", item.id, "approved")}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#d8c79f]/40 bg-white/10 text-[#ffffff] hover:bg-white/15"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("verification", item.id, "in_review")}
                      >
                        <UserRoundCheck className="mr-2 h-4 w-4" />
                        In review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#f3b2b2]/40 bg-[#8f001c]/30 text-[#ffffff] hover:bg-[#8f001c]/45"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("verification", item.id, "rejected")}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState copy={searchTerm ? "No verifications match this admin search." : "No pending identity verifications right now."} />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="luxe-card rounded-[2rem] border-[#d8c79f]/24">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#8f001c]">trust desk</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#18110d]">Safety reports</CardTitle>
                </div>
                <StatusBadge status={overview?.queues.reports.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview?.queues.reports.detail && (
                <p className="rounded-2xl border border-[#b79b62]/20 bg-[#b79b62]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.queues.reports.detail}
                </p>
              )}
              {filteredReports.length ? (
                filteredReports.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#18110d]">
                          {item.reportedName}
                        </p>
                        <p className="mt-1 text-sm text-[#685f58]">Reported by {item.reporterName}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-[#8f001c]">{statusLabel(item.reason)}</p>
                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-[#685f58]">
                      {item.description || "No extra description was provided."}
                    </p>
                    <p className="mt-2 text-xs text-[#9d7a55]">Submitted {formatDate(item.createdAt)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-full bg-[#1b6b43] text-white hover:bg-[#155333]"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("report", item.id, "resolved")}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#482b1a]/15 bg-white"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("report", item.id, "reviewed")}
                      >
                        Mark reviewed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#8f001c]/20 bg-[#8f001c]/10 text-[#8f001c]"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("report", item.id, "dismissed")}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState copy={searchTerm ? "No safety reports match this admin search." : "No open safety reports right now."} />
              )}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="luxe-card rounded-[2rem] border-[#d8c79f]/24">
              <CardHeader>
                <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#18110d]">Launch readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(overview?.readiness || []).map((item) => (
                  <div key={item.label} className="flex gap-3 rounded-2xl border border-[#482b1a]/10 bg-white/58 p-4">
                    {item.status === "ok" ? (
                      <BadgeCheck className="mt-1 h-5 w-5 shrink-0 text-[#8f001c]" />
                    ) : (
                      <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-[#b79b62]" />
                    )}
                    <div>
                      <p className="font-bold text-[#18110d]">{item.label}</p>
                      <p className="text-sm leading-6 text-[#685f58]">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="luxe-card rounded-[2rem] border-[#d8c79f]/24">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="luxe-kicker mb-2 text-[#8f001c]">audit trail</p>
                    <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#18110d]">Action history</CardTitle>
                  </div>
                  <StatusBadge status={overview?.queues.audit.status || "pending"} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview?.queues.audit.detail && (
                  <p className="rounded-2xl border border-[#b79b62]/20 bg-[#b79b62]/10 p-3 text-sm font-semibold text-[#8a641f]">
                    {overview.queues.audit.detail}
                  </p>
                )}
                {filteredAudit.length ? (
                  filteredAudit.map((item) => (
                    <div key={item.id} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[#18110d]">{statusLabel(item.action)}</p>
                          <p className="mt-1 text-sm text-[#685f58]">
                            {item.actorEmail || "Admin"} updated {item.resource}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-[#9d7a55]">{formatDate(item.createdAt)}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.previousStatus && <StatusBadge status={item.previousStatus} />}
                        <span className="text-sm font-bold text-[#9d7a55]">to</span>
                        {item.nextStatus && <StatusBadge status={item.nextStatus} />}
                      </div>
                      {item.notes && <p className="mt-3 text-sm leading-6 text-[#685f58]">{item.notes}</p>}
                    </div>
                  ))
                ) : (
                  <EmptyState copy={searchTerm ? "No audit records match this admin search." : "No admin actions have been recorded yet."} />
                )}
              </CardContent>
            </Card>

            <Card className="luxe-dark-card rounded-[2rem] border-[#d8c79f]/24 text-[#ffffff]">
              <CardHeader>
                <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#ffffff]">Admin safety model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-[#d8c79f]">
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
                  <Activity className="mt-1 h-5 w-5 shrink-0 text-[#d8c79f]" />
                  <p>
                    This portal can update user access, profile review, verification, and report statuses only after Supabase login and ADMIN_EMAILS allowlist checks.
                  </p>
                </div>
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
                  <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#d8c79f]" />
                  <p>
                    Account deletion, bulk edits, refunds, and subscription changes stay locked until those workflows get separate role gates and stronger confirmations.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}
