"use server"

/**
 * KYC API utilities for face verification and document upload
 */

export interface FaceVerificationResult {
  success: boolean
  verificationId: string
  confidence: number
  message?: string
}

export interface DocumentVerificationResult {
  success: boolean
  documentId: string
  documentType: string
  verified: boolean
  message?: string
}

/**
 * Submit face scan for verification
 * @param imageBlob - The captured face image
 * @returns Verification result
 */
export async function verifyFaceScan(imageBlob: Blob): Promise<FaceVerificationResult> {
  void imageBlob

  return {
    success: false,
    verificationId: "",
    confidence: 0,
    message: "Face verification provider is not configured. Use the ID review flow instead.",
  }
}

/**
 * Submit document for verification
 * @param documentFile - The uploaded document file
 * @param documentType - Type of document (aadhar, pan, dl, passport)
 * @returns Verification result
 */
export async function verifyDocument(
  documentFile: File,
  documentType: "aadhar" | "pan" | "dl" | "passport"
): Promise<DocumentVerificationResult> {
  void documentFile

  return {
    success: false,
    documentId: "",
    documentType,
    verified: false,
    message: "Document verification provider is not configured. Use the ID review flow instead.",
  }
}

/**
 * Get KYC verification status
 * @param userId - User ID to check
 * @returns Verification status
 */
export async function getKycStatus(userId: string): Promise<{
  faceVerified: boolean
  documentVerified: boolean
  status: "pending" | "verified" | "rejected"
}> {
  void userId

  return {
    faceVerified: false,
    documentVerified: false,
    status: "pending",
  }
}
