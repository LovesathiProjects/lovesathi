"use client"

import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
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
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users,
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

type QueueResult<T> = {
  status: "ok" | "warning"
  detail?: string
  items: T[]
}

type AdminProfileItem = {
  id: string
  userId: string
  name: string
  age: number | null
  gender: string | null
  createdBy: string | null
  city: string | null
  education: string | null
  jobTitle: string | null
  photoCount: number
  completionSteps: number
  profileCompleted: boolean
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

type AuthEmailCount = {
  action: string
  label: string
  description: string
  total: number
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
  until: string | null
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
  queues: {
    profiles: QueueResult<AdminProfileItem>
    verifications: QueueResult<AdminVerificationItem>
    reports: QueueResult<AdminReportItem>
  }
  authEmailTelemetry: AuthEmailTelemetry
  readiness: ReadinessItem[]
}

const metricIcons = [Users, BadgeCheck, Clock3, ShieldCheck, FileWarning, Crown, MessageCircle, Database, Sparkles]

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function statusLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function StatusBadge({ status }: { status: string }) {
  const safeStatus = status.toLowerCase()
  const isGood = ["ok", "approved", "resolved"].includes(safeStatus)
  const isWarning = ["pending", "in_review", "reviewed", "warning"].includes(safeStatus)

  return (
    <Badge
      variant="outline"
      className={
        isGood
          ? "border-[#1b6b43]/20 bg-[#1b6b43]/10 text-[#1b6b43]"
          : isWarning
            ? "border-[#b9904d]/25 bg-[#b9904d]/12 text-[#8a641f]"
            : "border-[#8f001c]/20 bg-[#8f001c]/10 text-[#8f001c]"
      }
    >
      {statusLabel(status)}
    </Badge>
  )
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-[#482b1a]/18 bg-white/45 p-5 text-sm font-semibold text-[#6c5a4a]">
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

  const generatedAt = overview?.generatedAt ? formatDate(overview.generatedAt) : null
  const refreshing = loading && Boolean(sessionToken)
  const authEmailTotal =
    overview?.authEmailTelemetry.counts.reduce((total, item) => total + item.total, 0) || 0

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

  async function handleAction(resource: "verification" | "report", id: string, status: string) {
    if (!sessionToken) return
    const label = `${resource} as ${statusLabel(status)}`
    if (!window.confirm(`Mark this ${label}?`)) return

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
          notes:
            resource === "verification" && status === "rejected"
              ? "Rejected by Lovesathi admin review."
              : "Updated by Lovesathi admin review.",
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
        <div className="luxe-dark-card rounded-[2rem] p-8 text-center text-[#fffaf2]">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#d9b978] border-t-transparent" />
          <p className="mt-4 font-semibold">Opening admin portal...</p>
        </div>
      </main>
    )
  }

  if (!sessionToken) {
    return (
      <main className="luxe-page flex min-h-screen items-center justify-center px-4 py-10">
        <div className="luxe-orb left-[-8rem] top-16 h-80 w-80 bg-[#d9b978]/18" />
        <div className="luxe-orb right-[-9rem] top-10 h-96 w-96 bg-[#8f001c]/24" />
        <section className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2.5rem] border border-[#d9b978]/24 bg-white/8 shadow-2xl backdrop-blur-xl lg:grid-cols-[1fr_0.9fr]">
          <div className="hidden min-h-[38rem] flex-col justify-between p-10 text-[#fffaf2] lg:flex">
            <div>
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-[#fffaf2] text-[#8f001c] shadow-xl">
                <Lock className="h-7 w-7" />
              </div>
              <p className="luxe-kicker mb-4 text-[#d9b978]">admin.lovesathi.com</p>
              <h1 className="luxe-title max-w-lg text-7xl font-bold text-[#fffaf2]">
                Private command room for the Lovesathi team.
              </h1>
            </div>
            <p className="max-w-md text-lg leading-8 text-[#f2dfbd]">
              Review membership health, verification queues, safety reports, and launch readiness from one guarded portal.
            </p>
          </div>

          <div className="bg-[#fffaf2] p-6 sm:p-10">
            <div className="mb-8">
              <p className="luxe-kicker mb-3 text-[#8f001c]">secure access</p>
              <h2 className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#18110d]">Admin sign in</h2>
              <p className="mt-3 text-[#6c5a4a]">Use a Supabase account listed in the production ADMIN_EMAILS allowlist.</p>
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
      <header className="mx-auto mb-8 flex max-w-7xl flex-col gap-4 rounded-[2rem] border border-[#482b1a]/10 bg-[#fffaf2]/82 p-5 shadow-[0_24px_80px_rgba(24,17,13,0.1)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="luxe-kicker mb-2 text-[#8f001c]">Lovesathi admin</p>
          <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#18110d] sm:text-5xl">
            Operations command center
          </h1>
          <p className="mt-2 text-sm text-[#6c5a4a]">
            Signed in as {overview?.admin.email || "admin"} {generatedAt ? `- refreshed ${generatedAt}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {(overview?.metrics || []).map((metric, index) => {
            const Icon = metricIcons[index % metricIcons.length]
            return (
              <Card key={metric.label} className="luxe-card rounded-[1.6rem] border-[#d9b978]/24">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-bold text-[#6c5a4a]">{metric.label}</CardTitle>
                  <Icon className={metric.status === "ok" ? "h-5 w-5 text-[#8f001c]" : "h-5 w-5 text-[#b9904d]"} />
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
          <Card className="luxe-card overflow-hidden rounded-[2rem] border-[#d9b978]/24">
            <CardHeader className="border-b border-[#482b1a]/10 bg-white/50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#8f001c]">supabase email watch</p>
                  <CardTitle className="flex items-center gap-3 font-serif text-3xl tracking-[-0.04em] text-[#18110d] sm:text-4xl">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8f001c] text-[#fffaf2]">
                      <Mail className="h-5 w-5" />
                    </span>
                    Auth email telemetry
                  </CardTitle>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6c5a4a]">
                    Tracks Supabase Auth audit events for verification emails, password recovery links, repeated signups,
                    and invitations from the last 7 days.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={overview?.authEmailTelemetry.status || "pending"} />
                  <Badge variant="outline" className="rounded-full border-[#d9b978]/30 bg-[#fffaf2] px-4 py-2 text-[#8f001c]">
                    {authEmailTotal.toLocaleString("en-IN")} events
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-6">
              {overview?.authEmailTelemetry.detail && (
                <div className="rounded-[1.35rem] border border-[#b9904d]/20 bg-[#b9904d]/10 p-4 text-sm font-semibold leading-6 text-[#8a641f]">
                  {overview.authEmailTelemetry.detail}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {overview?.authEmailTelemetry.counts.length ? (
                  overview.authEmailTelemetry.counts.map((item) => (
                    <div key={item.action} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/66 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8f001c]">{item.label}</p>
                      <p className="mt-3 font-serif text-4xl font-bold tracking-[-0.05em] text-[#18110d]">
                        {item.total.toLocaleString("en-IN")}
                      </p>
                      <p className="mt-3 min-h-12 text-xs leading-5 text-[#6c5a4a]">{item.description}</p>
                      <p className="mt-3 text-xs font-semibold text-[#9d7a55]">Last seen {formatDate(item.lastSeen)}</p>
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-2 xl:col-span-5">
                    <EmptyState copy="No Supabase auth email events found in the last 7 days." />
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-[#482b1a]/10 bg-[#fffaf2]/70">
                <div className="flex flex-col gap-2 border-b border-[#482b1a]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#18110d]">Recent email events</p>
                    <p className="text-xs font-semibold text-[#9d7a55]">
                      Since {formatDate(overview?.authEmailTelemetry.since)}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-[#6c5a4a]">
                    Source: Supabase `auth.audit_log_entries`
                  </p>
                </div>
                <div className="divide-y divide-[#482b1a]/10">
                  {overview?.authEmailTelemetry.events.length ? (
                    overview.authEmailTelemetry.events.map((event) => (
                      <div key={event.id} className="grid gap-3 p-4 text-sm sm:grid-cols-[1.1fr_1fr_0.9fr] sm:items-center">
                        <div>
                          <p className="font-bold text-[#18110d]">{event.label}</p>
                          <p className="mt-1 text-xs text-[#6c5a4a]">{event.action}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-[#18110d]">{event.email || "Email not exposed in audit payload"}</p>
                          <p className="mt-1 truncate text-xs text-[#6c5a4a]">{event.userId || "User ID unavailable"}</p>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-semibold text-[#18110d]">{formatDate(event.createdAt)}</p>
                          <p className="mt-1 text-xs text-[#6c5a4a]">{event.ipAddress || "IP unavailable"}</p>
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
          <Card className="luxe-card rounded-[2rem] border-[#d9b978]/24">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#8f001c]">member quality</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#18110d]">
                    Latest profiles
                  </CardTitle>
                </div>
                <StatusBadge status={overview?.queues.profiles.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview?.queues.profiles.detail && (
                <p className="rounded-2xl border border-[#b9904d]/20 bg-[#b9904d]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.queues.profiles.detail}
                </p>
              )}
              {overview?.queues.profiles.items.length ? (
                overview.queues.profiles.items.map((profile) => (
                  <div key={profile.id} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#18110d]">{profile.name}</p>
                        <p className="mt-1 text-sm text-[#6c5a4a]">
                          {[profile.age ? `${profile.age} yrs` : null, profile.gender, profile.city].filter(Boolean).join(" - ") ||
                            "Profile details pending"}
                        </p>
                      </div>
                      <StatusBadge status={profile.profileCompleted ? "approved" : "pending"} />
                    </div>
                    <div className="mt-4 grid gap-2 text-xs font-semibold text-[#6c5a4a] sm:grid-cols-3">
                      <span>{profile.completionSteps}/7 steps complete</span>
                      <span>{profile.photoCount} photos</span>
                      <span>{profile.createdBy ? `Created by ${profile.createdBy}` : "Creator pending"}</span>
                    </div>
                    <p className="mt-3 text-sm text-[#6c5a4a]">
                      {[profile.education, profile.jobTitle].filter(Boolean).join(" - ") || "Career and education pending"}
                    </p>
                    <p className="mt-2 text-xs text-[#9d7a55]">Updated {formatDate(profile.updatedAt)}</p>
                  </div>
                ))
              ) : (
                <EmptyState copy="No matrimony profiles were returned yet." />
              )}
            </CardContent>
          </Card>

          <Card className="luxe-dark-card rounded-[2rem] border-[#d9b978]/24 text-[#fffaf2]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#d9b978]">identity queue</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#fffaf2]">
                    Verifications
                  </CardTitle>
                </div>
                <StatusBadge status={overview?.queues.verifications.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview?.queues.verifications.detail && (
                <p className="rounded-2xl border border-[#d9b978]/20 bg-white/8 p-3 text-sm font-semibold text-[#f2dfbd]">
                  {overview.queues.verifications.detail}
                </p>
              )}
              {overview?.queues.verifications.items.length ? (
                overview.queues.verifications.items.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#fffaf2]">{item.profileName}</p>
                        <p className="mt-1 text-sm text-[#f2dfbd]">
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
                        className="rounded-full border-[#d9b978]/40 bg-white/10 text-[#fffaf2] hover:bg-white/15"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("verification", item.id, "in_review")}
                      >
                        <UserRoundCheck className="mr-2 h-4 w-4" />
                        In review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#f3b2b2]/40 bg-[#8f001c]/30 text-[#fffaf2] hover:bg-[#8f001c]/45"
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
                <EmptyState copy="No pending identity verifications right now." />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="luxe-card rounded-[2rem] border-[#d9b978]/24">
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
                <p className="rounded-2xl border border-[#b9904d]/20 bg-[#b9904d]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.queues.reports.detail}
                </p>
              )}
              {overview?.queues.reports.items.length ? (
                overview.queues.reports.items.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#18110d]">
                          {item.reportedName}
                        </p>
                        <p className="mt-1 text-sm text-[#6c5a4a]">Reported by {item.reporterName}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-[#8f001c]">{statusLabel(item.reason)}</p>
                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-[#6c5a4a]">
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
                <EmptyState copy="No open safety reports right now." />
              )}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="luxe-card rounded-[2rem] border-[#d9b978]/24">
              <CardHeader>
                <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#18110d]">Launch readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(overview?.readiness || []).map((item) => (
                  <div key={item.label} className="flex gap-3 rounded-2xl border border-[#482b1a]/10 bg-white/58 p-4">
                    {item.status === "ok" ? (
                      <BadgeCheck className="mt-1 h-5 w-5 shrink-0 text-[#8f001c]" />
                    ) : (
                      <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-[#b9904d]" />
                    )}
                    <div>
                      <p className="font-bold text-[#18110d]">{item.label}</p>
                      <p className="text-sm leading-6 text-[#6c5a4a]">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="luxe-dark-card rounded-[2rem] border-[#d9b978]/24 text-[#fffaf2]">
              <CardHeader>
                <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#fffaf2]">Admin safety model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-[#f2dfbd]">
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
                  <Activity className="mt-1 h-5 w-5 shrink-0 text-[#d9b978]" />
                  <p>
                    This portal can update verification and report statuses only after Supabase login and ADMIN_EMAILS allowlist checks.
                  </p>
                </div>
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
                  <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#d9b978]" />
                  <p>
                    Account deletion, bulk edits, refunds, and subscription changes should stay locked until we add audit logs, roles, and confirmation workflows.
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
