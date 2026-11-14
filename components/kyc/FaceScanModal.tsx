"use client"

import { FaceScanner } from "@/components/FaceScanner"
import { imageDataUrlToBlob } from "@/lib/imageData"

interface FaceScanModalProps {
  isOpen: boolean
  onClose: () => void
  onScanComplete: (imageBlob: Blob) => void
}

/**
 * Face Scan Modal - Wrapper around FaceScanner component
 * Converts base64 data URL to Blob for compatibility with existing code
 */
export function FaceScanModal({ isOpen, onClose, onScanComplete }: FaceScanModalProps) {
  if (!isOpen) return null

  /**
   * Handle image capture from FaceScanner
   * Convert data URL to Blob for backward compatibility
   */
  const handleCapture = async (imageUri: string) => {
    try {
      // Convert data URL to Blob
      const blob = imageDataUrlToBlob(imageUri)
      
      // Call parent callback
      onScanComplete(blob)
      onClose()
    } catch (error) {
      console.error("Error converting image to blob:", error)
    }
  }

  return (
    <FaceScanner 
      onCapture={handleCapture}
      onClose={onClose}
      autoCaptureDuration={2000}
    />
  )
}

