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
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans"

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
  publicId: string | null
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
  publicId: string | null
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
    renewalDueAt: string | null
    graceUntil: string | null
    paymentDue: boolean
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

type AdminQueueFilter = "all" | "attention" | "profiles" | "reports" | "premium" | "heritage"

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
  const isWarning = ["pending", "in_review", "reviewed", "warning", "unconfirmed", "free", "past_due"].includes(safeStatus)

  return (
    <Badge
      variant="outline"
      className={
        isGood
          ? "border-[#1b6b43]/20 bg-[#1b6b43]/10 text-[#1b6b43]"
          : isWarning
            ? "border-[#E83262]/25 bg-[#E83262]/12 text-[#8a641f]"
            : "border-[#E83262]/20 bg-[#E83262]/10 text-[#E83262]"
      }
    >
      {statusLabel(status)}
    </Badge>
  )
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-[#482b1a]/18 bg-white/45 p-5 text-sm font-semibold text-[#6F7C8B]">
      {copy}
    </div>
  )
}

function normaliseStatus(value?: string | null) {
  return (value || "").toLowerCase()
}

function userNeedsAttention(item: AdminUserItem) {
  const userStatus = normaliseStatus(item.status)
  const reviewStatus = normaliseStatus(item.profileReviewStatus)
  const premiumStatus = normaliseStatus(item.premium.status)

  return (
    userStatus !== "active" ||
    !item.emailConfirmedAt ||
    item.premium.paymentDue ||
    premiumStatus === "past_due" ||
    ["pending", "in_review", "rejected"].includes(reviewStatus)
  )
}

function profileNeedsAttention(profile: AdminProfileItem) {
  return (
    !profile.profileCompleted ||
    profile.flags.length > 0 ||
    ["pending", "in_review", "rejected"].includes(normaliseStatus(profile.reviewStatus))
  )
}

function verificationNeedsAttention(item: AdminVerificationItem) {
  return ["pending", "in_review", "rejected"].includes(normaliseStatus(item.status))
}

function reportNeedsAttention(item: AdminReportItem) {
  return ["pending", "reviewed"].includes(normaliseStatus(item.status))
}

function userMatchesLane(item: AdminUserItem, lane: AdminQueueFilter) {
  if (lane === "attention") return userNeedsAttention(item)
  if (lane === "premium") return Boolean(item.premium.isPremium || item.premium.status)
  if (lane === "heritage") return item.premium.planId === "heritage"
  return true
}

function profileMatchesLane(profile: AdminProfileItem, lane: AdminQueueFilter) {
  if (lane === "attention" || lane === "profiles") return profileNeedsAttention(profile)
  return true
}

function verificationMatchesLane(item: AdminVerificationItem, lane: AdminQueueFilter) {
  if (lane === "attention") return verificationNeedsAttention(item)
  return true
}

function reportMatchesLane(item: AdminReportItem, lane: AdminQueueFilter) {
  if (lane === "attention" || lane === "reports") return reportNeedsAttention(item)
  return true
}

