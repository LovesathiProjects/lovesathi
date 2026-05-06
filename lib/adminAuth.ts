import "server-only"

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export type AdminContext = {
  adminEmails: string[]
  supabase: SupabaseClient
  user: User
}

export type AdminAuthResult =
  | {
      context: AdminContext
      response?: never
    }
  | {
      context?: never
      response: NextResponse
    }

export function getAdminEmails() {
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

export async function requireAdmin(request: Request): Promise<AdminAuthResult> {
  const adminEmails = getAdminEmails()
  if (adminEmails.length === 0) {
    return {
      response: NextResponse.json(
        {
          error: "Admin access is not configured. Set ADMIN_EMAILS in production.",
        },
        { status: 503 },
      ),
    }
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return {
      response: NextResponse.json(
        {
          error: "Supabase admin environment variables are missing.",
        },
        { status: 503 },
      ),
    }
  }

  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return {
      response: NextResponse.json({ error: "Admin session required." }, { status: 401 }),
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)

  if (userError || !user?.email) {
    return {
      response: NextResponse.json({ error: "Invalid admin session." }, { status: 401 }),
    }
  }

  if (!adminEmails.includes(user.email.toLowerCase())) {
    return {
      response: NextResponse.json({ error: "This account is not allowed to access admin." }, { status: 403 }),
    }
  }

  return {
    context: {
      adminEmails,
      supabase,
      user,
    },
  }
}
