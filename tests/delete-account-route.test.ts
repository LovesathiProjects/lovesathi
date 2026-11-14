import assert from "node:assert/strict"
import { before, mock, test } from "node:test"
import { NextRequest } from "next/server"

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://audit-placeholder.supabase.co"
process.env.SUPABASE_SERVICE_ROLE_KEY = "audit-placeholder-server-key"
let POST: typeof import("../app/api/auth/delete-account/route").POST
before(async () => { ({ POST } = await import("../app/api/auth/delete-account/route")) })
const id = "11111111-1111-4111-8111-111111111111"

test("account deletion rejects requests without a session before contacting Supabase", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected request") })
  try {
    const response = await POST(new NextRequest("http://localhost/api/auth/delete-account", { method: "POST" }))
    assert.equal(response.status, 401)
    assert.equal(fetch.mock.callCount(), 0)
  } finally { fetch.mock.restore() }
})

for (const failCleanup of [true, false]) {
  test(`account deletion ${failCleanup ? "keeps auth account when cleanup fails" : "deletes auth only after cleanup succeeds"}`, async () => {
    const calls: string[] = []
    const log = mock.method(console, "error", () => {})
    const fetch = mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      calls.push(`${init?.method || "GET"} ${url}`)
      const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
        status, headers: { "Content-Type": "application/json" },
      })
      if (url.endsWith("/auth/v1/user")) return json({ id, email: "test@example.test", app_metadata: {}, user_metadata: {} })
      if (url.includes("/storage/v1/object/list/")) {
        return failCleanup ? json({ message: "Storage unavailable", statusCode: "400" }, 400) : json([])
      }
      if (url.endsWith(`/auth/v1/admin/users/${id}`)) return json({ id })
      throw new Error(`Unexpected request: ${url}`)
    })
    try {
      const response = await POST(new NextRequest("http://localhost/api/auth/delete-account", {
        method: "POST", headers: { Authorization: "Bearer audit-test-session" },
      }))
      assert.equal(response.status, failCleanup ? 500 : 200)
      assert.equal((await response.json()).success, !failCleanup)
      assert.equal(calls.some((call) => call.startsWith("DELETE ")), !failCleanup)
      if (!failCleanup) {
        assert.equal(calls.filter((call) => call.includes("/storage/v1/object/list/")).length, 3)
        assert.ok(calls.at(-1)?.includes(`/auth/v1/admin/users/${id}`))
      }
    } finally { fetch.mock.restore(); log.mock.restore() }
  })
}
