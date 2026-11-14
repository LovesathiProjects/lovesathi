import assert from "node:assert/strict"
import { before, mock, test } from "node:test"

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://audit-placeholder.supabase.co"
process.env.SUPABASE_SERVICE_ROLE_KEY = "audit-placeholder-server-key"
process.env.ADMIN_EMAILS = "admin@example.test"
const id = "11111111-1111-4111-8111-111111111111"
let GET: typeof import("../app/api/admin/verification-files/route").GET
before(async () => { ({ GET } = await import("../app/api/admin/verification-files/route")) })

test("private verification previews reject unauthenticated requests without fetching data", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected request") })
  try {
    const response = await GET(new Request(`http://localhost/api/admin/verification-files?id=${id}`))
    assert.equal(response.status, 401)
    assert.equal(fetch.mock.callCount(), 0)
  } finally { fetch.mock.restore() }
})

for (const scenario of ["non-admin", "admin", "foreign-file"] as const) {
  test(`verification preview authorization: ${scenario}`, async () => {
    const calls: string[] = []
    const fetch = mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)
      const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } })
      if (url.endsWith("/auth/v1/user")) return json({ id, email: scenario === "non-admin" ? "member@example.test" : "admin@example.test", app_metadata: {}, user_metadata: {} })
      if (url.includes("/rest/v1/id_verifications")) return json([{
        user_id: id,
        document_file_url: scenario === "foreign-file" ? "another-user/id.pdf" : `supabase://verification-documents/${id}/id.pdf`,
        face_scan_url: `supabase://face-scans/${id}/selfie.jpg`,
      }])
      if (url.includes("/storage/v1/object/sign/")) {
        assert.equal(JSON.parse(String(init?.body)).expiresIn, 60)
        return json({ signedURL: `/object/sign/fixture?token=test-only` })
      }
      throw new Error("Unexpected request")
    })
    try {
      const response = await GET(new Request(`http://localhost/api/admin/verification-files?id=${id}`, { headers: { Authorization: "Bearer test-session" } }))
      assert.equal(response.status, scenario === "admin" ? 200 : scenario === "non-admin" ? 403 : 409)
      if (scenario === "admin") {
        const result = await response.json()
        assert.equal(result.expiresIn, 60)
        assert.ok(result.documentUrl)
        assert.ok(result.faceScanUrl)
        assert.equal(response.headers.get("cache-control"), "private, no-store")
        assert.equal(calls.filter((url) => url.includes("/storage/v1/object/sign/")).length, 2)
      } else {
        assert.equal(calls.filter((url) => url.includes("/storage/v1/")).length, 0)
        if (scenario === "non-admin") assert.equal(calls.length, 1)
      }
    } finally { fetch.mock.restore() }
  })
}
