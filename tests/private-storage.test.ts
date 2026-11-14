import assert from "node:assert/strict"
import { test } from "node:test"
import type { SupabaseClient } from "@supabase/supabase-js"
import { privateStoragePath, privateStorageReference } from "../lib/privateStorage"
import { signVerificationFiles } from "../lib/verificationFiles"

const userId = "11111111-1111-4111-8111-111111111111"
const project = "https://audit-placeholder.supabase.co"

test("private references and legacy project URLs resolve to an owner-scoped object path", () => {
  const path = `${userId}/id-document-123.pdf`
  assert.equal(privateStoragePath(privateStorageReference("verification-documents", path), "verification-documents", userId, project), path)
  for (const mode of ["public", "sign", "authenticated"]) {
    assert.equal(privateStoragePath(`${project}/storage/v1/object/${mode}/verification-documents/${path}?token=old`, "verification-documents", userId, project), path)
  }
  assert.equal(privateStoragePath(path, "verification-documents", userId, project), path)
})

test("private file resolution rejects foreign origins, buckets, owners and traversal", () => {
  for (const reference of [
    `https://evil.example/storage/v1/object/public/verification-documents/${userId}/id.pdf`,
    `supabase://face-scans/${userId}/id.pdf`,
    "supabase://verification-documents/22222222-2222-4222-8222-222222222222/id.pdf",
    `${userId}/../other/id.pdf`, `${userId}/%2e%2e/other/id.pdf`, `${userId}/%5cother`, `${userId}//id.pdf`,
  ]) assert.throws(() => privateStoragePath(reference, "verification-documents", userId, project), Error, reference)
})

function signer(fail = false) {
  const calls: Array<{ bucket: string; path: string; expires: number }> = []
  const client = { storage: { from(bucket: string) {
    return { async createSignedUrl(path: string, expires: number) {
      calls.push({ bucket, path, expires })
      return fail ? { error: new Error("Unavailable"), data: null } : { error: null, data: { signedUrl: `https://preview.test/${bucket}/${path}` } }
    } }
  } } } as unknown as Pick<SupabaseClient, "storage">
  return { client, calls }
}

test("review links are signed for one minute using fixed private buckets", async () => {
  const f = signer()
  const result = await signVerificationFiles(f.client, {
    user_id: userId,
    document_file_url: privateStorageReference("verification-documents", `${userId}/id.pdf`),
    face_scan_url: `${project}/storage/v1/object/public/face-scans/${userId}/selfie.jpg`,
  }, project)
  assert.ok(result.documentUrl)
  assert.ok(result.faceScanUrl)
  assert.deepEqual(f.calls.map(({ bucket, expires }) => ({ bucket, expires })), [
    { bucket: "verification-documents", expires: 60 }, { bucket: "face-scans", expires: 60 },
  ])
})

test("invalid object ownership prevents all signing requests", async () => {
  const f = signer()
  await assert.rejects(signVerificationFiles(f.client, {
    user_id: userId, document_file_url: "another-user/id.pdf", face_scan_url: `${userId}/selfie.jpg`,
  }, project), /does not belong/)
  assert.equal(f.calls.length, 0)
})

test("missing files remain empty and unavailable files surface an error", async () => {
  const f = signer()
  assert.deepEqual(await signVerificationFiles(f.client, { user_id: userId }, project), { documentUrl: null, faceScanUrl: null })
  assert.equal(f.calls.length, 0)
  await assert.rejects(signVerificationFiles(signer(true).client, { user_id: userId, document_file_url: `${userId}/id.pdf` }, project), /unavailable/)
})
