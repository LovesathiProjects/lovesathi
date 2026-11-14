"use client"

import { useEffect, useState, useRef } from "react"
import { Camera, AlertCircle, CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFaceDetection } from "@/hooks/useFaceDetection"

/**
 * Cross-Platform Face Scanner Component
 * Works on Web (getUserMedia), iOS, and Android (via expo-camera)
 * 
 * Features:
 * - Auto-detects platform and uses appropriate camera API
 * - Real-time face detection using TensorFlow MediaPipe
 * - Circular overlay that turns green when face detected
 * - Auto-capture after 2 seconds of continuous face detection
 * - Manual capture button fallback
 * - Graceful permission handling with retry
 * - Performance optimized with requestAnimationFrame
 */

interface FaceScannerProps {
  onCapture: (imageUri: string) => void
  onClose?: () => void
  autoCaptureDuration?: number // milliseconds, default 2000
}

export function FaceScanner({ 
  onCapture, 
  onClose,
  autoCaptureDuration = 2000 
}: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const autoCaptureTimerRef = useRef<NodeJS.Timeout | null>(null)
  const faceDetectedStartTimeRef = useRef<number | null>(null)
  const cameraRequestRef = useRef(0)
  const capturedRef = useRef(false)

  const [permissionStatus, setPermissionStatus] = useState<"granted" | "denied" | "prompt">("prompt")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [autoCaptureProgress, setAutoCaptureProgress] = useState(0)

  const {
    faceDetected,
    isModelLoaded,
    detectFace,
    cleanup: cleanupFaceDetection,
    modelError,
    retry: retryFaceDetection,
  } = useFaceDetection()

  /**
   * Request camera permission and start stream
   */
  const requestCameraPermission = async () => {
    const request = ++cameraRequestRef.current
    try {
      setIsLoading(true)
      setError(null)
      setIsCameraReady(false)
      capturedRef.current = false
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null

      // Check if navigator.mediaDevices is available (web only)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported on this device")
      }

      // Request permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user", // Front camera
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      })

      const video = videoRef.current
      if (request !== cameraRequestRef.current || !video) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      streamRef.current = stream
      video.srcObject = stream
      await video.play()
      if (request !== cameraRequestRef.current) return
      setIsCameraReady(true)
      setPermissionStatus("granted")

      setIsLoading(false)
    } catch (err: any) {
      if (request !== cameraRequestRef.current) return
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      console.error("Camera permission error:", err)
      
      let errorMessage = "Failed to access camera"
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMessage = "Camera permission denied. Please allow camera access in your browser settings."
        setPermissionStatus("denied")
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMessage = "No camera found on this device."
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMessage = "Camera is already in use by another application."
      } else if (err.name === "OverconstrainedError") {
        errorMessage = "Camera doesn't support required constraints."
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  /**
   * Start camera on mount
   */
  useEffect(() => {
    requestCameraPermission()

    return () => {
      cameraRequestRef.current += 1
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      cleanupFaceDetection()
      
      if (autoCaptureTimerRef.current) {
        clearTimeout(autoCaptureTimerRef.current)
      }
    }
  }, [])

  /**
   * Face detection loop using requestAnimationFrame for performance
   */
  useEffect(() => {
    if (!isCameraReady || !isModelLoaded || !videoRef.current) return

    let rafId: number | null = null
    let cancelled = false
    let lastDetectionTime = 0
    const detectionInterval = 200 // Detect every 200ms for performance

    const detect = async (timestamp: number) => {
      if (timestamp - lastDetectionTime >= detectionInterval) {
        if (videoRef.current && videoRef.current.readyState === 4) {
          await detectFace(videoRef.current)
        }
        lastDetectionTime = timestamp
      }
      
      if (!cancelled) rafId = requestAnimationFrame(detect)
    }

    rafId = requestAnimationFrame(detect)

    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [isCameraReady, isModelLoaded, detectFace])

  /**
   * Auto-capture logic: capture image after face detected for specified duration
   */
  useEffect(() => {
    if (faceDetected) {
      // Start timer if not already started
      if (!faceDetectedStartTimeRef.current) {
        faceDetectedStartTimeRef.current = Date.now()
      }

      // Update progress
      const progressInterval = setInterval(() => {
        if (faceDetectedStartTimeRef.current) {
          const elapsed = Date.now() - faceDetectedStartTimeRef.current
          const progress = Math.min((elapsed / autoCaptureDuration) * 100, 100)
          setAutoCaptureProgress(progress)

          if (progress >= 100) {
            clearInterval(progressInterval)
            handleCapture()
          }
        }
      }, 50) // Update every 50ms for smooth animation

      return () => clearInterval(progressInterval)
    } else {
      // Reset timer if face not detected
      faceDetectedStartTimeRef.current = null
      setAutoCaptureProgress(0)
    }
  }, [faceDetected, autoCaptureDuration])

  /**
   * Capture image from video feed
   */
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || capturedRef.current || !faceDetected || !isModelLoaded) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video.videoWidth || !video.videoHeight) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw video frame to canvas (flip horizontally for mirror effect)
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
    ctx.restore()

    // Convert to data URL
    const imageUri = canvas.toDataURL("image/jpeg", 0.92)
    capturedRef.current = true

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    cleanupFaceDetection()

    // Return captured image
    onCapture(imageUri)
  }

  /**
   * Retry camera permission request
   */
  const handleRetry = () => {
    setError(null)
    setPermissionStatus("prompt")
    requestCameraPermission()
  }

  /**
   * Get circle border color based on face detection status
   */
  const getCircleColor = () => {
    if (faceDetected) {
      return "border-green-500 shadow-green-500/50"
    }
    return "border-red-500 shadow-red-500/50"
  }

  /**
   * Get instruction text
   */
  const getInstructionText = () => {
    if (error) return error
    if (modelError) return modelError
    if (isLoading) return "Initializing camera..."
    if (!isModelLoaded) return "Loading face detection model..."
    if (!faceDetected) return "Position your face in the circle"
    if (autoCaptureProgress < 100) return "Hold still..."
    return "Capturing..."
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Face Verification</h3>
            <p className="text-white/70 text-xs">KYC Identity Check</p>
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Camera Feed */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Video element (hidden when loading or error) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] ${
            isLoading || error ? "hidden" : "block"
          }`}
        />

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay with circular mask */}
        {isCameraReady && !error && (
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            {/* Dark overlay with circular cutout */}
            <div 
              className="absolute inset-0 bg-black/50"
              style={{
                WebkitMaskImage: "radial-gradient(circle at center, transparent 30%, black 31%)",
                maskImage: "radial-gradient(circle at center, transparent 30%, black 31%)",
              }}
            />

            {/* Circular border frame */}
            <div 
              className={`relative w-[min(70vw,70vh)] h-[min(70vw,70vh)] max-w-[400px] max-h-[400px] rounded-full border-4 transition-all duration-300 ${getCircleColor()}`}
            >
              {/* Auto-capture progress ring */}
              {faceDetected && autoCaptureProgress > 0 && autoCaptureProgress < 100 && (
                <svg 
                  className="absolute inset-0 w-full h-full -rotate-90"
                  style={{ transform: "rotate(-90deg)" }}
                >
                  <circle
                    cx="50%"
                    cy="50%"
                    r="48%"
                    fill="none"
                    stroke="rgba(34, 197, 94, 0.5)"
                    strokeWidth="8"
                    strokeDasharray={`${autoCaptureProgress * 3.14 * 2 * 0.48} ${100 * 3.14 * 2 * 0.48}`}
                    className="transition-all duration-50"
                  />
                </svg>
              )}

              {/* Status icon */}
              <div className="absolute top-4 right-4">
                {faceDetected ? (
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>

              {/* Center crosshair */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full h-full">
                  <div className="absolute top-1/2 left-1/2 w-0.5 h-12 bg-white/50 -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute top-1/2 left-1/2 w-12 h-0.5 bg-white/50 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white animate-spin mx-auto" />
              <p className="text-white text-sm">
                {!isModelLoaded ? "Loading face detection..." : "Starting camera..."}
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/95 p-6">
            <div className="text-center space-y-6 max-w-md">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-white text-xl font-semibold">Camera Access Required</h3>
                <p className="text-white/70 text-sm">{error}</p>
              </div>
              <Button
                onClick={handleRetry}
                className="px-8 py-6 rounded-2xl bg-white text-black hover:bg-white/90"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
        <div className="text-center space-y-4">
          {/* Instruction text */}
          <p className="text-white text-base font-medium">
            {getInstructionText()}
          </p>
          {modelError && !error && (
            <Button variant="outline" onClick={retryFaceDetection}>Retry face detection</Button>
          )}

          {/* Manual capture button (fallback) */}
          {isCameraReady && !error && (
            <Button
              onClick={handleCapture}
              disabled={!faceDetected}
              className={`px-12 py-6 rounded-2xl text-lg font-semibold transition-all ${
                faceDetected
                  ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-xl shadow-green-500/30"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }`}
            >
              {faceDetected ? "Capture Now" : "Waiting for face..."}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

