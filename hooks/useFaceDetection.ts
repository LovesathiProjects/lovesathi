"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { FaceDetector } from "@tensorflow-models/face-detection"
import assets from "@/lib/face-detection-assets.json"

export function useFaceDetection() {
  const [faceDetected, setFaceDetected] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [numFaces, setNumFaces] = useState(0)
  const [modelError, setModelError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const detectorRef = useRef<FaceDetector | null>(null)
  const generationRef = useRef(0)

  useEffect(() => {
    let mounted = true
    let timedOut = false
    const generation = ++generationRef.current
    const isCurrent = () => mounted && generationRef.current === generation && !timedOut
    setIsModelLoaded(false)
    setModelError(null)
    setFaceDetected(false)
    setNumFaces(0)

    const timeout = window.setTimeout(() => {
      if (!isCurrent()) return
      timedOut = true
      setModelError("Face detection could not load. Please retry before taking your selfie.")
    }, 15000)

    async function loadModel() {
      try {
        const faceDetection = await import("@tensorflow-models/face-detection")
        if (!isCurrent()) return
        const detector = await faceDetection.createDetector(faceDetection.SupportedModels.MediaPipeFaceDetector, {
          runtime: "mediapipe",
          modelType: "short",
          // Assets come from the pinned npm package and are served by the same app.
          solutionPath: `${window.location.origin}/vendor/face-detection/${assets.version}`,
        })
        if (!isCurrent()) { detector.dispose(); return }
        detectorRef.current = detector
        window.clearTimeout(timeout)
        setIsModelLoaded(true)
      } catch (error) {
        window.clearTimeout(timeout)
        if (!isCurrent()) return
        console.error("Face detection model could not load:", error)
        setModelError("Face detection could not load. Please retry before taking your selfie.")
      }
    }
    void loadModel()

    return () => {
      mounted = false
      window.clearTimeout(timeout)
      if (generationRef.current === generation) {
        generationRef.current += 1
        detectorRef.current?.dispose()
        detectorRef.current = null
      }
    }
  }, [attempt])

  const detectFace = useCallback(async (video: HTMLVideoElement) => {
    const detector = detectorRef.current
    const generation = generationRef.current
    if (!detector || !isModelLoaded || video.readyState !== 4 || !video.videoWidth) return
    try {
      const faces = await detector.estimateFaces(video, { flipHorizontal: false })
      if (detectorRef.current !== detector) return []
      setFaceDetected(faces.length === 1)
      setNumFaces(faces.length)
      return faces
    } catch (error) {
      if (generationRef.current !== generation) return []
      console.error("Face detection failed:", error)
      setFaceDetected(false)
      setNumFaces(0)
      return []
    }
  }, [isModelLoaded])

  const cleanup = useCallback(() => {
    generationRef.current += 1
    const detector = detectorRef.current
    detectorRef.current = null
    detector?.dispose()
    setIsModelLoaded(false)
    setFaceDetected(false)
    setNumFaces(0)
  }, [])
  const retry = useCallback(() => { cleanup(); setAttempt((value) => value + 1) }, [cleanup])

  return { faceDetected, numFaces, isModelLoaded, modelError, detectFace, cleanup, retry }
}
