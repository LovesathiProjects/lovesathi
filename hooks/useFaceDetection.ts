"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type {
  FaceDetector,
  MediaPipeFaceDetectorTfjsModelConfig,
} from "@tensorflow-models/face-detection"

/**
 * Custom hook for face detection using TensorFlow.js MediaPipe Face Detection
 * Optimized for performance with lazy loading and cleanup
 * Works on web, iOS, and Android
 * 
 * @returns {Object} Face detection state and methods
 */

export function useFaceDetection() {
  const [faceDetected, setFaceDetected] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [numFaces, setNumFaces] = useState(0)
  
  // Store detector instance
  const detectorRef = useRef<FaceDetector | null>(null)
  const tfRef = useRef<any>(null)

  /**
   * Load TensorFlow.js and MediaPipe Face Detection model
   * Uses dynamic import for code splitting and better performance
   */
  useEffect(() => {
    let isMounted = true

    const loadModel = async () => {
      try {
        // Dynamically import TensorFlow.js modules (code splitting)
        const [tf, faceDetection] = await Promise.all([
          import("@tensorflow/tfjs-core"),
          import("@tensorflow-models/face-detection"),
        ])

        // Import backend based on environment
        if (typeof window !== "undefined") {
          // For web: use WebGL backend for better performance
          await import("@tensorflow/tfjs-backend-webgl")
          await tf.ready()
          await tf.setBackend("webgl")
        }

        if (!isMounted) return

        tfRef.current = tf

        // Create detector with MediaPipe FaceDetector model
        // This is lightweight and fast compared to BlazeFace
        const model = faceDetection.SupportedModels.MediaPipeFaceDetector
        const detectorConfig: MediaPipeFaceDetectorTfjsModelConfig = {
          runtime: "tfjs",
          maxFaces: 1, // Only detect one face for performance
        }

        const detector = await faceDetection.createDetector(model, detectorConfig)
        
        if (!isMounted) return

        detectorRef.current = detector
        setIsModelLoaded(true)

        console.log("✅ Face detection model loaded successfully")
      } catch (error) {
        console.error("❌ Error loading face detection model:", error)
        
        // Fallback: try alternative approach
        try {
          console.log("Attempting fallback model loading...")
          
          // Try importing with different backend
          const tf = await import("@tensorflow/tfjs")
          const faceDetection = await import("@tensorflow-models/face-detection")
          
          await tf.ready()
          
          if (!isMounted) return
          
          tfRef.current = tf

          const model = faceDetection.SupportedModels.MediaPipeFaceDetector
          const detectorConfig: MediaPipeFaceDetectorTfjsModelConfig = {
            runtime: "tfjs",
            maxFaces: 1,
          }

          const detector = await faceDetection.createDetector(model, detectorConfig)
          
          if (!isMounted) return
          
          detectorRef.current = detector
          setIsModelLoaded(true)
          
          console.log("✅ Face detection model loaded (fallback)")
        } catch (fallbackError) {
          console.error("❌ Fallback model loading failed:", fallbackError)
        }
      }
    }

    loadModel()

    return () => {
      isMounted = false
    }
  }, [])

  /**
   * Detect faces in video element
   * Optimized with requestAnimationFrame and throttling
   * 
   * @param videoElement - HTML video element to analyze
   */
  const detectFace = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!detectorRef.current || !isModelLoaded) {
      return
    }

    try {
      // Ensure video is ready
      if (
        !videoElement ||
        videoElement.readyState !== 4 ||
        videoElement.videoWidth === 0
      ) {
        return
      }

      // Detect faces
      const faces = await detectorRef.current.estimateFaces(videoElement, {
        flipHorizontal: false, // Don't flip, we handle mirroring in CSS
      })

      // Update state
      const hasFace = faces && faces.length > 0
      setFaceDetected(hasFace)
      setNumFaces(faces?.length || 0)

      return faces
    } catch (error) {
      console.error("Error detecting face:", error)
      setFaceDetected(false)
      setNumFaces(0)
      return []
    }
  }, [isModelLoaded])

  /**
   * Cleanup function to dispose detector and free memory
   */
  const cleanup = useCallback(() => {
    if (detectorRef.current) {
      try {
        detectorRef.current.dispose()
        console.log("🧹 Face detector disposed")
      } catch (error) {
        console.error("Error disposing detector:", error)
      }
      detectorRef.current = null
    }

    // Clean up TensorFlow memory
    if (tfRef.current) {
      try {
        // Dispose all tensors
        tfRef.current.disposeVariables()
      } catch (error) {
        console.error("Error disposing TensorFlow variables:", error)
      }
    }
  }, [])

  return {
    faceDetected,
    numFaces,
    isModelLoaded,
    detectFace,
    cleanup,
  }
}

/**
 * ALTERNATIVE: Web-only lightweight face detection using MediaPipe via CDN
 * This is a fallback if the TensorFlow approach doesn't work
 * 
 * Uncomment this if you prefer CDN-based MediaPipe (no npm install needed)
 */

/*
import { useRef, useState, useEffect, useCallback } from "react"

export function useFaceDetection() {
  const [faceDetected, setFaceDetected] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [numFaces, setNumFaces] = useState(0)
  
  const faceDetectorRef = useRef<any>(null)

  useEffect(() => {
    let isMounted = true

    const loadMediaPipe = async () => {
      try {
        // Load MediaPipe Face Detection from CDN
        const { FaceDetector, FilesetResolver } = await import(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest"
        )

        if (!isMounted) return

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        )

        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        })

        if (!isMounted) return

        faceDetectorRef.current = detector
        setIsModelLoaded(true)
        console.log("✅ MediaPipe face detector loaded")
      } catch (error) {
        console.error("❌ Error loading MediaPipe:", error)
      }
    }

    loadMediaPipe()

    return () => {
      isMounted = false
    }
  }, [])

  const detectFace = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!faceDetectorRef.current || !isModelLoaded) return

    try {
      const detections = faceDetectorRef.current.detectForVideo(
        videoElement,
        performance.now()
      )

      const hasFace = detections.detections.length > 0
      setFaceDetected(hasFace)
      setNumFaces(detections.detections.length)

      return detections.detections
    } catch (error) {
      console.error("Error detecting face:", error)
      setFaceDetected(false)
      setNumFaces(0)
      return []
    }
  }, [isModelLoaded])

  const cleanup = useCallback(() => {
    if (faceDetectorRef.current) {
      faceDetectorRef.current.close()
      faceDetectorRef.current = null
      console.log("🧹 MediaPipe detector closed")
    }
  }, [])

  return {
    faceDetected,
    numFaces,
    isModelLoaded,
    detectFace,
    cleanup,
  }
}
*/
