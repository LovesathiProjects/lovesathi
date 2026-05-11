import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type SendSmsHookPayload = {
  user?: {
    phone?: string | null;
    phone_change?: string | null;
  } | null;
  sms?: {
    otp?: string | null;
  } | null;
};

type HookError = {
  message: string;
  httpCode?: number;
};

const jsonHeaders = { "Content-Type": "application/json" };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function hookError(message: string, httpCode = 500): HookError {
  return { message, httpCode };
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw hookError(`${name} is not configured`, 500);
  }
  return value;
}

function getFirstWebhookSecret(value: string) {
  const firstSecret = value.split("|")[0]?.trim() ?? "";
  const versionless = firstSecret.includes(",") ? firstSecret.split(",").at(-1) ?? "" : firstSecret;
  return versionless.replace(/^whsec_/, "");
}

function normalizeMobile(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits || digits.length < 8) {
    throw hookError("Invalid phone number in Send SMS hook payload", 400);
  }
  return digits;
}

function maskMobile(mobile: string) {
  if (mobile.length <= 4) return "****";
  return `${mobile.slice(0, 2)}******${mobile.slice(-2)}`;
}

function getPhone(payload: SendSmsHookPayload) {
  return payload.user?.phone_change || payload.user?.phone || "";
}

function getOtp(payload: SendSmsHookPayload) {
  return payload.sms?.otp || "";
}

async function sendViaMsg91(mobile: string, otp: string) {
  const authKey = getRequiredEnv("MSG91_AUTH_KEY");
  const templateId = Deno.env.get("MSG91_OTP_TEMPLATE_ID")?.trim();
  const senderId = Deno.env.get("MSG91_SENDER_ID")?.trim();
  const otpExpiryMinutes = Deno.env.get("MSG91_OTP_EXPIRY_MINUTES")?.trim() || "10";
  const otpLength = String(otp.length || 6);

  if (templateId) {
    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("template_id", templateId);
    url.searchParams.set("mobile", mobile);
    url.searchParams.set("otp", otp);
    url.searchParams.set("otp_expiry", otpExpiryMinutes);
    url.searchParams.set("otp_length", otpLength);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        authkey: authKey,
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw hookError(`MSG91 rejected the OTP request: ${responseText || response.statusText}`, 502);
    }

    return responseText;
  }

  const messageTemplate =
    Deno.env.get("MSG91_OTP_MESSAGE")?.trim() ||
    "Your Lovesathi verification code is ##OTP##. Do not share it with anyone.";
  const message = messageTemplate.replace(/##OTP##/g, otp);
  const url = new URL("https://api.msg91.com/api/sendotp.php");
  url.searchParams.set("authkey", authKey);
  url.searchParams.set("mobile", mobile);
  url.searchParams.set("message", message);
  url.searchParams.set("otp", otp);
  url.searchParams.set("otp_expiry", otpExpiryMinutes);
  url.searchParams.set("otp_length", otpLength);
  if (senderId) {
    url.searchParams.set("sender", senderId);
  }

  const response = await fetch(url);
  const responseText = await response.text();
  if (!response.ok || /"type"\s*:\s*"error"/i.test(responseText)) {
    throw hookError(`MSG91 rejected the OTP request: ${responseText || response.statusText}`, 502);
  }

  return responseText;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: { message: "Method not allowed" } }, 405);
  }

  try {
    const webhookSecret = getRequiredEnv("SEND_SMS_HOOK_SECRET");
    const rawPayload = await req.text();
    const wh = new Webhook(getFirstWebhookSecret(webhookSecret));
    const payload = wh.verify(rawPayload, Object.fromEntries(req.headers)) as SendSmsHookPayload;

    const otp = getOtp(payload);
    if (!otp) {
      throw hookError("OTP missing in Send SMS hook payload", 400);
    }

    const mobile = normalizeMobile(getPhone(payload));
    await sendViaMsg91(mobile, otp);

    console.log(`Lovesathi phone OTP sent through MSG91 to ${maskMobile(mobile)}`);
    return jsonResponse({});
  } catch (error) {
    const message = error instanceof Error ? error.message : (error as HookError).message || "SMS hook failed";
    const status = (error as HookError).httpCode || 500;
    console.error("Lovesathi Send SMS hook failed:", message);

    return jsonResponse(
      {
        error: {
          http_code: status,
          message,
        },
      },
      status,
    );
  }
});
