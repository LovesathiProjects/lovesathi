import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

type PhoneOtpAction = "send" | "verify" | "widget_config" | "verify_widget";

type PhoneVerificationRow = {
  user_id: string;
  phone: string;
  verified_at: string | null;
  otp_hash: string | null;
  otp_expires_at: string | null;
  otp_sent_at: string | null;
  otp_attempts: number | null;
  otp_send_count: number | null;
  otp_send_window_started_at: string | null;
  otp_provider?: string | null;
  otp_provider_request_id?: string | null;
  otp_provider_status?: string | null;
  otp_provider_response?: string | null;
  otp_provider_updated_at?: string | null;
};

type Msg91SendResult = {
  provider: "msg91";
  requestId: string | null;
  status: "accepted" | "test_accepted";
  responseText: string;
};

type Msg91WidgetVerifyResult = {
  provider: "msg91_widget";
  requestId: string | null;
  status: "verified";
  responseText: string;
};

type FunctionError = {
  message: string;
  httpCode?: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 45;
const SEND_WINDOW_MINUTES = 60;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function functionError(message: string, httpCode = 500): FunctionError {
  return { message, httpCode };
}

function getEnv(name: string) {
  return Deno.env.get(name)?.trim() || "";
}

function getRequiredEnv(...names: string[]) {
  for (const name of names) {
    const value = getEnv(name);
    if (value) return value;
  }

  throw functionError(`${names[0]} is not configured`, 500);
}

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return trimmed.startsWith("+") ? `+${digits}` : `+${digits}`;
}

function getPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function validatePhone(value: string) {
  const digits = getPhoneDigits(value);
  if (!digits) throw functionError("Phone number is required.", 400);
  if (digits.length < 8 || digits.length > 15) {
    throw functionError("Please enter a valid phone number.", 400);
  }
}

function generateOtp() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

function parseTestOtpForPhone(phone: string) {
  const configured = getEnv("PHONE_OTP_TEST_NUMBERS");
  if (!configured) return null;

  const phoneDigits = getPhoneDigits(phone);
  for (const pair of configured.split(",")) {
    const [rawPhone, rawOtp] = pair.split("=").map((part) => part?.trim() || "");
    const otp = rawOtp.replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (getPhoneDigits(rawPhone) === phoneDigits && otp.length === OTP_LENGTH) {
      return otp;
    }
  }

  return null;
}

async function sha256(value: string) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashOtp(userId: string, phone: string, otp: string) {
  const pepper = getRequiredEnv("PHONE_OTP_PEPPER");
  return sha256(`${userId}:${phone}:${otp}:${pepper}`);
}

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function secondsAgo(seconds: number) {
  return new Date(Date.now() - seconds * 1000);
}

function isSamePhone(left?: string | null, right?: string | null) {
  const leftDigits = getPhoneDigits(left || "");
  const rightDigits = getPhoneDigits(right || "");
  return Boolean(leftDigits && rightDigits && leftDigits === rightDigits);
}

function shouldResetSendWindow(row?: PhoneVerificationRow | null) {
  if (!row?.otp_send_window_started_at) return true;
  return new Date(row.otp_send_window_started_at) < minutesAgo(SEND_WINDOW_MINUTES);
}

function parseMsg91Response(responseText: string) {
  try {
    const parsed = JSON.parse(responseText || "{}");
    return {
      type: String(parsed.type || parsed.status || "").toLowerCase(),
      message: String(parsed.message || parsed.error || parsed.errors || ""),
      requestId:
        String(parsed.request_id || parsed.requestId || parsed.message_uuid || parsed.message || "").trim() || null,
    };
  } catch {
    return { type: "", message: responseText, requestId: null };
  }
}

function getPayloadValue(payload: unknown, keys: string[]) {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function assertMsg91Accepted(response: Response, responseText: string) {
  const parsed = parseMsg91Response(responseText);
  if (!response.ok || parsed.type === "error" || parsed.type === "fail" || parsed.type === "failed") {
    throw functionError(`MSG91 rejected the OTP request: ${responseText || response.statusText}`, 502);
  }

  return parsed;
}

function isMsg91ObjectId(value: string) {
  return /^[a-f0-9]{24}$/i.test(value);
}

async function getUser(req: Request, anonClient: ReturnType<typeof createClient>) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    throw functionError("Please sign in before phone verification.", 401);
  }

  const {
    data: { user },
    error,
  } = await anonClient.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));

  if (error || !user) {
    throw functionError("Please sign in before phone verification.", 401);
  }

  return user;
}

