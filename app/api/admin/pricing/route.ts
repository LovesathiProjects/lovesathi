import { NextResponse } from "next/server"
import { writeAdminAuditLog } from "@/lib/adminAudit"
import { requireAdmin } from "@/lib/adminAuth"
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
const planIds = new Set<string>(SUBSCRIPTION_PLANS.map((plan) => plan.id))
const bannerStatuses = new Set(["draft", "published", "archived"])
const userDiscountStatuses = new Set(["active", "expired", "revoked"])

function validateId(value: unknown) {
  return typeof value === "string" && uuidPattern.test(value)
}

function cleanText(value: unknown, maxLength: number) {
  if (value === null) return null
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null
}

function cleanRequiredText(value: unknown, label: string, maxLength: number) {
  const text = cleanText(value, maxLength)
  if (!text) {
    throw new Error(`${label} is required.`)
  }
  return text
}

function cleanInteger(value: unknown, min: number, max: number, label: string) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${label} must be a number.`)
  }
  const rounded = Math.round(numberValue)
  if (rounded < min || rounded > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`)
  }
  return rounded
}

function cleanDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function cleanUrl(value: unknown) {
  const text = cleanText(value, 800)
  if (!text) return null
  try {
    const parsed = new URL(text)
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null
  } catch {
    return null
  }
}

function cleanPlanIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => planIds.has(item))
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (auth.response) {
    return auth.response
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const { supabase, user } = auth.context
  const type = typeof body.type === "string" ? body.type : ""

  if (type === "plan_pricing") {
    try {
      const planId = cleanRequiredText(body.planId, "Plan", 40)
      const basePlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === planId)
      if (!basePlan || !planIds.has(planId)) {
        return NextResponse.json({ error: "Invalid subscription plan." }, { status: 400 })
      }

      const priceAmount = cleanInteger(body.priceAmount, 1, 50_000_000, "Price amount")
      const priceLabel = cleanText(body.priceLabel, 40) || `INR ${priceAmount.toLocaleString("en-IN")}`
      const durationLabel = cleanText(body.durationLabel, 80) || basePlan.durationLabel
      const isActive = typeof body.isActive === "boolean" ? body.isActive : true

      const { data, error } = await supabase
        .from("lovesathi_plan_pricing")
        .upsert(
          {
            plan_id: planId,
            plan_name: basePlan.name,
            duration_label: durationLabel,
            duration_days: basePlan.durationDays,
            price_label: priceLabel,
            price_amount: priceAmount,
            currency: "INR",
            is_active: isActive,
            display_order: SUBSCRIPTION_PLANS.findIndex((plan) => plan.id === planId) * 10 + 10,
            updated_by: user.id,
          },
          { onConflict: "plan_id" },
        )
        .select("*")
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      await writeAdminAuditLog(supabase, {
        actorId: user.id,
        actorEmail: user.email || null,
        resource: "plan_pricing",
        recordId: null,
        previousStatus: null,
        nextStatus: "updated",
        notes: cleanText(body.notes, 500) || `${basePlan.name} price updated to ${priceLabel}.`,
        metadata: { planId, priceAmount, priceLabel },
      })

      return NextResponse.json({ ok: true, record: data })
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || "Unable to save plan price." }, { status: 400 })
    }
  }

  if (type === "discount_banner") {
    try {
      const id = cleanText(body.id, 60)
      if (id && !validateId(id)) {
        return NextResponse.json({ error: "A valid banner id is required." }, { status: 400 })
      }

      const status = bannerStatuses.has(body.status) ? body.status : "draft"
      const payload = {
        title: cleanRequiredText(body.title, "Banner title", 120),
        banner_text: cleanRequiredText(body.bannerText, "Banner text", 600),
        banner_image_url: cleanUrl(body.bannerImageUrl),
        discount_percent: cleanInteger(body.discountPercent, 0, 100, "Discount percentage"),
        plan_ids: cleanPlanIds(body.planIds),
        status,
        starts_at: cleanDate(body.startsAt),
        ends_at: cleanDate(body.endsAt),
        updated_by: user.id,
        ...(id ? {} : { created_by: user.id }),
      }

      const query = id
        ? supabase.from("lovesathi_discount_banners").update(payload).eq("id", id)
        : supabase.from("lovesathi_discount_banners").insert(payload)

      const { data, error } = await query.select("*").single()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      await writeAdminAuditLog(supabase, {
        actorId: user.id,
        actorEmail: user.email || null,
        resource: "discount_banner",
        recordId: data.id,
        previousStatus: null,
        nextStatus: status,
        notes: cleanText(body.notes, 500) || `${payload.title} discount banner saved.`,
        metadata: {
          discountPercent: payload.discount_percent,
          planIds: payload.plan_ids,
        },
      })

      return NextResponse.json({ ok: true, record: data })
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || "Unable to save discount banner." }, { status: 400 })
    }
  }

  if (type === "user_discount") {
    try {
      const id = cleanText(body.id, 60)
      if (id && !validateId(id)) {
        return NextResponse.json({ error: "A valid discount id is required." }, { status: 400 })
      }
      if (!validateId(body.userId)) {
        return NextResponse.json({ error: "A valid user id is required." }, { status: 400 })
      }

      const planId = cleanText(body.planId, 40)
      if (planId && !planIds.has(planId)) {
        return NextResponse.json({ error: "Invalid subscription plan." }, { status: 400 })
      }

      const status = userDiscountStatuses.has(body.status) ? body.status : "active"
      const payload = {
        user_id: body.userId,
        plan_id: planId,
        title: cleanText(body.title, 120) || "Private discount",
        discount_percent: cleanInteger(body.discountPercent, 1, 100, "Discount percentage"),
        notes: cleanText(body.notes, 800),
        status,
        starts_at: cleanDate(body.startsAt),
        ends_at: cleanDate(body.endsAt),
        updated_by: user.id,
        ...(id ? {} : { created_by: user.id }),
      }

      const query = id
        ? supabase.from("lovesathi_user_discounts").update(payload).eq("id", id)
        : supabase.from("lovesathi_user_discounts").insert(payload)

      const { data, error } = await query.select("*").single()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      await writeAdminAuditLog(supabase, {
        actorId: user.id,
        actorEmail: user.email || null,
        resource: "user_discount",
        recordId: data.id,
        previousStatus: null,
        nextStatus: status,
        notes: payload.notes || `${payload.title} granted by Lovesathi admin.`,
        metadata: {
          userId: payload.user_id,
          planId: payload.plan_id,
          discountPercent: payload.discount_percent,
        },
      })

      return NextResponse.json({ ok: true, record: data })
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || "Unable to save user discount." }, { status: 400 })
    }
  }

  return NextResponse.json({ error: "Unknown pricing action." }, { status: 400 })
}
