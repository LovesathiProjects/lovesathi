import assert from "node:assert/strict"
import { before, mock, test } from "node:test"
import { validateProfilePhoto, validateSavedProfilePhotos } from "../lib/profilePhotos"

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://audit-placeholder.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "audit-placeholder-public-key"
let supabase: typeof import("../lib/supabaseClient").supabase
let uploadAsset: typeof import("../lib/matrimonyService").uploadAsset
let saveStep1: typeof import("../lib/matrimonyService").saveStep1
before(async () => {
  ;({ supabase } = await import("../lib/supabaseClient"))
  ;({ uploadAsset, saveStep1 } = await import("../lib/matrimonyService"))
})

const photo = () => new File([new Uint8Array([255, 216, 255])], "portrait.wrong-extension", { type: "image/jpeg" })
const profile = { name: "Test Member", age: 25, gender: "Female" as const, createdBy: "Self" as const,
  photoUrls: ["https://example.test/one.jpg", "https://example.test/two.jpg"] }

test("a storage rejection is an error, never a successful temporary preview", async () => {
  const auth = mock.method(supabase.auth, "getUser", async () => ({ data: { user: { id: "member" } }, error: null }) as any)
  const from = mock.method(supabase.storage, "from", (() => ({ upload: async () => ({ data: null, error: { message: "row-level security policy" } }) })) as any)
  const preview = mock.method(URL, "createObjectURL", () => { throw new Error("Preview fallback must not run") })
  try {
    await assert.rejects(uploadAsset(photo()), /Photo upload failed: row-level security policy/)
    assert.equal(preview.mock.callCount(), 0)
  } finally { auth.mock.restore(); from.mock.restore(); preview.mock.restore() }
})

test("unauthenticated uploads never reach storage", async () => {
  const auth = mock.method(supabase.auth, "getUser", async () => ({ data: { user: null }, error: null }) as any)
  const from = mock.method(supabase.storage, "from", () => { throw new Error("Unexpected storage call") })
  try {
    await assert.rejects(uploadAsset(photo()), /sign in again/)
    assert.equal(from.mock.callCount(), 0)
  } finally { auth.mock.restore(); from.mock.restore() }
})

test("successful uploads use unique owner paths, explicit MIME, and the returned storage path", async () => {
  const paths: string[] = []
  const auth = mock.method(supabase.auth, "getUser", async () => ({ data: { user: { id: "member" } }, error: null }) as any)
  const from = mock.method(supabase.storage, "from", ((bucket: string) => {
    assert.equal(bucket, "matrimony-photos")
    return {
      async upload(path: string, body: File, options: { contentType: string; upsert: boolean }) {
        paths.push(path)
        assert.match(path, /^member\/[a-f0-9-]+\.jpg$/)
        assert.equal(body.type, "image/jpeg")
        assert.equal(options.contentType, body.type)
        assert.equal(options.upsert, false)
        return { data: { path: `stored/${path}` }, error: null }
      },
      getPublicUrl(path: string) { return { data: { publicUrl: `https://example.test/${path}` } } },
    }
  }) as any)
  try {
    const urls = await Promise.all([uploadAsset(photo()), uploadAsset(photo())])
    assert.notEqual(paths[0], paths[1])
    assert.deepEqual(urls, paths.map((path) => `https://example.test/stored/${path}`))
  } finally { auth.mock.restore(); from.mock.restore() }
})

test("an incomplete storage response cannot become a saved photo", async () => {
  const auth = mock.method(supabase.auth, "getUser", async () => ({ data: { user: { id: "member" } }, error: null }) as any)
  const from = mock.method(supabase.storage, "from", (() => ({ upload: async () => ({ data: null, error: null }) })) as any)
  try { await assert.rejects(uploadAsset(photo()), /did not finish/) }
  finally { auth.mock.restore(); from.mock.restore() }
})

test("unsupported, empty and oversized photo files are rejected", () => {
  assert.throws(() => validateProfilePhoto({ type: "application/pdf", size: 10 }), /Choose a/)
  assert.throws(() => validateProfilePhoto({ type: "image/jpeg", size: 0 }), /empty/)
  assert.throws(() => validateProfilePhoto({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 }), /10 MB/)
  assert.equal(validateProfilePhoto({ type: "image/png", size: 10 * 1024 * 1024 }), "png")
})

test("temporary photo URLs cannot mark onboarding step one complete", async () => {
  const from = mock.method(supabase, "from", () => { throw new Error("Unexpected database call") })
  try {
    for (const url of ["blob:https://lovesathi.com/temporary", "data:image/jpeg;base64,AAAA", "not-a-url"]) {
      const result = await saveStep1("member", { ...profile, photoUrls: [profile.photoUrls[0], url] })
      assert.equal(result.success, false)
      assert.match(result.error || "", /not uploaded successfully/)
    }
    assert.equal(from.mock.callCount(), 0)
    assert.throws(() => validateSavedProfilePhotos([profile.photoUrls[0]]), /between 2 and 6/)
  } finally { from.mock.restore() }
})

test("a profile read failure does not overwrite previously saved onboarding data", async () => {
  let calls = 0
  const from = mock.method(supabase, "from", (() => {
    calls++
    return { select() { return this }, eq() { return this }, async maybeSingle() {
      return calls === 1 ? { data: { user_id: "member" }, error: null }
        : { data: null, error: { message: "Profile read failed" } }
    } }
  }) as any)
  try {
    const result = await saveStep1("member", profile)
    assert.equal(result.success, false)
    assert.equal(result.error, "Profile read failed")
    assert.equal(calls, 2)
  } finally { from.mock.restore() }
})
