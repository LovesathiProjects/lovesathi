import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Msg91EmailResponse = {
  message?: string;
  errors?: Record<string, string[]>;
  hasError?: boolean;
};

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedEmail) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const msg91ApiKey = process.env.MSG91_API_KEY;
    const msg91TemplateId = process.env.MSG91_FORGOT_PASSWORD_TEMPLATE_ID || process.env.MSG91_EMAIL_TEMPLATE_ID;
    const msg91Domain = process.env.MSG91_EMAIL_DOMAIN || "no-reply.lovesathi.com";
    const msg91FromEmail = process.env.MSG91_EMAIL_FROM || `dev@${msg91Domain}`;
    const msg91FromName = process.env.MSG91_EMAIL_FROM_NAME || "LoveSathi";

    if (!msg91ApiKey || !msg91TemplateId) {
      return NextResponse.json({ error: "Email service is not configured" }, { status: 500 });
    }

    const { data, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw new Error(usersError.message);
    const user = data?.users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const userName = user.user_metadata?.name || user.user_metadata?.full_name || normalizedEmail.split("@")[0];
    const otp = randomInt(1000, 9999).toString();

    const { error: otpError } = await supabaseAdmin
      .from("otp_codes")
      .insert({
        email: normalizedEmail,
        otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

    if (otpError) throw new Error(otpError.message);

    const msg91Response = await fetch("https://control.msg91.com/api/v5/email/send", {
      method: "POST",
      headers: {
        authkey: msg91ApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        recipients: [
          {
            to: [{ email: normalizedEmail }],
            variables: {
              name: userName,
              otp,
              OTP: otp,
            },
          },
        ],
        from: { email: msg91FromEmail, name: msg91FromName },
        domain: msg91Domain,
        template_id: msg91TemplateId,
      }),
    });

    const msg91Body = (await msg91Response.json().catch(() => ({}))) as Msg91EmailResponse;
    if (!msg91Response.ok || msg91Body.hasError) {
      console.error("MSG91 email send failed:", msg91Body);
      return NextResponse.json(
        { error: msg91Body.message || "Failed to send OTP email" },
        { status: 502 },
      );
    }

    return NextResponse.json({ message: "OTP sent to email" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
