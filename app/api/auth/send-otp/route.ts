import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Msg91EmailError, sendMsg91OtpEmail } from "@/lib/msg91Email";

export const dynamic = "force-dynamic";

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTPS_PER_HOUR = 5;
const GENERIC_SENT_MESSAGE = "If an account exists, we sent an OTP to that email.";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  let insertedOtpId: number | string | null = null;

  try {
    const { email } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const { data, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw new Error(usersError.message);
    const user = data?.users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);

    if (!user) {
      return NextResponse.json({ message: GENERIC_SENT_MESSAGE });
    }

    const cooldownSince = new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString();
    const { data: recentOtp, error: recentOtpError } = await supabaseAdmin
      .from("otp_codes")
      .select("id")
      .eq("email", normalizedEmail)
      .gte("created_at", cooldownSince)
      .limit(1);

    if (recentOtpError) throw new Error(recentOtpError.message);

    if ((recentOtp?.length || 0) > 0) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting another OTP." },
        { status: 429 },
      );
    }

    const hourSince = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: hourlyOtpError } = await supabaseAdmin
      .from("otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("email", normalizedEmail)
      .gte("created_at", hourSince);

    if (hourlyOtpError) throw new Error(hourlyOtpError.message);

    if ((count || 0) >= MAX_OTPS_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again after one hour." },
        { status: 429 },
      );
    }

    const userName = user.user_metadata?.name || user.user_metadata?.full_name || normalizedEmail.split("@")[0];
    const otp = randomInt(1000, 9999).toString();

    const { data: insertedOtp, error: otpError } = await supabaseAdmin
      .from("otp_codes")
      .insert({
        email: normalizedEmail,
        otp,
        expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      })
      .select("id")
      .single();

    if (otpError) throw new Error(otpError.message);
    insertedOtpId = insertedOtp?.id ?? null;

    await sendMsg91OtpEmail({ email: normalizedEmail, name: userName, otp });

    return NextResponse.json({ message: GENERIC_SENT_MESSAGE });
  } catch (e: any) {
    if (insertedOtpId) {
      await supabaseAdmin.from("otp_codes").delete().eq("id", insertedOtpId);
    }

    if (e instanceof Msg91EmailError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }

    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
