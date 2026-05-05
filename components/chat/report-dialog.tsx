"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogOverlay,
  AlertDialogPortal,
} from "@/components/ui/alert-dialog"
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { reportUser, REPORT_REASONS } from "@/lib/reportService"
import { cn } from "@/lib/utils"

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportedUserId: string
  reporterId: string
  matchType: 'matrimony'
  userName: string
  onSuccess: () => void
}

export function ReportDialog({
  open,
  onOpenChange,
  reportedUserId,
  reporterId,
  matchType,
  userName,
  onSuccess
}: ReportDialogProps) {
  const [reason, setReason] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await reportUser({
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        match_type: matchType,
        reason,
        description: description.trim() || undefined
      })

      if (result.success) {
        onSuccess()
        onOpenChange(false)
        // Reset form
        setReason("")
        setDescription("")
      } else {
        console.error('Report failed:', result.error)
        // You could show an error toast here
      }
    } catch (error) {
      console.error('Unexpected error submitting report:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    // Reset form
    setReason("")
    setDescription("")
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPortal>
        <AlertDialogOverlay 
          className="bg-black/60"
        />
        <AlertDialogPrimitive.Content
          data-slot="alert-dialog-content"
          className={cn(
            'fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-3xl border border-white/20 bg-[#14161B] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl text-white duration-200 sm:max-w-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            "max-w-md",
            "bg-white text-black border-black/12"
          )}
        >
        <AlertDialogHeader>
          <AlertDialogTitle 
            className="text-black"
          >
            Report {userName}?
          </AlertDialogTitle>
          <AlertDialogDescription 
            className="text-black/80"
          >
            Please help us understand the issue. Reports are reviewed by our team and appropriate action will be taken.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label 
              htmlFor="reason" 
            >
              Reason for reporting
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger 
                className="bg-background border-border"
              >
                <SelectValue 
                  placeholder="Select a reason" 
                />
              </SelectTrigger>
              <SelectContent 
                position="popper" 
                className="z-50 bg-white border-black/12"
                style={{ color: '#000000' }}
              >
                {REPORT_REASONS[matchType].map((reportReason) => (
                  <SelectItem 
                    key={reportReason} 
                    value={reportReason} 
                    style={{ color: '#000000' }}
                  >
                    {reportReason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label 
              htmlFor="description" 
            >
              Additional details (optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Provide any additional context that might help us review this report..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p 
              className="text-xs" 
              style={{ color: 'rgba(0, 0, 0, 0.6)' }}
            >
              {description.length}/500 characters
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <Button 
            variant="outline" 
            onClick={handleCancel} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason.trim() || isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </AlertDialogFooter>
        </AlertDialogPrimitive.Content>
      </AlertDialogPortal>
    </AlertDialog>
  )
}
