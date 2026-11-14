import assert from "node:assert/strict"
import { test } from "node:test"
import type { SupabaseClient } from "@supabase/supabase-js"
import { deleteAccountStorage } from "../lib/accountStorage"

const userId = "11111111-1111-4111-8111-111111111111"
type Entry = { name: string; id: string | null; metadata: object | null }
const file = (name: string): Entry => ({ name, id: name, metadata: {} })

function fixture(entries: Record<string, Entry[]>, failure?: "list" | "remove") {
  const removed: string[][] = []
  const listed: Array<{ prefix: string; offset: number }> = []
  const client = {
    storage: {
      from(bucket: string) {
        return {
          async list(prefix: string, { offset, limit }: { offset: number; limit: number }) {
            listed.push({ prefix, offset })
            return {
              data: (entries[`${bucket}/${prefix}`] || []).slice(offset, offset + limit),
              error: failure === "list" ? new Error("Storage unavailable") : null,
            }
          },
          async remove(paths: string[]) {
            removed.push(paths)
            return { error: failure === "remove" ? new Error("Storage unavailable") : null }
          },
        }
      },
    },
  } as unknown as Pick<SupabaseClient, "storage">
  return { client, removed, listed }
}

test("removes more than 1000 uploads and nested objects without leaving page gaps", async () => {
  const f = fixture({
    [`matrimony-photos/${userId}`]: [
      ...Array.from({ length: 1001 }, (_, i) => file(`photo-${i}.jpg`)),
      { name: "nested", id: null, metadata: null },
    ],
    [`matrimony-photos/${userId}/nested`]: [file("portrait.jpg")],
    [`verification-documents/${userId}`]: [file("id.pdf")],
  })
  await deleteAccountStorage(f.client, userId)
  const paths = f.removed.flat()
  assert.equal(paths.length, 1003)
  assert.equal(new Set(paths).size, paths.length)
  assert.ok(paths.includes(`${userId}/nested/portrait.jpg`))
  assert.ok(paths.every((p) => p.startsWith(`${userId}/`)))
  assert.ok(f.listed.some((p) => p.offset === 1000))
  assert.ok(f.removed.every((batch) => batch.length <= 1000))
})

for (const failure of ["list", "remove"] as const) {
  test(`rejects ${failure} failures so account deletion cannot report success`, async () => {
    const f = fixture({ [`verification-documents/${userId}`]: [file("id.pdf")] }, failure)
    await assert.rejects(deleteAccountStorage(f.client, userId), /Unable to/)
  })
}

test("empty account succeeds without attempting removal", async () => {
  const f = fixture({})
  await deleteAccountStorage(f.client, userId)
  assert.equal(f.removed.length, 0)
  assert.equal(f.listed.length, 3)
})

test("rejects a prefix that could target another account", async () => {
  const f = fixture({})
  await assert.rejects(deleteAccountStorage(f.client, "../"), /Invalid account/)
  assert.equal(f.listed.length, 0)
})