function auditMatchesLane(item: AdminAuditItem, lane: AdminQueueFilter) {
  const resource = normaliseStatus(item.resource)
  if (lane === "profiles") return resource === "profile"
  if (lane === "reports") return resource === "report"
  if (lane === "premium" || lane === "heritage") return resource === "entitlement"
  return true
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
  const [queueFilter, setQueueFilter] = useState<AdminQueueFilter>("all")

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
  const searchedUsers = userItems.filter((item) =>
    matchesSearch(
      [
        item.email,
        item.id,
        item.publicId,
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
  const searchedProfiles = profileItems.filter((profile) =>
    matchesSearch(
      [
        profile.name,
        profile.email,
        profile.userId,
        profile.publicId,
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
  const searchedVerifications = verificationItems.filter((item) =>
    matchesSearch([item.profileName, item.userId, item.documentType, item.status, item.documentFileName, item.notes], searchTerm),
  )
  const searchedReports = reportItems.filter((item) =>
    matchesSearch(
      [item.reporterName, item.reportedName, item.reporterId, item.reportedUserId, item.reason, item.description, item.status],
      searchTerm,
    ),
  )
  const searchedAudit = auditItems.filter((item) =>
    matchesSearch(
      [item.actorEmail, item.action, item.resource, item.recordId, item.previousStatus, item.nextStatus, item.notes],
      searchTerm,
    ),
  )
  const filteredUsers = searchedUsers.filter((item) => userMatchesLane(item, queueFilter))
  const filteredProfiles = searchedProfiles.filter((profile) => profileMatchesLane(profile, queueFilter))
  const filteredVerifications = searchedVerifications.filter((item) => verificationMatchesLane(item, queueFilter))
  const filteredReports = searchedReports.filter((item) => reportMatchesLane(item, queueFilter))
  const filteredAudit = searchedAudit.filter((item) => auditMatchesLane(item, queueFilter))
  const attentionUsers = userItems.filter(userNeedsAttention)
  const attentionProfiles = profileItems.filter(profileNeedsAttention)
  const attentionVerifications = verificationItems.filter(verificationNeedsAttention)
  const attentionReports = reportItems.filter(reportNeedsAttention)
  const premiumUsers = userItems.filter((item) => item.premium.isPremium || item.premium.status)
  const heritageUsers = searchedUsers.filter((item) => item.premium.planId === "heritage")
  const paymentDueUsers = userItems.filter((item) => item.premium.paymentDue)
  const totalQueueItems = userItems.length + profileItems.length + verificationItems.length + reportItems.length
  const queueFilters: Array<{
    id: AdminQueueFilter
    label: string
    count: number
    detail: string
  }> = [
    {
      id: "all",
      label: "All queues",
      count: totalQueueItems,
      detail: "Full admin command view",
    },
    {
      id: "attention",
      label: "Needs attention",
      count: attentionUsers.length + attentionProfiles.length + attentionVerifications.length + attentionReports.length,
      detail: "Review, safety, email, and renewal risks",
    },
    {
      id: "profiles",
      label: "Profile review",
      count: attentionProfiles.length,
      detail: "Incomplete, flagged, or pending dossiers",
    },
    {
      id: "reports",
      label: "Safety desk",
      count: attentionReports.length,
      detail: "Open member reports",
    },
    {
      id: "premium",
      label: "Premium ops",
      count: premiumUsers.length,
      detail: "Manual entitlements and payment follow-up",
    },
    {
      id: "heritage",
      label: "Heritage concierge",
      count: userItems.filter((item) => item.premium.planId === "heritage").length,
      detail: "High-touch members needing concierge care",
    },
  ]

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
        ? "Resend a fresh email verification code to this user?"
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
                              ? "Confirmation code resent by Lovesathi admin."
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
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#E83262] border-t-transparent" />
          <p className="mt-4 font-semibold">Opening admin portal...</p>
        </div>
      </main>
    )
  }

  if (!sessionToken) {
    return (
      <main className="luxe-page flex min-h-screen items-center justify-center px-4 py-10">
        <div className="luxe-orb left-[-8rem] top-16 h-80 w-80 bg-[#E83262]/18" />
        <div className="luxe-orb right-[-9rem] top-10 h-96 w-96 bg-[#E83262]/24" />
        <section className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2.5rem] border border-[#E83262]/24 bg-white/8 shadow-2xl backdrop-blur-xl lg:grid-cols-[1fr_0.9fr]">
          <div className="hidden min-h-[38rem] flex-col justify-between p-10 text-[#ffffff] lg:flex">
            <div>
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffffff] text-[#E83262] shadow-xl">
                <Lock className="h-7 w-7" />
              </div>
              <p className="luxe-kicker mb-4 text-[#E83262]">admin.lovesathi.com</p>
              <h1 className="luxe-title max-w-lg text-7xl font-bold text-[#ffffff]">
                Private command room for the Lovesathi team.
              </h1>
            </div>
            <p className="max-w-md text-lg leading-8 text-[#E83262]">
              Review membership health, verification queues, safety reports, and launch readiness from one guarded portal.
            </p>
          </div>

          <div className="bg-[#ffffff] p-6 sm:p-10">
            <div className="mb-8">
              <p className="luxe-kicker mb-3 text-[#E83262]">secure access</p>
              <h2 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#26364A]">Admin sign in</h2>
              <p className="mt-3 text-[#6F7C8B]">Use a Supabase account listed in the production ADMIN_EMAILS allowlist.</p>
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
                <div className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-bold text-[#E83262]">
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
          <p className="luxe-kicker mb-2 text-[#E83262]">Lovesathi admin</p>
          <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A] sm:text-5xl">
            Operations command center
          </h1>
          <p className="mt-2 text-sm text-[#6F7C8B]">
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
          <div className="rounded-[1.5rem] border border-[#E83262]/20 bg-[#E83262]/10 p-4 font-semibold text-[#E83262]">
            {error}
          </div>
        )}

        <section className="rounded-[2rem] border border-[#E83262]/24 bg-[#ffffff]/76 p-5 shadow-[0_24px_80px_rgba(24,17,13,0.08)] backdrop-blur-xl">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="luxe-kicker mb-2 text-[#E83262]">command priorities</p>
              <h2 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#26364A] sm:text-4xl">
                What needs admin attention today
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#6F7C8B]">
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
                      ? "rounded-[1.5rem] border border-[#E83262]/18 bg-[#E83262]/8 p-4"
                      : isWatch
                        ? "rounded-[1.5rem] border border-[#E83262]/24 bg-[#E83262]/10 p-4"
                        : "rounded-[1.5rem] border border-[#1b6b43]/14 bg-[#1b6b43]/7 p-4"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={
                          isUrgent
                            ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E83262] text-white"
                            : isWatch
                              ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E83262] text-white"
                              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1b6b43] text-white"
                        }
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-bold text-[#26364A]">{item.label}</p>
                        <p className="mt-1 text-sm leading-6 text-[#6F7C8B]">{item.detail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-4xl font-bold tracking-[-0.06em] text-[#26364A]">
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

        <section className="rounded-[2rem] border border-[#E83262]/24 bg-[#ffffff]/72 p-4 shadow-[0_24px_80px_rgba(24,17,13,0.07)] backdrop-blur-xl sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="luxe-kicker mb-2 text-[#E83262]">operations lanes</p>
              <h2 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#26364A]">
                Focus the command room
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#6F7C8B]">
              Use these lanes during launch review so support, safety, profile quality, and concierge work do not get
              mixed together.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {queueFilters.map((filter) => {
              const isActive = queueFilter === filter.id
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setQueueFilter(filter.id)}
                  className={
                    isActive
                      ? "rounded-[1.45rem] border border-[#E83262] bg-[#26364A] p-4 text-left text-white shadow-[0_18px_50px_rgba(58,43,36,0.18)] transition hover:-translate-y-0.5"
                      : "rounded-[1.45rem] border border-[#482b1a]/10 bg-white/70 p-4 text-left text-[#26364A] shadow-[0_14px_36px_rgba(24,17,13,0.04)] transition hover:-translate-y-0.5 hover:border-[#E83262]/45"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold">{filter.label}</p>
                    <span
                      className={
                        isActive
                          ? "rounded-full bg-[#E83262] px-2.5 py-1 text-xs font-black text-white"
                          : "rounded-full bg-[#E83262]/12 px-2.5 py-1 text-xs font-black text-[#8a641f]"
                      }
                    >
                      {filter.count.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className={isActive ? "mt-3 text-xs leading-5 text-[#eadcc8]" : "mt-3 text-xs leading-5 text-[#6F7C8B]"}>
                    {filter.detail}
                  </p>
                </button>
              )
            })}
          </div>
          {paymentDueUsers.length > 0 && (
            <div className="mt-4 rounded-[1.35rem] border border-[#b45309]/20 bg-[#fff7ed] p-4 text-sm font-semibold leading-6 text-[#9a3412]">
              {paymentDueUsers.length.toLocaleString("en-IN")} premium member
              {paymentDueUsers.length === 1 ? "" : "s"} currently need renewal follow-up. Keep payment-provider wiring
              queued until the dedicated subscription phase.
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {(overview?.metrics || []).map((metric, index) => {
            const Icon = metricIcons[index % metricIcons.length]
            return (
              <Card key={metric.label} className="luxe-card rounded-[1.6rem] border-[#E83262]/24">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-bold text-[#6F7C8B]">{metric.label}</CardTitle>
                  <Icon className={metric.status === "ok" ? "h-5 w-5 text-[#E83262]" : "h-5 w-5 text-[#E83262]"} />
                </CardHeader>
                <CardContent>
                  <p className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#26364A]">
                    {metric.value.toLocaleString("en-IN")}
                  </p>
                  {metric.detail && <p className="mt-2 text-xs text-[#E83262]">{metric.detail}</p>}
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section>
          <Card className="luxe-card overflow-hidden rounded-[2rem] border-[#E83262]/24">
            <CardHeader className="border-b border-[#482b1a]/10 bg-white/55">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">member operations</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A] sm:text-4xl">
                    User management
                  </CardTitle>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6F7C8B]">
                    Inspect recent Supabase Auth users, email confirmation state, profile completion, review status,
                    and suspend or restore access with an audit note.
                  </p>
                  {queueFilter !== "all" && (
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#E83262]">
                      Showing {statusLabel(queueFilter)} lane
                    </p>
                  )}
                </div>
                <StatusBadge status={overview?.queues.users.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5 sm:p-6">
              {overview?.queues.users.detail && (
                <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.queues.users.detail}
                </p>
              )}
              {filteredUsers.length ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {filteredUsers.map((item) => (
                    <div key={item.id} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/64 p-4 shadow-[0_16px_42px_rgba(24,17,13,0.04)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[#26364A]">{item.email || "Email unavailable"}</p>
                          <p className="mt-1 truncate text-sm text-[#6F7C8B]">
                            {item.profileName || "No matrimony profile yet"}
                          </p>
                          <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[#9d7a55]">
                            ID - {item.publicId || "Pending"}
                          </p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="mt-4 grid gap-2 text-xs font-semibold text-[#6F7C8B] sm:grid-cols-2">
                        <span>Provider: {item.provider || "email"}</span>
                        <span>Profile: {item.profileCompleted ? "Complete" : "Draft or missing"}</span>
                        <span>Email: {item.emailConfirmedAt ? "Confirmed" : "Not confirmed"}</span>
                        <span>Last sign-in: {formatDate(item.lastSignInAt)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.profileReviewStatus && <StatusBadge status={item.profileReviewStatus} />}
                        <StatusBadge status={item.premium.isPremium ? "premium" : "free"} />
                        {!item.emailConfirmedAt && item.email && (
                          <Badge variant="outline" className="border-[#E83262]/24 bg-[#E83262]/10 text-[#8a641f]">
                            Verification email needed
                          </Badge>
                        )}
                        {item.premium.planName && (
                          <Badge variant="outline" className="border-[#E83262]/30 bg-[#F2F5FA] text-[#E83262]">
                            {item.premium.planName}
                            {item.premium.paymentDue && item.premium.graceUntil
                              ? ` grace until ${formatDate(item.premium.graceUntil)}`
                              : item.premium.activeUntil
                                ? ` until ${formatDate(item.premium.activeUntil)}`
                                : ""}
                          </Badge>
                        )}
                        {item.premium.paymentDue && (
                          <Badge variant="outline" className="border-[#b45309]/25 bg-[#fff7ed] text-[#9a3412]">
                            Renewal payment due
                          </Badge>
                        )}
                        {item.suspendedUntil && (
                          <Badge variant="outline" className="border-[#E83262]/20 bg-[#E83262]/10 text-[#E83262]">
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
                            className="rounded-full border-[#E83262]/20 bg-[#E83262]/10 text-[#E83262]"
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
                            className="rounded-full border-[#E83262]/30 bg-[#E83262]/10 text-[#8a641f]"
                            disabled={Boolean(actionKey)}
                            onClick={() => handleAction("auth_email", item.id, "resend_confirmation")}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Resend verification
                          </Button>
                        )}
                        {item.premium.isPremium && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-[#E83262]/20 bg-[#E83262]/10 text-white"
                            disabled={Boolean(actionKey)}
                            onClick={() => handleAction("entitlement", item.id, "canceled")}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Revoke premium
                          </Button>
                        )}
                        {item.premium.isPremium && !item.premium.paymentDue && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-[#b45309]/24 bg-[#fff7ed] text-[#9a3412]"
                            disabled={Boolean(actionKey)}
                            onClick={() => handleAction("entitlement", item.id, "past_due")}
                          >
                            <Clock3 className="mr-2 h-4 w-4" />
                            Mark payment due
                          </Button>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {SUBSCRIPTION_PLANS.map((plan) => (
                            <Button
                              key={plan.id}
                              size="sm"
                              variant="outline"
                              className="rounded-full border-[#E83262]/35 bg-[#FFFFFF]/82 text-[#26364A] hover:border-[#E83262] hover:bg-[#E83262]/18"
                              disabled={Boolean(actionKey)}
                              onClick={() => handleAction("entitlement", item.id, "active", { planId: plan.id })}
                            >
                              <Crown className="mr-2 h-4 w-4 text-[#E83262]" />
                              Grant {plan.name}
                            </Button>
                          ))}
                        </div>
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
          <Card className="luxe-card overflow-hidden rounded-[2rem] border-[#E83262]/24">
            <CardHeader className="border-b border-[#482b1a]/10 bg-[#26364A] text-white">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">heritage concierge</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-white sm:text-4xl">
                    High-touch member desk
                  </CardTitle>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#eadcc8]">
                    Heritage members need human follow-through: renewal grace, handpicked match care, and concierge
                    notes should be easy to spot before payment automation arrives.
                  </p>
                </div>
                <Badge variant="outline" className="rounded-full border-[#E83262]/45 bg-[#E83262]/15 px-4 py-2 text-[#E83262]">
                  {heritageUsers.length.toLocaleString("en-IN")} Heritage visible
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5 sm:p-6">
              {heritageUsers.length ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {heritageUsers.map((item) => (
                    <div key={item.id} className="rounded-[1.5rem] border border-[#E83262]/24 bg-white/72 p-4 shadow-[0_16px_42px_rgba(24,17,13,0.04)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">
                            {item.profileName || "Profile name pending"}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-[#6F7C8B]">
                            {item.email || "Email unavailable"}
                          </p>
                        </div>
                        <StatusBadge status={item.premium.status || "heritage"} />
                      </div>
                      <div className="mt-4 grid gap-2 text-xs font-semibold text-[#6F7C8B] sm:grid-cols-2">
                        <span>Active until: {formatDate(item.premium.activeUntil)}</span>
                        <span>Grace until: {formatDate(item.premium.graceUntil)}</span>
                        <span>Renewal due: {formatDate(item.premium.renewalDueAt)}</span>
                        <span>Source: {item.premium.source || "manual/admin"}</span>
                      </div>
                      <div className="mt-4 rounded-[1.2rem] border border-[#E83262]/20 bg-[#F6F7FB] p-4 text-sm leading-6 text-[#6F7C8B]">
                        Next concierge action: confirm this member has an assigned relationship executive, a fresh
                        handpicked shortlist, and payment follow-up if the grace window is active.
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.premium.paymentDue && (
                          <Badge variant="outline" className="border-[#b45309]/25 bg-[#fff7ed] text-[#9a3412]">
                            Renewal payment due
                          </Badge>
                        )}
                        {!item.emailConfirmedAt && (
                          <Badge variant="outline" className="border-[#E83262]/24 bg-[#E83262]/10 text-[#8a641f]">
                            Email confirmation pending
                          </Badge>
                        )}
                        {item.profileReviewStatus && <StatusBadge status={item.profileReviewStatus} />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  copy={
                    searchTerm
                      ? "No Heritage concierge members match this admin search."
                      : "No Heritage members are visible yet. Once granted, they will appear here for concierge follow-up."
                  }
                />
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="luxe-card overflow-hidden rounded-[2rem] border-[#E83262]/24">
            <CardHeader className="border-b border-[#482b1a]/10 bg-white/50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">supabase email watch</p>
                  <CardTitle className="flex items-center gap-3 font-serif text-3xl tracking-[-0.04em] text-[#26364A] sm:text-4xl">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E83262] text-white">
                      <Mail className="h-5 w-5" />
                    </span>
                    Auth email telemetry
                  </CardTitle>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6F7C8B]">
                    Tracks Supabase Auth audit events with separate lifetime and last-30-day counters for emails and
                    clickable magic links, including confirmation and reset-password links.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={overview?.authEmailTelemetry.status || "pending"} />
                  <Badge variant="outline" className="rounded-full border-[#E83262]/30 bg-[#ffffff] px-4 py-2 text-[#E83262]">
                    {authEmailOverall.toLocaleString("en-IN")} emails all time
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-[#E83262]/30 bg-[#ffffff] px-4 py-2 text-[#E83262]">
                    {authEmailLast30.toLocaleString("en-IN")} emails in 30d
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-6">
              {overview?.authEmailTelemetry.detail && (
                <div className="rounded-[1.35rem] border border-[#E83262]/20 bg-[#E83262]/10 p-4 text-sm font-semibold leading-6 text-[#8a641f]">
                  {overview.authEmailTelemetry.detail}
                </div>
              )}

              <div className="grid gap-3 lg:grid-cols-2">
                {overview?.authEmailTelemetry.summary.length ? (
                  overview.authEmailTelemetry.summary.map((item) => (
                    <div key={item.category} className="rounded-[1.6rem] border border-[#482b1a]/10 bg-white/72 p-5 shadow-[0_18px_48px_rgba(24,17,13,0.05)]">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E83262]">{item.label}</p>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-[1.2rem] border border-[#E83262]/24 bg-[#ffffff] p-4">
                          <p className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#9d7a55]">All time</p>
                          <p className="mt-2 font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A]">
                            {item.overall.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="rounded-[1.2rem] border border-[#E83262]/14 bg-[#E83262]/6 p-4">
                          <p className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#E83262]">Last 30 days</p>
                          <p className="mt-2 font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A]">
                            {item.last30Days.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <p className="mt-4 min-h-12 text-xs leading-5 text-[#6F7C8B]">{item.description}</p>
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
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E83262]">{item.label}</p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[#9d7a55]">All time</p>
                          <p className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#26364A]">
                            {item.total.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[#9d7a55]">30d</p>
                          <p className="font-serif text-2xl font-bold tracking-[-0.05em] text-[#E83262]">
                            {item.last30Days.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 min-h-12 text-xs leading-5 text-[#6F7C8B]">{item.description}</p>
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
                    <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">Recent email events</p>
                    <p className="text-xs font-semibold text-[#9d7a55]">
                      Since {formatDate(overview?.authEmailTelemetry.since)}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-[#6F7C8B]">
                    Source: Supabase `auth.audit_log_entries`
                  </p>
                </div>
                <div className="divide-y divide-[#482b1a]/10">
                  {overview?.authEmailTelemetry.events.length ? (
                    overview.authEmailTelemetry.events.map((event) => (
                      <div key={event.id} className="grid gap-3 p-4 text-sm sm:grid-cols-[1.1fr_1fr_0.9fr] sm:items-center">
                        <div>
                          <p className="font-bold text-[#26364A]">{event.label}</p>
                          <p className="mt-1 text-xs text-[#6F7C8B]">{event.action}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-[#26364A]">{event.email || "Email not exposed in audit payload"}</p>
                          <p className="mt-1 truncate text-xs text-[#6F7C8B]">{event.userId || "User ID unavailable"}</p>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-semibold text-[#26364A]">{formatDate(event.createdAt)}</p>
                          <p className="mt-1 text-xs text-[#6F7C8B]">{event.ipAddress || "IP unavailable"}</p>
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
          <Card className="luxe-card rounded-[2rem] border-[#E83262]/24">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">member quality</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">
                    Profile review
                  </CardTitle>
                </div>
                <StatusBadge status={overview?.queues.profiles.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview?.queues.profiles.detail && (
                <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.queues.profiles.detail}
                </p>
              )}
              {filteredProfiles.length ? (
                filteredProfiles.map((profile) => (
                  <div key={profile.id} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">{profile.name}</p>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[#9d7a55]">
                          ID - {profile.publicId || "Pending"}
                        </p>
                        <p className="mt-1 text-sm text-[#6F7C8B]">
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
                    <div className="mt-4 grid gap-2 text-xs font-semibold text-[#6F7C8B] sm:grid-cols-3">
                      <span>{profile.completionSteps}/7 steps complete</span>
                      <span>{profile.photoCount} photos</span>
                      <span>{profile.createdBy ? `Created by ${profile.createdBy}` : "Creator pending"}</span>
                    </div>
                    <p className="mt-3 text-sm text-[#6F7C8B]">
                      {[profile.education, profile.jobTitle].filter(Boolean).join(" - ") || "Career and education pending"}
                    </p>
                    {profile.bio && <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6F7C8B]">{profile.bio}</p>}
                    {profile.flags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.flags.map((flag) => (
                          <Badge key={flag} variant="outline" className="border-[#E83262]/24 bg-[#E83262]/10 text-[#8a641f]">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {profile.reviewNotes && (
                      <p className="mt-3 rounded-2xl border border-[#482b1a]/10 bg-white/60 p-3 text-xs leading-5 text-[#6F7C8B]">
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
                        className="rounded-full border-[#E83262]/20 bg-[#E83262]/10 text-[#E83262]"
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

          <Card className="luxe-dark-card rounded-[2rem] border-[#E83262]/24 text-[#ffffff]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">identity queue</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#ffffff]">
                    Verifications
                  </CardTitle>
                </div>
                <StatusBadge status={overview?.queues.verifications.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview?.queues.verifications.detail && (
                <p className="rounded-2xl border border-[#E83262]/20 bg-white/8 p-3 text-sm font-semibold text-[#E83262]">
                  {overview.queues.verifications.detail}
                </p>
              )}
              {filteredVerifications.length ? (
                filteredVerifications.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#ffffff]">{item.profileName}</p>
                        <p className="mt-1 text-sm text-[#E83262]">
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
                        className="rounded-full border-[#E83262]/40 bg-white/10 text-[#ffffff] hover:bg-white/15"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("verification", item.id, "in_review")}
                      >
                        <UserRoundCheck className="mr-2 h-4 w-4" />
                        In review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#f3b2b2]/40 bg-[#E83262]/30 text-white hover:bg-[#E83262]/55"
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
          <Card className="luxe-card rounded-[2rem] border-[#E83262]/24">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">trust desk</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">Safety reports</CardTitle>
                </div>
                <StatusBadge status={overview?.queues.reports.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview?.queues.reports.detail && (
                <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.queues.reports.detail}
                </p>
              )}
              {filteredReports.length ? (
                filteredReports.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">
                          {item.reportedName}
                        </p>
                        <p className="mt-1 text-sm text-[#6F7C8B]">Reported by {item.reporterName}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-[#E83262]">{statusLabel(item.reason)}</p>
                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-[#6F7C8B]">
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
                        className="rounded-full border-[#E83262]/20 bg-[#E83262]/10 text-[#E83262]"
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
            <Card className="luxe-card rounded-[2rem] border-[#E83262]/24">
              <CardHeader>
                <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">Launch readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(overview?.readiness || []).map((item) => (
                  <div key={item.label} className="flex gap-3 rounded-2xl border border-[#482b1a]/10 bg-white/58 p-4">
                    {item.status === "ok" ? (
                      <BadgeCheck className="mt-1 h-5 w-5 shrink-0 text-[#E83262]" />
                    ) : (
                      <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-[#E83262]" />
                    )}
                    <div>
                      <p className="font-bold text-[#26364A]">{item.label}</p>
                      <p className="text-sm leading-6 text-[#6F7C8B]">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="luxe-card rounded-[2rem] border-[#E83262]/24">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="luxe-kicker mb-2 text-[#E83262]">audit trail</p>
                    <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">Action history</CardTitle>
                  </div>
                  <StatusBadge status={overview?.queues.audit.status || "pending"} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview?.queues.audit.detail && (
                  <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                    {overview.queues.audit.detail}
                  </p>
                )}
                {filteredAudit.length ? (
                  filteredAudit.map((item) => (
                    <div key={item.id} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[#26364A]">{statusLabel(item.action)}</p>
                          <p className="mt-1 text-sm text-[#6F7C8B]">
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
                      {item.notes && <p className="mt-3 text-sm leading-6 text-[#6F7C8B]">{item.notes}</p>}
                    </div>
                  ))
                ) : (
                  <EmptyState copy={searchTerm ? "No audit records match this admin search." : "No admin actions have been recorded yet."} />
                )}
              </CardContent>
            </Card>

            <Card className="luxe-dark-card rounded-[2rem] border-[#E83262]/24 text-[#ffffff]">
              <CardHeader>
                <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#ffffff]">Admin safety model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-[#E83262]">
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
                  <Activity className="mt-1 h-5 w-5 shrink-0 text-[#E83262]" />
                  <p>
                    This portal can update user access, profile review, verification, and report statuses only after Supabase login and ADMIN_EMAILS allowlist checks.
                  </p>
                </div>
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
                  <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#E83262]" />
                  <p>
                    Account deletion, bulk edits, refunds, payment-provider changes, and webhook automation stay locked
                    until those workflows get separate role gates and stronger confirmations.
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
