import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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

    const buckets = ["verification-documents", "face-scans", "matrimony-photos"]

    for (const bucket of buckets) {
      try {
        const { data: files, error: listError } = await supabaseAdmin.storage
          .from(bucket)
          .list(user.id, {
            limit: 1000,
            sortBy: { column: "name", order: "asc" },
          })

        if (listError) {
          console.warn(`Error listing files in ${bucket}:`, listError.message)
          continue
        }

        if (files && files.length > 0) {
          const filePaths = files.map((file) => `${user.id}/${file.name}`)
          const { error: deleteError } = await supabaseAdmin.storage.from(bucket).remove(filePaths)

          if (deleteError) {
            console.warn(`Error deleting files from ${bucket}:`, deleteError.message)
          }
        }
      } catch (bucketError: any) {
        console.warn(`Error processing bucket ${bucket}:`, bucketError.message)
      }
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
