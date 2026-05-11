import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { normalizePhoneNumber, phonesMatch } from "@/lib/phone"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const PHONE_OTP_LENGTH = 6

function normalizePhoneOtpCode(value: string) {
  return value.replace(/\D/g, "").slice(0, PHONE_OTP_LENGTH)
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const authorization = request.headers.get("authorization")

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 })
    }

    if (!authorization) {
      return NextResponse.json({ error: "Please sign in before phone verification." }, { status: 401 })
    }

    const { phone: rawPhone, token: rawToken } = await request.json()
    const phone = normalizePhoneNumber(String(rawPhone || ""))
    const token = normalizePhoneOtpCode(String(rawToken || ""))

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 })
    }

    if (token.length !== PHONE_OTP_LENGTH) {
      return NextResponse.json({ error: "Please enter the complete 6-digit phone code." }, { status: 400 })
    }

    const authedSupabase = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    })

    const {
      data: { user: currentUser },
      error: currentUserError,
    } = await authedSupabase.auth.getUser()

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: "Please sign in before phone verification." }, { status: 401 })
    }

    const { data, error } = await authedSupabase.auth.verifyOtp({
      phone,
      token,
      type: "phone_change",
    })

    if (error) {
      return NextResponse.json({ error: error.message || "This phone code is invalid or expired." }, { status: 400 })
    }

    if (data.user?.id && data.user.id !== currentUser.id) {
      return NextResponse.json({ error: "Phone verification did not match the current account." }, { status: 409 })
    }

    const verifiedAt = data.user?.phone_confirmed_at || new Date().toISOString()
    const verifiedPhone = normalizePhoneNumber(String(data.user?.phone || phone))

    if (!phonesMatch(verifiedPhone, phone)) {
      return NextResponse.json({ error: "Phone verification did not match the requested number." }, { status: 409 })
    }

    const { error: recordError } = await supabaseAdmin
      .from("phone_verifications")
      .upsert(
        {
          user_id: currentUser.id,
          phone: verifiedPhone,
          verified_at: verifiedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )

    if (recordError) {
      return NextResponse.json({ error: recordError.message || "Could not save phone verification." }, { status: 500 })
    }

    await supabaseAdmin
      .from("user_profiles")
      .update({
        phone: verifiedPhone,
        phone_verified_at: verifiedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", currentUser.id)

    return NextResponse.json({
      success: true,
      phone: verifiedPhone,
      verifiedAt,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Could not verify phone code." }, { status: 500 })
  }
}
