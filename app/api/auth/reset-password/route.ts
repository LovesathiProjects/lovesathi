import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // ✅ Verify that OTP was verified before allowing password reset
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("verified", true)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return NextResponse.json({ error: "Please verify OTP first" }, { status: 400 });
    }

    // Check if OTP is still valid (within 10 minutes)
    const otpAge = Date.now() - new Date(otpData.created_at).getTime();
    if (otpAge > 10 * 60 * 1000) {
      return NextResponse.json({ error: "OTP verification expired, please request a new one" }, { status: 400 });
    }

    // ✅ Find the user by email
    const { data: userData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw new Error(usersError.message);

    const user = userData?.users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ Update password using Supabase Auth Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      throw new Error(updateError.message);
    }

    // ✅ Invalidate the OTP after successful password reset
    await supabaseAdmin
      .from("otp_codes")
      .update({ verified: false })
      .eq("id", otpData.id);

    return NextResponse.json({ 
      message: "Password reset successful",
      success: true 
    });

  } catch (e: any) {
    console.error("Reset password error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
