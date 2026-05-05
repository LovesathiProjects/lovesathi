import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";


export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !otp)
      return NextResponse.json({ error: "Email & OTP required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("otp", otp)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !data)
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });

    if (new Date(data.expires_at) < new Date())
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });

    await supabaseAdmin
      .from("otp_codes")
      .update({ verified: true })
      .eq("id", data.id);

    return NextResponse.json({ message: "OTP verified" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
