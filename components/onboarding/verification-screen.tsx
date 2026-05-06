"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Upload, Camera, X, FileText, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { FaceScanModal } from "@/components/kyc/FaceScanModal"
import { 
  saveDateOfBirth, 
  saveGender, 
  completeIDVerification 
} from "@/lib/verificationApi"
import { calculateAgeFromDate, getMinimumBirthDate } from "@/lib/age"

interface VerificationScreenProps {
  onComplete?: () => void
  onSkip?: () => void
}

export function VerificationScreen({ onComplete, onSkip }: VerificationScreenProps) {
  const [step, setStep] = useState<"profile" | "gender" | "id">("profile")
  const [gender, setGender] = useState<"male" | "female" | "prefer_not_to_say" | null>(null)
  const [dob, setDob] = useState("")
  const [profileValid, setProfileValid] = useState(false)
  const [underageMessage, setUnderageMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const minimumBirthDate = getMinimumBirthDate(18)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [capturedFacePhoto, setCapturedFacePhoto] = useState<File | null>(null)
  const [facePhotoPreview, setFacePhotoPreview] = useState<string | null>(null)
  const [showFaceScanModal, setShowFaceScanModal] = useState(false)
  const { toast } = useToast()

  // Live underage validation when DOB changes
  useEffect(() => {
    if (!dob) {
      setUnderageMessage(null)
      return
    }
    const age = calculateAgeFromDate(dob)
    if (age !== null && age < 18) {
      setUnderageMessage("You are not eligible to use Lovesathi according to age criteria (18+).")
    } else {
      setUnderageMessage(null)
    }
  }, [dob])

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
    // Works on Web (desktop/mobile) and mobile browsers on Android/iOS
    uploadInputRef.current?.click()
  }

  const handleTakePhoto = async () => {
    // Open the face scan modal for KYC verification
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

    // Show success toast
    toast({
      title: "Face Scan Complete",
      description: "Your face scan has been captured and will be reviewed with your ID.",
    })
  }

  const handleRemoveFacePhoto = () => {
    setCapturedFacePhoto(null)
    setFacePhotoPreview(null)
  }

  const calculateAge = (dateString: string) => {
    return calculateAgeFromDate(dateString) || 0
  }

  const handleProfileContinue = async () => {
    setUnderageMessage(null)
    
    if (!dob) {
      toast({
        title: "Date Required",
        description: "Please select your date of birth.",
        variant: "destructive",
      })
      return
    }

    const age = calculateAgeFromDate(dob)
    
    if (age === null || age < 18) {
      setUnderageMessage("You're underage to use Lovesathi.")
      setProfileValid(false)
      toast({
        title: "Age Restriction",
        description: "You must be at least 18 years old to use this app.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    
    try {
      // Save DOB to Supabase
      const result = await saveDateOfBirth(dob)
      
      if (result.success) {
        toast({
          title: "Date of Birth Saved",
          description: "Your date of birth has been saved successfully.",
        })
        setProfileValid(true)
        setStep("gender")
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save date of birth. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    // Validate that both files are uploaded
    if (!uploadedFile || !capturedFacePhoto) {
      toast({
        title: "Missing Files",
        description: "Please upload both ID document and face scan to continue.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    
    // Upload files and save verification to Supabase
    const result = await completeIDVerification(uploadedFile, capturedFacePhoto)
    
    setIsLoading(false)
    
    if (result.success) {
      toast({
        title: "Verification Submitted",
        description: "Your ID verification has been submitted successfully and is pending review.",
      })
      onComplete?.()
    } else {
      toast({
        title: "Verification Failed",
        description: result.error || "Failed to submit verification. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Progress indicator helpers
  const currentStepIndex = step === "profile" ? 1 : step === "gender" ? 2 : 3
  const totalSteps = 3
  
  // Progress dots renderer
  const renderProgressDots = () => {
    return (
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum) => (
          <div
            key={stepNum}
            className={`h-2 rounded-full transition-all duration-300 ${
              stepNum === currentStepIndex
                ? "w-8 bg-[#97011A]"
                : stepNum < currentStepIndex
                ? "w-2 bg-[#97011A]"
                : "w-2 bg-black/20"
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with back button and progress */}
      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={() => {
              if (step === "gender") {
                setStep("profile")
              } else if (step === "id") {
                setStep("gender")
              } else {
                window.location.href = '/'
              }
            }}
            disabled={isLoading}
            className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="w-6 h-6 text-black" />
          </button>
          {renderProgressDots()}
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 py-8">
        {/* Profile step (DOB) */}
        {step === "profile" && (
          <div className="flex-1 flex flex-col justify-between max-w-md w-full mx-auto">
            <div className="space-y-6 pt-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-[#111]">When were you born?</h1>
                <p className="text-base text-black/60">Select your date of birth. Minimum age is 18.</p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="dob" className="text-sm font-semibold text-[#111] uppercase tracking-wide">
                    DATE OF BIRTH
                  </Label>
                  <div className="relative">
                    <Input
                      id="dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      min="1950-01-01"
                      max={minimumBirthDate}
                      className="w-full h-14 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                    />
                  </div>
                </div>

                {dob && (
                  <div className="text-center py-2">
                    <p className="text-sm text-black/60">Age: {calculateAge(dob)}</p>
                  </div>
                )}

                {underageMessage && (
                  <div className="p-4 bg-[#97011A]/10 rounded-xl">
                    <p className="text-sm text-[#97011A] text-center font-medium">{underageMessage}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pb-8">
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleProfileContinue()
                }}
                className="w-full h-14 text-base font-semibold bg-[#97011A] hover:bg-[#7A010E] text-white rounded-full shadow-sm transition-colors"
                disabled={isLoading || !dob}
                type="button"
              >
                {isLoading ? "Saving..." : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* Gender step */}
        {step === "gender" && (
          <div className="flex-1 flex flex-col justify-between max-w-md w-full mx-auto">
            <div className="space-y-6 pt-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-[#111]">Who are you?</h1>
                <p className="text-base text-black/60">Select your gender.</p>
              </div>

              <div className="space-y-3 pt-4">
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  className={`w-full h-14 text-base font-semibold rounded-xl border-2 transition-all ${
                    gender === "male"
                      ? "bg-[#97011A] text-white border-[#97011A]"
                      : "bg-white text-[#111] border-black/20 hover:border-black/40"
                  }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  className={`w-full h-14 text-base font-semibold rounded-xl border-2 transition-all ${
                    gender === "female"
                      ? "bg-[#97011A] text-white border-[#97011A]"
                      : "bg-white text-[#111] border-black/20 hover:border-black/40"
                  }`}
                >
                  Female
                </button>
                <button
                  type="button"
                  onClick={() => setGender("prefer_not_to_say")}
                  className={`w-full h-14 text-base font-semibold rounded-xl border-2 transition-all ${
                    gender === "prefer_not_to_say"
                      ? "bg-[#97011A] text-white border-[#97011A]"
                      : "bg-white text-[#111] border-black/20 hover:border-black/40"
                  }`}
                >
                  Prefer not to say
                </button>
              </div>
            </div>

            <div className="pb-8">
              <Button
                className="w-full h-14 text-base font-semibold bg-[#97011A] hover:bg-[#7A010E] text-white rounded-full shadow-sm transition-colors"
                onClick={async () => {
                  if (gender === null) return
                  
                  setIsLoading(true)
                  
                  // Save gender to Supabase
                  const result = await saveGender(gender)
                  
                  setIsLoading(false)
                  
                  if (result.success) {
                    toast({
                      title: "Gender Saved",
                      description: "Your gender has been saved successfully.",
                    })
                    setStep("id")
                  } else {
                    toast({
                      title: "Error",
                      description: result.error || "Failed to save gender. Please try again.",
                      variant: "destructive",
                    })
                  }
                }}
                disabled={gender === null || isLoading}
              >
                {isLoading ? "Saving..." : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* ID Verification step */}
        {step === "id" && (
          <div className="flex-1 flex flex-col justify-between max-w-md w-full mx-auto">
            <div className="space-y-6 pt-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-[#111]">ID Verification</h1>
                <p className="text-base text-black/60">Optional but recommended for enhanced trust</p>
              </div>

              <div className="p-4 bg-black/5 rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-[#97011A] mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#111]">Why verify your ID?</p>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-black/60">
                      <li>Get a verified badge on your profile</li>
                      <li>Increase trust with potential matches</li>
                      <li>Help the review team keep Lovesathi safe</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
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

                {/* Upload ID and Take Photo buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Upload ID Button */}
                  {!uploadedFile ? (
                    <button
                      onClick={handleUploadId}
                      className="h-32 flex flex-col items-center justify-center gap-2 bg-white border-2 border-dashed border-black/20 rounded-xl hover:border-black/40 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-[#111]" />
                      <span className="text-sm font-medium text-[#111]">Upload ID</span>
                    </button>
                  ) : (
                    <div className="relative h-32 border-2 border-[#97011A] rounded-xl bg-[#97011A]/5 p-3 overflow-hidden">
                      <button
                        onClick={handleRemoveFile}
                        className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-[#97011A] hover:bg-[#7A010E] text-white flex items-center justify-center transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex flex-col items-center justify-center h-full gap-2">
                        {filePreview ? (
                          <div className="w-full h-16 rounded-lg overflow-hidden">
                            <img src={filePreview} alt="ID Preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <FileText className="w-8 h-8 text-[#97011A]" />
                        )}
                        <p className="text-xs font-medium text-[#111] truncate w-full text-center px-2">
                          {uploadedFile.name}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Take Photo Button */}
                  {!capturedFacePhoto ? (
                    <button
                      onClick={handleTakePhoto}
                      className="h-32 flex flex-col items-center justify-center gap-2 bg-white border-2 border-dashed border-black/20 rounded-xl hover:border-black/40 transition-colors"
                    >
                      <Camera className="w-6 h-6 text-[#111]" />
                      <span className="text-sm font-medium text-[#111]">Take Photo</span>
                    </button>
                  ) : (
                    <div className="relative h-32 border-2 border-[#97011A] rounded-xl bg-[#97011A]/5 p-3 overflow-hidden">
                      <button
                        onClick={handleRemoveFacePhoto}
                        className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-[#97011A] hover:bg-[#7A010E] text-white flex items-center justify-center transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex flex-col items-center justify-center h-full gap-2">
                        {facePhotoPreview && (
                          <div className="w-full h-16 rounded-lg overflow-hidden">
                            <img src={facePhotoPreview} alt="Face Scan" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <p className="text-xs font-medium text-[#111] truncate w-full text-center px-2">
                          {capturedFacePhoto.name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 pb-8">
              <Button
                onClick={handleComplete}
                className="w-full h-14 text-base font-semibold bg-[#97011A] hover:bg-[#7A010E] text-white rounded-full shadow-sm transition-colors"
                disabled={isLoading || !uploadedFile || !capturedFacePhoto}
              >
                {isLoading ? "Uploading & Saving..." : "Verify ID"}
              </Button>
              {onSkip && (
                <button
                  onClick={onSkip}
                  disabled={isLoading}
                  className="w-full h-14 text-base font-semibold text-[#111] hover:bg-black/5 rounded-full transition-colors disabled:opacity-50"
                >
                  Skip for now
                </button>
              )}
            </div>
          </div>
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
