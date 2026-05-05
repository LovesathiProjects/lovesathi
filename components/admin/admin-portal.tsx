"use client"

import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Crown,
  Database,
  Lock,
  LogOut,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react"
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

type AdminOverview = {
  admin: {
    email: string
  }
  generatedAt: string
  metrics: AdminMetric[]
  readiness: ReadinessItem[]
}

const metricIcons = [Users, BadgeCheck, ShieldCheck, AlertTriangle, Crown, MessageCircle, Database]

export function AdminPortal() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [overview, setOverview] = useState<AdminOverview | null>(null)

  const generatedAt = overview?.generatedAt
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(overview.generatedAt))
    : null

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
        setOverview(payload)
      } catch (err: any) {
        setError(err.message || "Unable to load admin overview")
      } finally {
        setLoading(false)
      }
    }

    void loadOverview()
  }, [sessionToken])

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
                Command center for a premium matrimony brand.
              </h1>
            </div>
            <p className="max-w-md text-lg leading-8 text-[#f2dfbd]">
              Review users, safety, verification, messages, reports, and launch readiness from a secure allowlisted portal.
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
      <header className="mx-auto mb-8 flex max-w-7xl flex-col gap-4 rounded-[2rem] border border-[#482b1a]/10 bg-[#fffaf2]/78 p-5 shadow-[0_24px_80px_rgba(24,17,13,0.1)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="luxe-kicker mb-2 text-[#8f001c]">Lovesathi admin</p>
          <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#18110d] sm:text-5xl">
            Operations overview
          </h1>
          <p className="mt-2 text-sm text-[#6c5a4a]">
            Signed in as {overview?.admin.email || "admin"} {generatedAt ? `- refreshed ${generatedAt}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full border-[#482b1a]/15 bg-white">
            <Link href="/">
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
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
              <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#fffaf2]">Admin scope</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-[#f2dfbd]">
              <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
                <Activity className="mt-1 h-5 w-5 shrink-0 text-[#d9b978]" />
                <p>
                  This first portal is read-only and safe by default. It gives leadership a polished production command center without risking accidental data changes.
                </p>
              </div>
              <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
                <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#d9b978]" />
                <p>
                  Destructive admin actions should be added later behind confirmation dialogs, audit logs, and role-based permissions.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
