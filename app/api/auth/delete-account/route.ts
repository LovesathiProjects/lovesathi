import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { deleteAccountStorage } from "@/lib/accountStorage"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ success: false, error: "Account deletion is not configured." }, { status: 503 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ success: false, error: "Signed-in session required." }, { status: 401 })
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Invalid or expired session." }, { status: 401 })
    }

    try {
      await deleteAccountStorage(supabaseAdmin, user.id)
    } catch (storageError) {
      console.error("Account upload cleanup failed:", storageError)
      return NextResponse.json(
        {
          success: false,
          error: "Some uploads could not be removed. Your account has not been deleted. Please retry or contact support.",
        },
        { status: 500 },
      )
    }

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to delete user account: ${deleteUserError.message}`,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Account and all associated data have been permanently deleted.",
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete account.",
      },
      { status: 500 },
    )
  }
}
