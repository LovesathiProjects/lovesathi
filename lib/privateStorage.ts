export type VerificationBucket = "verification-documents" | "face-scans"

export function privateStorageReference(bucket: VerificationBucket, path: string) {
  return `supabase://${bucket}/${path}`
}

/** Accept durable references and legacy project storage URLs, always scoped to the record owner. */
export function privateStoragePath(reference: string, bucket: VerificationBucket, userId: string, projectUrl: string) {
  let path = reference
  if (reference.startsWith("supabase://")) {
    const url = new URL(reference)
    if (url.hostname !== bucket) throw new Error("Unexpected verification bucket")
    path = url.pathname.slice(1)
  } else if (/^https?:\/\//i.test(reference)) {
    const url = new URL(reference)
    if (url.origin !== new URL(projectUrl).origin) throw new Error("Unexpected storage origin")
    const prefixes = ["public", "sign", "authenticated"].map((mode) => `/storage/v1/object/${mode}/${bucket}/`)
    const prefix = prefixes.find((value) => url.pathname.startsWith(value))
    if (!prefix) throw new Error("Unexpected verification URL")
    path = url.pathname.slice(prefix.length)
  }

  path = decodeURIComponent(path)
  if (!path.startsWith(`${userId}/`) || path.split("/").some((part) => !part || part === "." || part === "..")
    || /[\\\u0000-\u001f\u007f]/.test(path)) throw new Error("Verification file does not belong to this member")
  return path
}
