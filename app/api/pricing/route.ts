import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { applyDiscountsToPlans, parsePriceAmount } from "@/lib/pricingDiscounts"
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans"

export const dynamic = "force-dynamic"

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
}

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function pricingResponse(payload: Record<string, unknown>) {
  return NextResponse.json(payload, { headers: noStoreHeaders })
}

function defaultPlans() {
  return SUBSCRIPTION_PLANS.map((plan, index) => ({
    planId: plan.id,
    planName: plan.name,
    durationLabel: plan.durationLabel,
    durationDays: plan.durationDays,
    priceLabel: plan.priceLabel,
    priceAmount: parsePriceAmount(plan.priceLabel),
    currency: "INR",
    isActive: true,
    displayOrder: index * 10 + 10,
  }))
}

function isWindowActive(row: any) {
  const now = Date.now()
  const startsAt = row?.starts_at ? new Date(row.starts_at).getTime() : null
  const endsAt = row?.ends_at ? new Date(row.ends_at).getTime() : null
  return (!startsAt || startsAt <= now) && (!endsAt || endsAt > now)
}

export async function GET(request: Request) {
  const supabase = createServiceClient()
  if (!supabase) {
    return pricingResponse({
      plans: applyDiscountsToPlans(defaultPlans(), []),
      banners: [],
      userDiscounts: [],
    })
  }

  const [{ data: planRows }, { data: bannerRows }] = await Promise.all([
    supabase
      .from("lovesathi_plan_pricing")
      .select("plan_id,plan_name,duration_label,duration_days,price_label,price_amount,currency,is_active,display_order,updated_at")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("lovesathi_discount_banners")
      .select("id,title,banner_text,banner_image_url,discount_percent,plan_ids,status,starts_at,ends_at,updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(8),
  ])

  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
  let userDiscounts: any[] = []

  if (token) {
    const {
      data: { user },
    } = await supabase.auth.getUser(token)

    if (user) {
      const { data } = await supabase
        .from("lovesathi_user_discounts")
        .select("id,user_id,plan_id,title,discount_percent,notes,status,starts_at,ends_at,updated_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(8)

      userDiscounts = (data || []).filter(isWindowActive).map((row) => ({
        id: row.id,
        planId: row.plan_id || null,
        title: row.title,
        discountPercent: row.discount_percent,
        notes: row.notes || null,
        startsAt: row.starts_at || null,
        endsAt: row.ends_at || null,
      }))
    }
  }

  const configuredPlans = (planRows || []).map((row: any) => ({
    planId: row.plan_id,
    planName: row.plan_name,
    durationLabel: row.duration_label,
    durationDays: row.duration_days,
    priceLabel: row.price_label,
    priceAmount: row.price_amount,
    currency: row.currency,
    isActive: Boolean(row.is_active),
    displayOrder: row.display_order,
  }))
  const plans = configuredPlans.length ? configuredPlans : defaultPlans()
  const banners = (bannerRows || []).filter(isWindowActive).map((row: any) => ({
    id: row.id,
    title: row.title,
    bannerText: row.banner_text || null,
    bannerImageUrl: row.banner_image_url || null,
    discountPercent: row.discount_percent,
    planIds: Array.isArray(row.plan_ids) ? row.plan_ids : [],
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
  }))

  return pricingResponse({
    plans: applyDiscountsToPlans(plans, banners, userDiscounts),
    banners,
    userDiscounts,
  })
}
