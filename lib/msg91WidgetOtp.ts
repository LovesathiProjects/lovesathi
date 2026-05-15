"use client"

export type Msg91WidgetConfig = {
  widgetId: string
  tokenAuth: string
}

type Msg91WidgetCallback = (payload: unknown) => void

type Msg91WidgetConfiguration = Msg91WidgetConfig & {
  identifier?: string
  exposeMethods: true
  captchaRendered?: string
  success: Msg91WidgetCallback
  failure: Msg91WidgetCallback
}

type Msg91WidgetWindow = Window &
  typeof globalThis & {
    initSendOTP?: (configuration: Msg91WidgetConfiguration) => void
    sendOtp?: (...args: unknown[]) => void
    sendOTP?: (...args: unknown[]) => void
    retryOtp?: (...args: unknown[]) => void
    retryOTP?: (...args: unknown[]) => void
    verifyOtp?: (...args: unknown[]) => void
    verifyOTP?: (...args: unknown[]) => void
    getWidgetData?: () => unknown
  }

const MSG91_SCRIPT_URLS = [
  "https://verify.msg91.com/otp-provider.js",
  "https://verify.phone91.com/otp-provider.js",
]

const METHOD_TIMEOUT_MS = 30000
const METHOD_READY_TIMEOUT_MS = 3000

let scriptPromise: Promise<void> | null = null
let initializedKey = ""

function getWidgetWindow() {
  if (typeof window === "undefined") {
    throw new Error("Phone verification is only available in the browser.")
  }

  return window as Msg91WidgetWindow
}

function getStringValue(payload: unknown, keys: string[]) {
  if (!payload || typeof payload !== "object") return ""
  const record = payload as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number") return String(value)
  }
  return ""
}

function getNestedStringValue(payload: unknown, keys: string[]) {
  const direct = getStringValue(payload, keys)
  if (direct) return direct

  if (!payload || typeof payload !== "object") return ""
  const data = (payload as Record<string, unknown>).data
  return getStringValue(data, keys)
}

function formatWidgetError(error: unknown) {
  if (!error) return "MSG91 could not process this phone code request."
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message
  if (typeof error === "object") {
    const message = getNestedStringValue(error, ["message", "error", "reason", "description"])
    if (message) return message
  }
  return "MSG91 could not process this phone code request."
}

function loadScriptUrl(url: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${url}"]`)
    if (existing) {
      if (getWidgetWindow().initSendOTP) {
        resolve()
        return
      }
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error(`Could not load ${url}`)), { once: true })
      return
    }

    const script = document.createElement("script")
    script.src = url
    script.async = true
    script.dataset.lovesathiMsg91Otp = "true"
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      reject(new Error(`Could not load ${url}`))
    }
    document.head.appendChild(script)
  })
}

async function loadMsg91Script() {
  const widgetWindow = getWidgetWindow()
  if (widgetWindow.initSendOTP) return

  if (!scriptPromise) {
    scriptPromise = MSG91_SCRIPT_URLS.reduce<Promise<void>>(
      (previous, url) => previous.catch(() => loadScriptUrl(url)),
      Promise.reject(new Error("MSG91 OTP script not loaded yet")),
    )
  }

  await scriptPromise
}

function waitForWidgetMethods() {
  const startedAt = Date.now()

  return new Promise<void>((resolve, reject) => {
    const tick = () => {
      const widgetWindow = getWidgetWindow()
      const hasSend = typeof (widgetWindow.sendOtp || widgetWindow.sendOTP) === "function"
      const hasVerify = typeof (widgetWindow.verifyOtp || widgetWindow.verifyOTP) === "function"

      if (hasSend && hasVerify) {
        resolve()
        return
      }

      if (Date.now() - startedAt > METHOD_READY_TIMEOUT_MS) {
        reject(new Error("MSG91 custom OTP methods did not become available."))
        return
      }

      window.setTimeout(tick, 100)
    }

    tick()
  })
}

export async function initializeMsg91WidgetOtp(config: Msg91WidgetConfig, phoneInput: string) {
  const identifier = phoneInput.replace(/\D/g, "")
  if (!identifier) throw new Error("Phone number is required.")

  await loadMsg91Script()

  const widgetWindow = getWidgetWindow()
  if (typeof widgetWindow.initSendOTP !== "function") {
    throw new Error("MSG91 OTP script is not ready.")
  }

  const nextKey = `${config.widgetId}:${config.tokenAuth}:${identifier}`
  if (initializedKey !== nextKey) {
    widgetWindow.initSendOTP({
      widgetId: config.widgetId,
      tokenAuth: config.tokenAuth,
      identifier,
      exposeMethods: true,
      captchaRendered: "lovesathi-phone-otp-captcha",
      success: () => undefined,
      failure: () => undefined,
    })
    initializedKey = nextKey
  }

  await waitForWidgetMethods()
}

function callWidgetMethod(run: (success: Msg91WidgetCallback, failure: Msg91WidgetCallback) => void) {
  return new Promise<unknown>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("MSG91 OTP request timed out. Please try again."))
    }, METHOD_TIMEOUT_MS)

    const success: Msg91WidgetCallback = (payload) => {
      window.clearTimeout(timeout)
      resolve(payload)
    }

    const failure: Msg91WidgetCallback = (error) => {
      window.clearTimeout(timeout)
      reject(new Error(formatWidgetError(error)))
    }

    try {
      run(success, failure)
    } catch (error) {
      window.clearTimeout(timeout)
      reject(error)
    }
  })
}

export function getMsg91WidgetRequestId(payload: unknown) {
  return getNestedStringValue(payload, ["reqId", "req_id", "requestId", "request_id", "message", "id"])
}

export function getMsg91WidgetAccessToken(payload: unknown) {
  return getNestedStringValue(payload, ["access-token", "accessToken", "access_token", "token", "jwt"])
}

export async function sendMsg91WidgetOtp(config: Msg91WidgetConfig, phoneInput: string) {
  const identifier = phoneInput.replace(/\D/g, "")
  await initializeMsg91WidgetOtp(config, phoneInput)

  const widgetWindow = getWidgetWindow()
  const sendOtp = widgetWindow.sendOtp || widgetWindow.sendOTP
  if (typeof sendOtp !== "function") {
    throw new Error("MSG91 send OTP method is not available.")
  }

  return callWidgetMethod((success, failure) => {
    sendOtp(identifier, success, failure)
  })
}

export async function retryMsg91WidgetOtp(config: Msg91WidgetConfig, phoneInput: string, requestId?: string) {
  await initializeMsg91WidgetOtp(config, phoneInput)

  const widgetWindow = getWidgetWindow()
  const retryOtp = widgetWindow.retryOtp || widgetWindow.retryOTP
  if (typeof retryOtp !== "function") {
    return sendMsg91WidgetOtp(config, phoneInput)
  }

  return callWidgetMethod((success, failure) => {
    retryOtp("11", success, failure, requestId)
  })
}

export async function verifyMsg91WidgetOtp(config: Msg91WidgetConfig, phoneInput: string, otp: string, requestId?: string) {
  await initializeMsg91WidgetOtp(config, phoneInput)

  const widgetWindow = getWidgetWindow()
  const verifyOtp = widgetWindow.verifyOtp || widgetWindow.verifyOTP
  if (typeof verifyOtp !== "function") {
    throw new Error("MSG91 verify OTP method is not available.")
  }

  return callWidgetMethod((success, failure) => {
    verifyOtp(otp, success, failure, requestId)
  })
}
