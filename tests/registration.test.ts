import assert from "node:assert/strict"
import { test } from "node:test"
import type { SupabaseClient } from "@supabase/supabase-js"
import { isCompleteEmailOtp, normalizeEmailOtp, verifyEmailCode } from "../lib/emailOtp"
import * as nativeOtp from "../mobile/src/lib/authHelpers"
import {
  EMAIL_VERIFICATION_STORAGE_KEY, getEmailVerificationRedirectUrl,
  getVerificationStorageItem, setVerificationStorageItem, removeVerificationStorageItem,
} from "../lib/authRedirects"

test("web and Android preserve 6, 8 and 10 digit email codes", () => {
  for (const code of ["123456", "12345678", "1234567890"]) {
    assert.equal(normalizeEmailOtp(code), code)
    assert.equal(nativeOtp.normalizeEmailOtp(code), code)
    assert.equal(isCompleteEmailOtp(code), true)
    assert.equal(nativeOtp.isCompleteEmailOtp(code), true)
  }
  assert.equal(normalizeEmailOtp("1234 5678"), "12345678")
  for (const code of ["", "12345", "12345678901", "12345a"]) {
    assert.equal(isCompleteEmailOtp(code), false)
    assert.equal(nativeOtp.isCompleteEmailOtp(code), false)
  }
})

test("verification submits the complete email code once and returns the established session", async () => {
  const calls: unknown[] = []
  const data = { user: { id: "member" }, session: { access_token: "synthetic-session" } }
  const client = { auth: { async verifyOtp(input: unknown) { calls.push(input); return { data, error: null } } } } as unknown as SupabaseClient
  assert.equal(await verifyEmailCode(client, " MEMBER@example.test ", "1234 5678"), data)
  assert.deepEqual(calls, [{ email: "member@example.test", token: "12345678", type: "email" }])
})

test("a rejected email code is not retried under a second OTP type", async () => {
  let calls = 0
  const client = { auth: { async verifyOtp() { calls++; return { data: {}, error: new Error("Rate limit reached") } } } } as unknown as SupabaseClient
  await assert.rejects(verifyEmailCode(client, "member@example.test", "123456"), /Rate limit reached/)
  assert.equal(calls, 1)
})

test("verification without a session or user cannot report success", async () => {
  for (const data of [{ user: { id: "member" }, session: null }, { user: null, session: {} }]) {
    const client = { auth: { async verifyOtp() { return { data, error: null } } } } as unknown as SupabaseClient
    await assert.rejects(verifyEmailCode(client, "member@example.test", "123456"), /session could not be established/)
  }
})

test("blocked session storage still retains pending email for client navigation", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window")
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    get sessionStorage() { throw new Error("Storage access denied") },
  } })
  try {
    setVerificationStorageItem(EMAIL_VERIFICATION_STORAGE_KEY, "member@example.test")
    assert.equal(getVerificationStorageItem(EMAIL_VERIFICATION_STORAGE_KEY), "member@example.test")
    removeVerificationStorageItem(EMAIL_VERIFICATION_STORAGE_KEY)
    assert.equal(getVerificationStorageItem(EMAIL_VERIFICATION_STORAGE_KEY), null)
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous)
    else Reflect.deleteProperty(globalThis, "window")
  }
})

test("email confirmation returns to the browser origin holding its PKCE verifier", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window")
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { origin: "https://www.lovesathi.com" } } })
  process.env.NEXT_PUBLIC_SITE_URL = "https://lovesathi.com"
  try {
    assert.equal(getEmailVerificationRedirectUrl(), "https://www.lovesathi.com/auth/callback?next=%2Fonboarding%2Fverification")
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous)
    else Reflect.deleteProperty(globalThis, "window")
    if (configured === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = configured
  }
})

test("failed storage writes cannot restore an older account's pending email", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window")
  Object.defineProperty(globalThis, "window", { configurable: true, value: { sessionStorage: {
    getItem() { return "old-account@example.test" },
    setItem() { throw new Error("Quota exceeded") },
    removeItem() { throw new Error("Storage access denied") },
  } } })
  try {
    setVerificationStorageItem(EMAIL_VERIFICATION_STORAGE_KEY, "new-account@example.test")
    assert.equal(getVerificationStorageItem(EMAIL_VERIFICATION_STORAGE_KEY), "new-account@example.test")
    removeVerificationStorageItem(EMAIL_VERIFICATION_STORAGE_KEY)
    assert.equal(getVerificationStorageItem(EMAIL_VERIFICATION_STORAGE_KEY), null)
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous)
    else Reflect.deleteProperty(globalThis, "window")
  }
})
