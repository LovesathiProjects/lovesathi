"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Upload, Camera, X, FileText, AlertCircle, CheckCircle, Shield, ArrowLeft } from "lucide-react"
import { FaceScanModal } from "@/components/kyc/FaceScanModal"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
  getIDVerification,
  completeIDVerification
} from "@/lib/verificationApi"

type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'in_review' | null

export function VerificationStatus({ onBack }: { onBack?: () => void; mode?: 'matrimony' }) {
  const isMatrimony = true
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [capturedFacePhoto, setCapturedFacePhoto] = useState<File | null>(null)
  const [facePhotoPreview, setFacePhotoPreview] = useState<string | null>(null)
  const [showFaceScanModal, setShowFaceScanModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  // Check verification status on mount
  useEffect(() => {
    checkVerificationStatus()
  }, [])

  const checkVerificationStatus = async () => {
    setCheckingStatus(true)
    try {
      const result = await getIDVerification()
      if (result.success && result.data) {
        setVerificationStatus(result.data.verification_status as VerificationStatus)
      } else {
        setVerificationStatus(null)
      }
    } catch (error) {
      console.error('Error checking verification status:', error)
      setVerificationStatus(null)
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleFileUpload = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload Aadhar card, PAN card, Driving License, or Passport (.jpg, .jpeg, .png, .pdf)",
        variant: "destructive",
      })
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    // Set the uploaded file
    setUploadedFile(file)

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      // For PDFs, no preview
      setFilePreview(null)
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    setFilePreview(null)
    if (uploadInputRef.current) {
      uploadInputRef.current.value = ''
    }
  }

  const handleUploadId = () => {
    uploadInputRef.current?.click()
  }

  const handleTakePhoto = async () => {
    setShowFaceScanModal(true)
  }

  const handleFaceScanComplete = async (imageBlob: Blob) => {
    // Convert blob to File
    const file = new File([imageBlob], `face-scan-${Date.now()}.jpg`, { type: "image/jpeg" })

    // Set the captured photo
    setCapturedFacePhoto(file)

    // Generate preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setFacePhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    toast({
      title: "Face Scan Complete",
      description: "Your face has been successfully captured.",
    })
  }

  const handleRemoveFacePhoto = () => {
    setCapturedFacePhoto(null)
    setFacePhotoPreview(null)
  }

  const handleSubmit = async () => {
    // Validate that both files are uploaded
    if (!uploadedFile || !capturedFacePhoto) {
      toast({
        title: "Missing Files",
        description: "Please upload both ID document and face scan to continue.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    // Upload files and save verification to Supabase
    const result = await completeIDVerification(uploadedFile, capturedFacePhoto)

    setLoading(false)

    if (result.success) {
      toast({
        title: "Verification Submitted",
        description: "Your ID verification has been submitted successfully and is pending review.",
      })
      // Refresh status
      await checkVerificationStatus()
      // Clear files
      setUploadedFile(null)
      setCapturedFacePhoto(null)
      setFilePreview(null)
      setFacePhotoPreview(null)
    } else {
      toast({
        title: "Verification Failed",
        description: result.error || "Failed to submit verification. Please try again.",
        variant: "destructive",
      })
    }
  }

  const isVerified = verificationStatus === 'approved'
  const isPending = verificationStatus === 'pending' || verificationStatus === 'in_review'
  const isRejected = verificationStatus === 'rejected'
  const needsVerification = !verificationStatus || isRejected

  return (
    <div className={cn("min-h-screen relative", isMatrimony ? "bg-white" : "bg-[#0E0F12]")}>
      <div className={cn(
        "sticky top-0 border-b shadow-lg z-10",
        isMatrimony
          ? "border-[#E5E5E5] bg-white"
          : "backdrop-blur-xl border-white/20 bg-[#14161B]/50"
      )}>
        <div className="flex items-center justify-between p-4">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "p-2 rounded-full border",
                isMatrimony
                  ? "hover:bg-gray-50 bg-white border-[#E5E5E5]"
                  : "hover:bg-white/10 bg-white/10 backdrop-blur-xl border-white/20"
              )}
              onClick={onBack}
            >
              <ArrowLeft className={cn("w-4 h-4 mr-2", isMatrimony ? "text-black" : "text-white")} />
              <span className={cn(isMatrimony ? "text-black" : "text-white")}>Back</span>
            </Button>
          )}
          {!onBack && <div className="w-16"></div>}
          <h1 className={cn("text-2xl font-bold", isMatrimony ? "text-black" : "text-white")}>Profile Verification</h1>
          {isPending && (
            <div className="flex items-center space-x-2" style={{ color: '#C2A574' }}>
              <AlertCircle className="w-4 h-4" style={{ color: '#C2A574' }} />
              <span className={cn("text-xs font-semibold", isMatrimony ? "text-black" : "text-white")}>Pending</span>
            </div>
          )}
          {!isPending && <div className="w-16"></div>}
        </div>
      </div>
      <div className="p-6 space-y-6">

        {checkingStatus ? (
          <Card className={cn(isMatrimony ? "bg-white border-[#E5E5E5]" : "bg-[#14161B]/50 border border-white/20")}>
            <CardContent className="p-6 text-center">
              <p className={cn("text-sm", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>Checking verification status...</p>
            </CardContent>
          </Card>
        ) : isVerified ? (
          <Card className={cn(isMatrimony ? "bg-white border-[#E5E5E5]" : "bg-[#14161B]/50 border border-white/20")}>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-6 h-6" style={{ color: '#10B981' }} />
                <CardTitle className={cn(isMatrimony ? "text-black" : "text-white")}>You're Verified</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className={cn("text-sm", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>Government ID and selfie have been verified.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className={cn(isMatrimony ? "bg-white border-[#E5E5E5]" : "bg-[#14161B]/50 border border-white/20")}>
            <CardHeader>
              <div className="flex items-center space-x-2">
                {isPending && <AlertCircle className="w-6 h-6" style={{ color: '#C2A574' }} />}
                <CardTitle className={cn(isMatrimony ? "text-black" : "text-white")}>Verification {isPending ? 'Pending' : isRejected ? 'Rejected' : 'Required'}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPending && (
                <div className={cn(
                  "p-3 border rounded-lg",
                  isMatrimony
                    ? "bg-[#C2A574]/5 border-[#C2A574]/20"
                    : "bg-[#C2A574]/10 border-[#C2A574]/20"
                )}>
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#C2A574' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#C2A574' }}>Verification Pending</p>
                      <p className={cn("text-xs mt-1", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>
                        Your verification is currently under review. You can update your documents if needed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isRejected && (
                <div className={cn(
                  "p-3 border rounded-lg",
                  isMatrimony
                    ? "bg-[#C2A574]/5 border-[#C2A574]/20"
                    : "bg-[#C2A574]/10 border-[#C2A574]/20"
                )}>
                  <p className="text-sm" style={{ color: '#C2A574' }}>
                    Your verification was rejected. Please upload new documents to try again.
                  </p>
                </div>
              )}

              <p className={cn("text-sm", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>
                Upload a government ID and a selfie to verify your profile.
              </p>
              <Separator className={cn(isMatrimony ? "bg-[#E5E5E5]" : "bg-white/20")} />

              {/* Hidden input for file picking */}
              <input
                ref={uploadInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleFileUpload(file)
                  }
                }}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Upload ID Button */}
                {!uploadedFile ? (
                  <Button
                    onClick={handleUploadId}
                    variant="outline"
                    className={cn(
                      "h-auto p-4 flex flex-col space-y-2 transition-all shadow-sm",
                      isMatrimony
                        ? "bg-white border-[#E5E5E5] hover:bg-gray-50 hover:border-[#C2A574] hover:shadow-md"
                        : "bg-[#14161B] border-white/20 hover:bg-white/10 hover:border-[#C2A574]/50"
                    )}
                  >
                    <Upload className={cn("w-6 h-6", isMatrimony ? "text-[#C2A574]" : "text-white")} />
                    <span className={cn("text-sm", isMatrimony ? "text-black" : "text-white")}>Upload ID</span>
                  </Button>
                ) : (
                  <div className={cn(
                    "relative p-3 border rounded-lg shadow-sm",
                    isMatrimony
                      ? "border-[#E5E5E5] bg-white"
                      : "border-white/20 bg-[#14161B]"
                  )}>
                    <button
                      onClick={handleRemoveFile}
                      className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-[#C2A574] hover:bg-[#B9975E] text-[#3A2B24] flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex flex-col items-center space-y-2">
                      {filePreview ? (
                        <div className={cn(
                          "w-full h-20 rounded-md overflow-hidden border",
                          isMatrimony ? "border-[#E5E5E5]" : "border-white/20"
                        )}>
                          <img
                            src={filePreview}
                            alt="ID Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={cn(
                          "w-full h-20 rounded-md flex items-center justify-center border",
                          isMatrimony
                            ? "bg-[#C2A574]/5 border-[#E5E5E5]"
                            : "bg-[#C2A574]/10 border-white/20"
                        )}>
                          <FileText className="w-10 h-10" style={{ color: '#C2A574' }} />
                        </div>
                      )}
                      <div className="w-full space-y-0.5 pr-4">
                        <p className={cn("text-xs font-medium truncate", isMatrimony ? "text-black" : "text-white")}>
                          {uploadedFile.name}
                        </p>
                        <p className={cn("text-[10px]", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Face Scanner Button */}
                {!capturedFacePhoto ? (
                  <Button
                    onClick={handleTakePhoto}
                    variant="outline"
                    className={cn(
                      "h-auto p-4 flex flex-col space-y-2 transition-all shadow-sm",
                      isMatrimony
                        ? "bg-white border-[#E5E5E5] hover:bg-gray-50 hover:border-[#C2A574] hover:shadow-md"
                        : "bg-[#14161B] border-white/20 hover:bg-white/10 hover:border-[#C2A574]/50"
                    )}
                  >
                    <Camera className={cn("w-6 h-6", isMatrimony ? "text-[#C2A574]" : "text-white")} />
                    <span className={cn("text-sm", isMatrimony ? "text-black" : "text-white")}>Face Scanner</span>
                  </Button>
                ) : (
                  <div className={cn(
                    "relative p-3 border rounded-lg shadow-sm",
                    isMatrimony
                      ? "border-[#E5E5E5] bg-white"
                      : "border-white/20 bg-[#14161B]"
                  )}>
                    <button
                      onClick={handleRemoveFacePhoto}
                      className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-[#C2A574] hover:bg-[#B9975E] text-[#3A2B24] flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex flex-col items-center space-y-2">
                      {facePhotoPreview && (
                        <div className={cn(
                          "w-full h-20 rounded-md overflow-hidden border",
                          isMatrimony ? "border-[#E5E5E5]" : "border-white/20"
                        )}>
                          <img
                            src={facePhotoPreview}
                            alt="Face Scan"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="w-full space-y-0.5 pr-4">
                        <p className={cn("text-xs font-medium truncate", isMatrimony ? "text-black" : "text-white")}>
                          {capturedFacePhoto.name}
                        </p>
                        <p className={cn("text-[10px]", isMatrimony ? "text-[#666666]" : "text-[#A1A1AA]")}>
                          {(capturedFacePhoto.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!uploadedFile || !capturedFacePhoto || loading}
                className="w-full bg-[#C2A574] hover:bg-[#B9975E] text-[#3A2B24] border-[#C2A574]"
              >
                {loading ? "Uploading..." : "Submit for Verification"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Face Scan Modal */}
      <FaceScanModal
        isOpen={showFaceScanModal}
        onClose={() => setShowFaceScanModal(false)}
        onScanComplete={handleFaceScanComplete}
      />
    </div>
  )
}
