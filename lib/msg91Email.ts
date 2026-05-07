type Msg91EmailResponse = {
  message?: string
  errors?: Record<string, string[]>
  hasError?: boolean
}

type SendOtpEmailParams = {
  email: string
  name: string
  otp: string
}

export class Msg91EmailError extends Error {
  status: number

  constructor(message: string, status = 502) {
    super(message)
    this.name = "Msg91EmailError"
    this.status = status
  }
}

function getMsg91Config() {
  const apiKey = process.env.MSG91_API_KEY
  const templateId = process.env.MSG91_FORGOT_PASSWORD_TEMPLATE_ID || process.env.MSG91_EMAIL_TEMPLATE_ID
  const domain = process.env.MSG91_EMAIL_DOMAIN || "no-reply.lovesathi.com"
  const fromEmail = process.env.MSG91_EMAIL_FROM || `dev@${domain}`
  const fromName = process.env.MSG91_EMAIL_FROM_NAME || "LoveSathi"

  const missing = [
    !apiKey && "MSG91_API_KEY",
    !templateId && "MSG91_FORGOT_PASSWORD_TEMPLATE_ID or MSG91_EMAIL_TEMPLATE_ID",
  ].filter(Boolean)

  if (missing.length > 0) {
    throw new Msg91EmailError(`Email service is not configured: missing ${missing.join(", ")}`, 500)
  }

  return { apiKey, templateId, domain, fromEmail, fromName }
}

function getMsg91FailureMessage(body: Msg91EmailResponse) {
  const domainError = body.errors?.domain?.join(" ")
  if (domainError) {
    return `${domainError} Finish MSG91 domain DNS verification before sending OTP email.`
  }

  const firstFieldError = body.errors ? Object.values(body.errors).flat().find(Boolean) : null
  return firstFieldError || body.message || "Failed to send OTP email"
}

export async function sendMsg91OtpEmail({ email, name, otp }: SendOtpEmailParams) {
  const config = getMsg91Config()

  const response = await fetch("https://control.msg91.com/api/v5/email/send", {
    method: "POST",
    headers: {
      authkey: config.apiKey!,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      recipients: [
        {
          to: [{ email }],
          variables: {
            name,
            otp,
            OTP: otp,
          },
        },
      ],
      from: { email: config.fromEmail, name: config.fromName },
      domain: config.domain,
      template_id: config.templateId,
    }),
  })

  const body = (await response.json().catch(() => ({}))) as Msg91EmailResponse

  if (!response.ok || body.hasError) {
    throw new Msg91EmailError(getMsg91FailureMessage(body), response.status || 502)
  }

  return body
}
