import assert from "node:assert/strict"
import { before, mock, test } from "node:test"

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://audit-placeholder.supabase.co"
process.env.SUPABASE_SERVICE_ROLE_KEY = "audit-placeholder-server-key"
let POST: typeof import("../app/api/events/register/route").POST
before(async () => { ({ POST } = await import("../app/api/events/register/route")) })

test("event registration rejects non-object JSON with 400 before querying Supabase", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected network call") })
  try {
    for (const body of [null, [], 42, "text"]) {
      const response = await POST(new Request("http://localhost/api/events/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }))
      assert.equal(response.status, 400)
    }
    assert.equal(fetch.mock.callCount(), 0)
  } finally { fetch.mock.restore() }
})