async function sendViaMsg91(phone: string, otp: string) {
  const mobile = getPhoneDigits(phone);
  const authKey = getRequiredEnv("MSG91_AUTH_KEY");
  const templateId = getEnv("MSG91_OTP_TEMPLATE_ID");
  const senderId = getEnv("MSG91_SENDER_ID");
  const otpExpiryMinutes = getEnv("MSG91_OTP_EXPIRY_MINUTES") || String(OTP_TTL_MINUTES);

  if (templateId && isMsg91ObjectId(templateId)) {
    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("template_id", templateId);
    url.searchParams.set("mobile", mobile);
    url.searchParams.set("otp", otp);
    url.searchParams.set("otp_expiry", otpExpiryMinutes);
    url.searchParams.set("otp_length", String(OTP_LENGTH));
    url.searchParams.set("authkey", authKey);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        authkey: authKey,
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    const parsed = assertMsg91Accepted(response, responseText);

    return {
      provider: "msg91",
      requestId: parsed.requestId,
      status: "accepted",
      responseText: responseText.slice(0, 1200),
    } satisfies Msg91SendResult;
  }

  const messageTemplate =
    getEnv("MSG91_OTP_MESSAGE") ||
    "Your Lovesathi verification code is ##OTP##. Do not share it with anyone.";
  const url = new URL("https://api.msg91.com/api/sendotp.php");
  url.searchParams.set("authkey", authKey);
  url.searchParams.set("mobile", mobile);
  url.searchParams.set("message", messageTemplate.replace(/##OTP##/g, otp));
  url.searchParams.set("otp", otp);
  url.searchParams.set("otp_expiry", otpExpiryMinutes);
  url.searchParams.set("otp_length", String(OTP_LENGTH));
  if (senderId) {
    url.searchParams.set("sender", senderId);
  }

  const response = await fetch(url);
  const responseText = await response.text();
  const parsed = assertMsg91Accepted(response, responseText);

  return {
    provider: "msg91",
    requestId: parsed.requestId,
    status: "accepted",
    responseText: responseText.slice(0, 1200),
  } satisfies Msg91SendResult;
}

function getMsg91WidgetConfig() {
  const widgetId = getEnv("MSG91_WIDGET_ID");
  const tokenAuth = getEnv("MSG91_WIDGET_TOKEN_AUTH");

  return {
    enabled: Boolean(widgetId && tokenAuth),
    widgetId,
    tokenAuth,
  };
}

async function sendPhoneOtp(
  serviceClient: ReturnType<typeof createClient>,
  user: any,
  phone: string,
) {
  const { data: existingRow, error: fetchError } = await serviceClient
    .from("phone_verifications")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) throw functionError(fetchError.message, 500);

  const row = existingRow as PhoneVerificationRow | null;
  if (row?.verified_at && isSamePhone(row.phone, phone)) {
    return { phone, alreadyVerified: true, verifiedAt: row.verified_at };
  }

  if (row?.otp_sent_at && new Date(row.otp_sent_at) > secondsAgo(RESEND_COOLDOWN_SECONDS)) {
    throw functionError("Please wait a moment before requesting another phone code.", 429);
  }

  const resetWindow = shouldResetSendWindow(row);
  const sendCount = resetWindow ? 1 : Number(row?.otp_send_count || 0) + 1;
  if (sendCount > MAX_SENDS_PER_WINDOW) {
    throw functionError("Too many phone codes requested. Please try again later.", 429);
  }

  const testOtp = parseTestOtpForPhone(phone);
  const otp = testOtp || generateOtp();
  const otpHash = await hashOtp(user.id, phone, otp);
  const now = new Date().toISOString();

  const { error: upsertError } = await serviceClient
    .from("phone_verifications")
    .upsert(
      {
        user_id: user.id,
        phone,
        verified_at: null,
        otp_hash: otpHash,
        otp_expires_at: minutesFromNow(OTP_TTL_MINUTES),
        otp_sent_at: now,
        otp_attempts: 0,
        otp_send_count: sendCount,
        otp_send_window_started_at: resetWindow ? now : row?.otp_send_window_started_at || now,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );

  if (upsertError) throw functionError(upsertError.message, 500);

  try {
    const sendResult = testOtp
      ? ({
          provider: "msg91",
          requestId: "test-number",
          status: "test_accepted",
          responseText: "Configured test phone number accepted without external SMS delivery.",
        } satisfies Msg91SendResult)
      : await sendViaMsg91(phone, otp);
    await serviceClient
      .from("phone_verifications")
      .update({
        otp_provider: sendResult.provider,
        otp_provider_request_id: sendResult.requestId,
        otp_provider_status: sendResult.status,
        otp_provider_response: sendResult.responseText,
        otp_provider_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
  } catch (error) {
    await serviceClient
      .from("phone_verifications")
      .update({
        otp_provider: "msg91",
        otp_provider_status: "failed",
        otp_provider_response: error instanceof Error ? error.message.slice(0, 1200) : String((error as FunctionError).message || error).slice(0, 1200),
        otp_provider_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    throw error;
  }

  return { phone, alreadyVerified: false };
}

async function verifyPhoneOtp(
  serviceClient: ReturnType<typeof createClient>,
  user: any,
  phone: string,
  token: string,
) {
  if (!/^\d{6}$/.test(token)) {
    throw functionError("Please enter the complete 6-digit phone code.", 400);
  }

  const { data: row, error: fetchError } = await serviceClient
    .from("phone_verifications")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) throw functionError(fetchError.message, 500);

  const verification = row as PhoneVerificationRow | null;
  if (!verification || !isSamePhone(verification.phone, phone)) {
    throw functionError("Please request a fresh phone code for this number.", 400);
  }

  if (verification.verified_at && isSamePhone(verification.phone, phone)) {
    return { phone, verifiedAt: verification.verified_at };
  }

  if (!verification.otp_hash || !verification.otp_expires_at) {
    throw functionError("Please request a fresh phone code.", 400);
  }

  if (new Date(verification.otp_expires_at) < new Date()) {
    throw functionError("This phone code has expired. Please request a fresh code.", 400);
  }

  if (Number(verification.otp_attempts || 0) >= MAX_VERIFY_ATTEMPTS) {
    throw functionError("Too many incorrect attempts. Please request a fresh phone code.", 429);
  }

  const incomingHash = await hashOtp(user.id, phone, token);
  if (incomingHash !== verification.otp_hash) {
    await serviceClient
      .from("phone_verifications")
      .update({
        otp_attempts: Number(verification.otp_attempts || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    throw functionError("This phone code is invalid.", 400);
  }

  const verifiedAt = new Date().toISOString();
  const { error: updateError } = await serviceClient
    .from("phone_verifications")
    .update({
      phone,
      verified_at: verifiedAt,
      otp_hash: null,
      otp_expires_at: null,
      otp_attempts: 0,
      updated_at: verifiedAt,
    })
    .eq("user_id", user.id);

  if (updateError) throw functionError(updateError.message, 500);

  const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(user.id, {
    phone,
    phone_confirm: true,
    user_metadata: {
      ...(user.user_metadata || {}),
      phone,
    },
  });

  if (authUpdateError) {
    const message = authUpdateError.message || "Could not confirm this phone number.";
    throw functionError(
      message === "Error updating user"
        ? "Could not confirm this phone number in Supabase Auth. It may already be linked to another account."
        : message,
      500,
    );
  }

  await serviceClient
    .from("user_profiles")
    .update({
      phone,
      phone_verified_at: verifiedAt,
      updated_at: verifiedAt,
    })
    .eq("user_id", user.id);

  return { phone, verifiedAt };
}

async function verifyMsg91WidgetAccessToken(
  serviceClient: ReturnType<typeof createClient>,
  user: any,
  phone: string,
  accessToken: string,
) {
  const token = accessToken.trim();
  if (!token) {
    throw functionError("MSG91 verification token is missing. Please resend the phone code.", 400);
  }

  const authKey = getRequiredEnv("MSG91_AUTH_KEY");
  const response = await fetch("https://control.msg91.com/api/v5/widget/verifyAccessToken", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "authkey": authKey,
    },
    body: JSON.stringify({
      authkey: authKey,
      "access-token": token,
    }),
  });

  const responseText = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(responseText || "{}");
  } catch {
    parsed = {};
  }

  const status = getPayloadValue(parsed, ["type", "status"]).toLowerCase();
  const message = getPayloadValue(parsed, ["message", "mobile", "phone", "identifier", "number"]);
  const verifiedPhoneDigits = getPhoneDigits(message);
  const expectedPhoneDigits = getPhoneDigits(phone);

  if (!response.ok || status === "error" || status === "fail" || status === "failed") {
    throw functionError(`MSG91 could not verify this phone code: ${responseText || response.statusText}`, 502);
  }

  if (verifiedPhoneDigits && verifiedPhoneDigits !== expectedPhoneDigits) {
    throw functionError("MSG91 verified a different phone number. Please request a fresh code.", 400);
  }

  const verifiedAt = new Date().toISOString();
  const sendResult = {
    provider: "msg91_widget",
    requestId: getPayloadValue(parsed, ["request_id", "requestId", "reqId", "req_id"]) || null,
    status: "verified",
    responseText: responseText.slice(0, 1200),
  } satisfies Msg91WidgetVerifyResult;

  const { error: upsertError } = await serviceClient
    .from("phone_verifications")
    .upsert(
      {
        user_id: user.id,
        phone,
        verified_at: verifiedAt,
        otp_hash: null,
        otp_expires_at: null,
        otp_sent_at: verifiedAt,
        otp_attempts: 0,
        otp_provider: sendResult.provider,
        otp_provider_request_id: sendResult.requestId,
        otp_provider_status: sendResult.status,
        otp_provider_response: sendResult.responseText,
        otp_provider_updated_at: verifiedAt,
        updated_at: verifiedAt,
      },
      { onConflict: "user_id" },
    );

  if (upsertError) throw functionError(upsertError.message, 500);

  const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(user.id, {
    phone,
    phone_confirm: true,
    user_metadata: {
      ...(user.user_metadata || {}),
      phone,
    },
  });

  if (authUpdateError) {
    const message = authUpdateError.message || "Could not confirm this phone number.";
    throw functionError(
      message === "Error updating user"
        ? "Could not confirm this phone number in Supabase Auth. It may already be linked to another account."
        : message,
      500,
    );
  }

  await serviceClient
    .from("user_profiles")
    .update({
      phone,
      phone_verified_at: verifiedAt,
      updated_at: verifiedAt,
    })
    .eq("user_id", user.id);

  return { phone, verifiedAt };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL", "LOVESATHI_SUPABASE_URL");
    const anonKey = getRequiredEnv("SUPABASE_ANON_KEY", "LOVESATHI_SUPABASE_ANON_KEY");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", "LOVESATHI_SUPABASE_SERVICE_ROLE_KEY");
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const user = await getUser(req, anonClient);
    const body = await req.json();
    const action = String(body.action || "") as PhoneOtpAction;

    if (action === "widget_config") {
      const config = getMsg91WidgetConfig();
      return jsonResponse({
        success: true,
        enabled: config.enabled,
        widgetId: config.enabled ? config.widgetId : null,
        tokenAuth: config.enabled ? config.tokenAuth : null,
      });
    }

    const phone = normalizePhoneNumber(String(body.phone || ""));
    validatePhone(phone);

    if (action === "send") {
      const result = await sendPhoneOtp(serviceClient, user, phone);
      return jsonResponse({ success: true, ...result });
    }

    if (action === "verify") {
      const token = String(body.token || "").replace(/\D/g, "").slice(0, OTP_LENGTH);
      const result = await verifyPhoneOtp(serviceClient, user, phone, token);
      return jsonResponse({ success: true, ...result });
    }

    if (action === "verify_widget") {
      const accessToken = String(body.accessToken || body["access-token"] || "");
      const result = await verifyMsg91WidgetAccessToken(serviceClient, user, phone, accessToken);
      return jsonResponse({ success: true, ...result });
    }

    throw functionError("Unknown phone OTP action.", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : (error as FunctionError).message || "Phone OTP failed";
    const status = (error as FunctionError).httpCode || 500;
    console.error("Lovesathi phone OTP failed:", message);
    return jsonResponse({ success: false, error: message }, status);
  }
});
