"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Files = { documentUrl: string | null; faceScanUrl: string | null; expiresIn: number }

export function VerificationFilePreview({ id, sessionToken }: { id: string; sessionToken: string | null }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<Files | null>(null)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)

  useEffect(() => {
    generation.current += 1
    setFiles(null); setOpen(false); setLoading(false); setError(null)
    return () => { generation.current += 1 }
  }, [id, sessionToken])
  useEffect(() => {
    if (!files) return
    const timer = window.setTimeout(() => {
      setFiles(null)
      setError("These preview links have expired. Load the files again to continue reviewing.")
    }, files.expiresIn * 1000)
    return () => window.clearTimeout(timer)
  }, [files])

  async function loadFiles() {
    if (!sessionToken) return
    const request = ++generation.current
    setOpen(true)
    setLoading(true)
    setError(null)
    setFiles(null)
    try {
      const response = await fetch(`/api/admin/verification-files?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${sessionToken}` }, cache: "no-store",
      })
      const result = await response.json()
      if (request !== generation.current) return
      if (!response.ok) throw new Error(result.error || "Unable to open verification files.")
      setFiles(result)
    } catch (error) {
      if (request !== generation.current) return
      setError(error instanceof Error ? error.message : "Unable to open verification files.")
    } finally { if (request === generation.current) setLoading(false) }
  }

  return <>
    <Button size="sm" variant="outline" disabled={!sessionToken || loading} onClick={() => void loadFiles()}>
      Review files
    </Button>
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next)
      if (!next) { generation.current += 1; setFiles(null); setLoading(false) }
    }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verification files</DialogTitle>
          <DialogDescription>Review the submitted ID and selfie before making a verification decision. Preview links expire after one minute.</DialogDescription>
        </DialogHeader>
        {loading && <p role="status">Loading private files…</p>}
        {error && <p role="alert">{error}</p>}
        {files && <div className="space-y-4">
          {files.documentUrl ? <a href={files.documentUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="block underline">Open ID document</a> : <p>No ID document was submitted.</p>}
          {files.faceScanUrl ? <div className="space-y-2">
            <img src={files.faceScanUrl} alt="Submitted verification selfie" referrerPolicy="no-referrer" className="max-h-80 w-full rounded-lg object-contain" />
            <a href={files.faceScanUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="block underline">Open selfie</a>
          </div> : <p>No selfie was submitted.</p>}
        </div>}
        {!loading && !files && <Button onClick={() => void loadFiles()}>Load files again</Button>}
      </DialogContent>
    </Dialog>
  </>
}
