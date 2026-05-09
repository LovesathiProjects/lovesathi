import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function isAuthorized(request: Request) {
  const secret = process.env.SUBSCRIPTION_MAINTENANCE_SECRET || process.env.CRON_SECRET
  if (!secret) return false

  const headerSecret = request.headers.get("x-cron-secret")
  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const querySecret = new URL(request.url).searchParams.get("secret")

  return headerSecret === secret || bearerToken === secret || querySecret === secret
}

async function runMaintenance(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Subscription maintenance secret is missing or invalid." }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase service credentials are not configured." }, { status: 503 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data, error } = await supabase.rpc("expire_lovesathi_past_due_entitlements")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    result: data,
    checkedAt: new Date().toISOString(),
  })
}

export async function GET(request: Request) {
  return runMaintenance(request)
}

export async function POST(request: Request) {
  return runMaintenance(request)
}

