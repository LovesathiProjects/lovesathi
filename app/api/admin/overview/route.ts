import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

type CountResult = {
  label: string
  value: number
  status: "ok" | "warning"
  detail?: string
}

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function safeCount(
  supabase: any,
  label: string,
  table: string,
  build?: (query: any) => any,
): Promise<CountResult> {
  try {
    let query = supabase.from(table).select("*", { count: "exact", head: true })
    if (build) {
      query = build(query)
    }
    const { count, error } = await query

    if (error) {
      return {
        label,
        value: 0,
        status: "warning",
        detail: error.message,
      }
    }

    return {
      label,
      value: count || 0,
      status: "ok",
    }
  } catch (error: any) {
    return {
      label,
      value: 0,
      status: "warning",
      detail: error?.message || "Unable to read table",
    }
  }
}

export async function GET(request: Request) {
  const adminEmails = getAdminEmails()
  if (adminEmails.length === 0) {
    return NextResponse.json(
      {
        error: "Admin access is not configured. Set ADMIN_EMAILS in production.",
      },
      { status: 503 },
    )
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json(
      {
        error: "Supabase admin environment variables are missing.",
      },
      { status: 503 },
    )
  }

  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: "Admin session required." }, { status: 401 })
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)

  if (userError || !user?.email) {
    return NextResponse.json({ error: "Invalid admin session." }, { status: 401 })
  }

  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "This account is not allowed to access admin." }, { status: 403 })
  }

  const metrics = await Promise.all([
    safeCount(supabase, "Registered users", "user_profiles"),
    safeCount(supabase, "Completed matrimony profiles", "matrimony_profile_full", (query) =>
      query.eq("profile_completed", true),
    ),
    safeCount(supabase, "Verification records", "id_verifications"),
    safeCount(supabase, "Reports submitted", "user_reports"),
    safeCount(supabase, "Active matches", "matrimony_matches", (query) => query.eq("is_active", true)),
    safeCount(supabase, "Messages", "messages"),
    safeCount(supabase, "Shortlisted profiles", "shortlists"),
  ])

  return NextResponse.json({
    admin: {
      email: user.email,
    },
    generatedAt: new Date().toISOString(),
    metrics,
    readiness: [
      {
        label: "Admin allowlist",
        status: "ok",
        detail: `${adminEmails.length} configured admin account${adminEmails.length === 1 ? "" : "s"}.`,
      },
      {
        label: "MSG91 email",
        status: "warning",
        detail: "DNS verification must be completed in MSG91 before password OTP email can work.",
      },
      {
        label: "Socket domain",
        status: "warning",
        detail: "Confirm socket.lovesathi.com DNS and Render custom domain before relying on live chat.",
      },
      {
        label: "Legal pages",
        status: "ok",
        detail: "Terms, privacy, safety, and contact pages are now part of the app shell.",
      },
    ],
  })
}
