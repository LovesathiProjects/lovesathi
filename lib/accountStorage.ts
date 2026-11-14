import type { SupabaseClient } from "@supabase/supabase-js"

const PAGE_SIZE = 1000
const ACCOUNT_BUCKETS = ["verification-documents", "face-scans", "matrimony-photos"] as const

/** Delete only this account's uploads. Throw on failure so auth deletion can be retried safely. */
export async function deleteAccountStorage(client: Pick<SupabaseClient, "storage">, userId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error("Invalid account storage prefix")
  }

  for (const bucketName of ACCOUNT_BUCKETS) {
    const bucket = client.storage.from(bucketName)
    const folders = [userId]
    const paths: string[] = []

    while (folders.length > 0) {
      const folder = folders.pop()!
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await bucket.list(folder, {
          limit: PAGE_SIZE,
          offset,
          sortBy: { column: "name", order: "asc" },
        })
        if (error || !data) throw new Error(`Unable to list account uploads in ${bucketName}`)

        for (const entry of data) {
          const path = `${folder}/${entry.name}`
          if (entry.id == null && entry.metadata == null) folders.push(path)
          else paths.push(path)
        }
        if (data.length < PAGE_SIZE) break
      }
    }

    // Finish listing before deletion so offsets do not skip files as the list shrinks.
    for (let offset = 0; offset < paths.length; offset += PAGE_SIZE) {
      const { error } = await bucket.remove(paths.slice(offset, offset + PAGE_SIZE))
      if (error) throw new Error(`Unable to remove account uploads in ${bucketName}`)
    }
  }
}
