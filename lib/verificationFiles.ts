import type { SupabaseClient } from "@supabase/supabase-js"
import { privateStoragePath, type VerificationBucket } from "./privateStorage"

export type VerificationFiles = { documentUrl: string | null; faceScanUrl: string | null }
export const VERIFICATION_PREVIEW_SECONDS = 60

/** Call only after admin authorization. No arbitrary URL is fetched or signed. */
export async function signVerificationFiles(
  client: Pick<SupabaseClient, "storage">,
  record: { user_id: string; document_file_url?: string | null; face_scan_url?: string | null },
  projectUrl: string,
): Promise<VerificationFiles> {
  const documentPath = record.document_file_url ? privateStoragePath(record.document_file_url, "verification-documents", record.user_id, projectUrl) : null
  const faceScanPath = record.face_scan_url ? privateStoragePath(record.face_scan_url, "face-scans", record.user_id, projectUrl) : null
  async function sign(path: string | null, bucket: VerificationBucket) {
    if (!path) return null
    const { data, error } = await client.storage.from(bucket).createSignedUrl(path, VERIFICATION_PREVIEW_SECONDS)
    if (error || !data?.signedUrl) throw new Error("The verification file is unavailable. Please retry or request a new upload.")
    return data.signedUrl
  }
  const [documentUrl, faceScanUrl] = await Promise.all([
    sign(documentPath, "verification-documents"), sign(faceScanPath, "face-scans"),
  ])
  return { documentUrl, faceScanUrl }
}
