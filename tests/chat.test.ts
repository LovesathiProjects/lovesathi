import assert from "node:assert/strict"
import { before, mock, test } from "node:test"

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://audit-placeholder.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "audit-placeholder-public-key"
let supabase: typeof import("../lib/supabaseClient").supabase
let deleteAllMessagesForUser: typeof import("../lib/chatService").deleteAllMessagesForUser
let getTotalUnreadCount: typeof import("../lib/chatService").getTotalUnreadCount
let getUnreadCount: typeof import("../lib/chatService").getUnreadCount
before(async () => {
  ;({ supabase } = await import("../lib/supabaseClient"))
  ;({ deleteAllMessagesForUser, getTotalUnreadCount, getUnreadCount } = await import("../lib/chatService"))
})

test("clear chat returns false when one write fails and skips already hidden messages", async () => {
  const updatedIds: string[] = []
  const from = mock.method(supabase, "from", (() => ({
    select: () => ({
      eq() { return this },
      async or() {
        return { data: [
          { id: "ok", deleted_by: [] },
          { id: "fail", deleted_by: [] },
          { id: "hidden", deleted_by: ["member"] },
        ], error: null }
      },
    }),
    update: () => ({
      async eq(_column: string, id: string) {
        updatedIds.push(id)
        return { error: id === "fail" ? { message: "Permission denied" } : null }
      },
    }),
  })) as unknown as typeof supabase.from)
  try {
    assert.equal(await deleteAllMessagesForUser("match", "member", "matrimony"), false)
    assert.deepEqual(updatedIds.sort(), ["fail", "ok"])
  } finally { from.mock.restore() }
})

test("clear chat returns true when every write succeeds", async () => {
  const from = mock.method(supabase, "from", (() => ({
    select: () => ({ eq() { return this }, async or() { return { data: [{ id: "ok", deleted_by: [] }], error: null } } }),
    update: () => ({ async eq() { return { error: null } } }),
  })) as unknown as typeof supabase.from)
  try {
    assert.equal(await deleteAllMessagesForUser("match", "member", "matrimony"), true)
  } finally { from.mock.restore() }
})

test("both unread queries exclude messages hidden by the current member", async () => {
  const filters: unknown[][] = []
  const from = mock.method(supabase, "from", (() => ({
    select: () => ({
      eq() { return this }, is() { return this },
      async not(...args: unknown[]) { filters.push(args); return { count: 2, error: null } },
    }),
  })) as unknown as typeof supabase.from)
  try {
    assert.equal(await getUnreadCount("match", "member", "matrimony"), 2)
    assert.equal(await getTotalUnreadCount("member"), 2)
    assert.deepEqual(filters, [
      ["deleted_by", "cs", "{member}"], ["deleted_by", "cs", "{member}"],
    ])
  } finally { from.mock.restore() }
})
