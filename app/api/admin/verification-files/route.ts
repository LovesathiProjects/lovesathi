import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { signVerificationFiles, VERIFICATION_PREVIEW_SECONDS } from "@/lib/verificationFiles"

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response

  const id = new URL(request.url).searchParams.get("id")
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "A valid verification id is required." }, { status: 400 })
  }
  const { data, error } = await auth.context.supabase.from("id_verifications")
    .select("user_id,document_file_url,face_scan_url").eq("id", id).maybeSingle()
  if (error) return NextResponse.json({ error: "Unable to load verification files." }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Verification not found." }, { status: 404 })

  try {
    const files = await signVerificationFiles(auth.context.supabase, data, process.env.NEXT_PUBLIC_SUPABASE_URL!)
    return NextResponse.json({ ...files, expiresIn: VERIFICATION_PREVIEW_SECONDS }, {
      headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    })
  } catch {
    return NextResponse.json({ error: "The uploaded files could not be opened. Please retry or request a new submission." }, { status: 409 })
  }
}
