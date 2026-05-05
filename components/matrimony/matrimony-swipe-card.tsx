"use client"

import React, { useState, useRef, useEffect, useMemo } from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Check, X, Info, MoreHorizontal, MapPin, Briefcase, GraduationCap, Users, ChevronLeft, ChevronRight, Flag, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { SwipeAnimations, useSwipeAnimation } from "../discovery/swipe-animations"
import { MatrimonyProfileModal } from "./matrimony-profile-modal"
import { getMatrimonyProfile, type MatrimonyProfileFull } from "@/lib/matrimonyService"
import { ReportDialog } from "@/components/chat/report-dialog"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/hooks/use-toast"

interface MatrimonySwipeCardProps {
  profileId: string // user_id for fetching full profile
  name: string
  age: number
  height?: string
  profession: string
  community?: string
  location: string
  photos: string[] // Changed from avatar to photos array
  verified?: boolean
  premium?: boolean
  bio?: string
  interests?: string[]
  education?: string
  onConnect: () => void
  onNotNow: () => void
  onProfileClick?: () => void
  stackIndex?: number // 0 is top, then 1,2 for depth visuals
  isShortlisted?: boolean
  onToggleShortlist?: () => Promise<any> | void
}

export function MatrimonySwipeCard({
  profileId,
  name,
  age,
  height,
  profession,
  community,
  location,
  photos,
  verified,
  premium,
  bio,
  interests,
  education,
  onConnect,
  onNotNow,
  onProfileClick,
  stackIndex = 0,
  isShortlisted = false,
  onToggleShortlist,
}: MatrimonySwipeCardProps) {
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [expandedPhotoIndex, setExpandedPhotoIndex] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [fullProfile, setFullProfile] = useState<MatrimonyProfileFull | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [shortlistBusy, setShortlistBusy] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const { toast } = useToast()
  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  const handleReportClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentUserId) {
      setShowReportDialog(true)
    }
  }

  const handleReportSuccess = () => {
    toast({
      title: "Report Submitted",
      description: "Thank you for helping keep our community safe.",
    })
  }

  const handleShortlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onToggleShortlist || shortlistBusy) return
    setShortlistBusy(true)
    try {
      await onToggleShortlist()
    } finally {
      setShortlistBusy(false)
    }
  }

  const { animation, showHeartBurst, showXBurst, hideAnimation } = useSwipeAnimation()
  
  // Motion value for 3D rotation
  const rotateY = useMotionValue(0)

  // Framer Motion values for smooth dragging
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  // Transform motion values to rotation with smoother curve
  const rotate = useTransform(x, [-400, 400], [-25, 25])
  
  // Visual feedback during drag - opacity and scale (renamed to avoid conflicts)
  const dragOpacity = useTransform(x, [-400, -100, 100, 400], [0.7, 1, 1, 0.7])
  const dragScale = useTransform(x, [-400, 0, 400], [0.95, 1, 0.95])
  
  // Like/Pass overlay opacity based on drag direction
  const likeOverlayOpacity = useTransform(x, [0, 100, 200], [0, 0.3, 0.6])
  const passOverlayOpacity = useTransform(x, [0, -100, -200], [0, 0.3, 0.6])

  const depthStyles = useMemo(() => {
    // Enhanced visual stacking for realistic deck-of-cards effect
    const scale = 1 - stackIndex * 0.04 // Slightly less scaling for more subtle effect
    const translateY = stackIndex * 12 // Vertical offset - cards stack downward
    const translateX = stackIndex * 8  // Horizontal offset - cards shift right
    const opacity = Math.max(0.3, 1 - stackIndex * 0.25) // Keep cards more visible
    const rotate = stackIndex * 1.5 // Slight rotation for natural look
    
    return { 
      scale, 
      translateY, 
      translateX, 
      opacity, 
      rotate,
      zIndex: 30 - stackIndex 
    }
  }, [stackIndex])

  const handlePhotoClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Prevent photo click if dragging or if drag offset is significant
    if (Math.abs(x.get()) > 8) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const cardWidth = rect.width

    if (clickX > cardWidth / 2) {
      // Right side - next photo
      if (currentPhotoIndex < photos.length - 1) {
        setCurrentPhotoIndex((prev) => prev + 1)
      }
    } else {
      // Left side - previous photo
      if (currentPhotoIndex > 0) {
        setCurrentPhotoIndex((prev) => prev - 1)
      }
    }
  }

  const handleDragEnd = (event: any, info: any) => {
    // Lower threshold for easier swiping, better velocity detection
    const threshold = 80
    const velocity = info.velocity.x
    const velocityThreshold = 300 // Lower velocity threshold for more responsive swipes
    
    // Use both distance and velocity for more natural feel
    const shouldConnect = info.offset.x > threshold || velocity > velocityThreshold
    const shouldNotNow = info.offset.x < -threshold || velocity < -velocityThreshold
    
    if (shouldConnect) {
      // Connect - trigger heart animation and swipe out with smooth spring
      showHeartBurst()
      animate(x, 1000, { 
        type: "spring",
        stiffness: 200,
        damping: 20,
        mass: 0.5
      })
      setTimeout(() => {
        onConnect()
      }, 300)
    } else if (shouldNotNow) {
      // Not Now - swipe out with smooth spring (no X animation)
      animate(x, -1000, { 
        type: "spring",
        stiffness: 200,
        damping: 20,
        mass: 0.5
      })
      setTimeout(() => {
        onNotNow()
      }, 300)
    } else {
      // Reset card position smoothly with optimized spring animation
      animate(x, 0, { 
        type: "spring",
        stiffness: 400,
        damping: 35,
        mass: 0.6
      })
      animate(y, 0, { 
        type: "spring",
        stiffness: 400,
        damping: 35,
        mass: 0.6
      })
    }
  }

  const handleInfoClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (stackIndex === 0) {
      const newFlippedState = !isFlipped
      setIsFlipped(newFlippedState)
      
      // Reset photo index when flipping
      if (newFlippedState) {
        setExpandedPhotoIndex(0)
      }
      
      // Fetch full profile data when flipping to back side
      if (newFlippedState && !fullProfile) {
        setLoadingProfile(true)
        try {
          const result = await getMatrimonyProfile(profileId)
          if (result.success && result.data) {
            setFullProfile(result.data as MatrimonyProfileFull)
          }
        } catch (error) {
          console.error("Error fetching full profile:", error)
        } finally {
          setLoadingProfile(false)
        }
      }
      
      animate(rotateY, newFlippedState ? 180 : 0, {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1], // Custom cubic-bezier for natural motion
      })
    }
  }
  
  const handlePhotoNavigation = (direction: 'prev' | 'next', e?: React.MouseEvent) => {
    e?.stopPropagation()
    const profilePhotos = fullProfile?.photos || photos
    if (direction === 'next' && expandedPhotoIndex < profilePhotos.length - 1) {
      setExpandedPhotoIndex(prev => prev + 1)
    } else if (direction === 'prev' && expandedPhotoIndex > 0) {
      setExpandedPhotoIndex(prev => prev - 1)
    }
  }

  // Transform rotateY to scale for slight expansion during flip
  const scaleValue = useTransform(rotateY, [0, 90, 180], [1, 1.05, 1])
  
  // Transform for back side opacity (fade in as card turns)
  const backOpacity = useTransform(rotateY, [90, 180], [0, 1])
  const frontOpacity = useTransform(rotateY, [0, 90], [1, 0])
  
  // Combined transforms for final style values
  // Use useTransform to combine drag feedback with depth styles
  const combinedScale = useTransform(
    dragScale,
    (ds) => ds * depthStyles.scale
  )
  const combinedOpacity = useTransform(
    dragOpacity,
    (doVal) => doVal * depthStyles.opacity
  )

  // Prepare highlight items for back side
  const highlightItems = [
    { label: "Location", value: location, icon: MapPin },
    { label: "Profession", value: profession, icon: Briefcase },
    { label: "Education", value: education, icon: GraduationCap },
    { label: "Community", value: community, icon: Users },
  ].filter((item) => item.value && item.value.trim().length > 0)

  const getInitial = (value?: string) => {
    const trimmed = value?.trim()
    return trimmed && trimmed.length > 0 ? trimmed[0]!.toUpperCase() : "?"
  }

  const cardInitial = getInitial(name)

  return (
    <>
      {/* Swipe Animations */}
      <SwipeAnimations 
        show={animation.show} 
        type={animation.type} 
        onComplete={hideAnimation}
        hideOverlay={true}
      />

      <motion.div
        className={cn(
          "w-full max-w-sm cursor-grab active:cursor-grabbing select-none touch-none",
          "relative",
          // 3D perspective container
          "perspective-[1200px]",
          // Base height for card expansion calculation
          stackIndex === 0 && isFlipped ? "h-[77vh] sm:h-[84vh] md:h-[672px]" : "h-[60vh] md:h-[480px]",
          // Enhanced shadows for realistic depth
          // Full-view shadow for Matrimony: soft grey shadow when flipped (elevated card appearance)
          stackIndex === 0 && isFlipped && "shadow-[0_8px_32px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.1)]",
          // Regular stack shadows when not flipped
          stackIndex === 0 && !isFlipped && "shadow-[0_34px_90px_-18px_rgba(24,17,13,0.55),0_12px_38px_-10px_rgba(143,0,28,0.24)]",
          stackIndex === 1 && "shadow-[0_15px_45px_-12px_rgba(0,0,0,0.35),0_8px_25px_-8px_rgba(0,0,0,0.25)]",
          stackIndex === 2 && "shadow-[0_12px_35px_-10px_rgba(0,0,0,0.3),0_6px_20px_-6px_rgba(0,0,0,0.2)]",
          stackIndex > 2 && "shadow-[0_8px_25px_-8px_rgba(0,0,0,0.25),0_4px_15px_-4px_rgba(0,0,0,0.15)]",
          // Smooth transition for shadow changes
          "transition-shadow duration-300 ease-in-out",
        )}
        style={{
          x,
          y,
          rotate: stackIndex === 0 ? rotate : depthStyles.rotate,
          scale: stackIndex === 0 ? combinedScale : depthStyles.scale,
          translateY: depthStyles.translateY,
          translateX: depthStyles.translateX,
          zIndex: depthStyles.zIndex,
          opacity: stackIndex === 0 ? combinedOpacity : depthStyles.opacity,
        }}
        drag={stackIndex === 0 && !isFlipped ? true : false}
        dragConstraints={{ left: -500, right: 500, top: -200, bottom: 200 }}
        dragElastic={0.7}
        dragMomentum={true}
        dragTransition={{ bounceStiffness: 300, bounceDamping: 30 }}
        onDragEnd={handleDragEnd}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 35,
          mass: 0.6
        }}
      >
        {/* 3D Flip Container */}
        <motion.div
          className="relative w-full h-full"
          style={{
            rotateY: rotateY,
            scale: stackIndex === 0 ? scaleValue : depthStyles.scale,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Front Side */}
          <motion.div
            className={cn(
              "absolute inset-0 w-full h-full overflow-hidden rounded-[2rem] border border-[#d9b978]/30",
              "backface-hidden"
            )}
            style={{
              opacity: stackIndex === 0 ? frontOpacity : 1,
              rotateY: 0,
              transformStyle: "preserve-3d",
            }}
            onClick={handlePhotoClick}
          >
      {/* Background photo fills the card */}
      <img
        src={photos[currentPhotoIndex] || "/placeholder.svg"}
        alt=""
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-all duration-300",
          stackIndex === 1 && "blur-[2px] brightness-75 contrast-90",
          stackIndex === 2 && "blur-[4px] brightness-65 contrast-80",
          stackIndex > 2 && "blur-[6px] brightness-60 contrast-75",
        )}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          if (target.src !== "/placeholder.svg") {
            target.src = "/placeholder.svg"
          }
        }}
        crossOrigin="anonymous"
      />

      {/* Frosted glass overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#18110d]/8 via-transparent to-[#18110d]/78" />
      
      {/* Subtle frosted glass effect on top portion */}
      {stackIndex === 0 && (
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-transparent backdrop-blur-[0.5px]" />
      )}

      {/* Top-right controls */}
      {stackIndex === 0 && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {onToggleShortlist && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              aria-label={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
              aria-pressed={isShortlisted}
              onClick={handleShortlistClick}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border border-[#f2dfbd]/40 bg-[#18110d]/42 text-[#fffaf2] shadow-lg backdrop-blur transition-colors",
                isShortlisted ? "border-[#d9b978] bg-[#8f001c]/70 text-[#d9b978]" : "hover:bg-[#18110d]/62",
                shortlistBusy && "opacity-60 pointer-events-none",
              )}
            >
              <Star className="w-4 h-4" fill={isShortlisted ? "currentColor" : "none"} strokeWidth={1.8} />
            </motion.button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-full border border-[#f2dfbd]/40 bg-[#18110d]/42 p-0 backdrop-blur hover:bg-[#18110d]/62"
            onClick={handleInfoClick}
          >
            <MoreHorizontal className="h-4 w-4 text-[#fffaf2]" />
          </Button>
        </div>
      )}

      {/* Bottom profile information overlay - Simplified design - hidden when flipped */}
      {stackIndex === 0 && !isFlipped && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          {/* Dark gradient overlay - strengthened for better text readability */}
          <div 
            className="h-48 rounded-b-3xl" 
            style={{ 
              background: 'linear-gradient(to top, rgba(24,17,13,0.82) 0%, rgba(24,17,13,0.56) 44%, rgba(24,17,13,0.22) 74%, transparent 100%)'
            }} 
          />
          
          {/* Profile information - positioned above the buttons */}
          <div className="absolute bottom-20 left-4 right-4 z-10 matrimony-card-overlay-text">
            <h2 
              className="matrimony-card-name mb-1 font-serif text-3xl font-bold tracking-[-0.05em] sm:text-4xl" 
              style={{ 
                color: '#FFFFFF',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)'
              }}
            >
              {cardInitial}, {age}
            </h2>
            {location && (
              <div 
                className="matrimony-card-location flex items-center space-x-1 mb-1" 
                style={{ 
                  color: '#FFFFFF',
                  textShadow: '0 1px 3px rgba(0,0,0,0.4)'
                }}
              >
                <MapPin 
                  className="w-3 h-3 sm:w-4 sm:h-4" 
                  style={{ 
                    color: '#FFFFFF',
                    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))'
                  }} 
                />
                <span className="text-sm sm:text-base" style={{ color: '#FFFFFF' }}>{location}</span>
              </div>
            )}
            {/* Religion/Caste and Profession */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {(fullProfile?.cultural?.religion || fullProfile?.cultural?.community || community) && (
                <div 
                  className="matrimony-card-profession text-xs sm:text-sm" 
                  style={{ 
                    color: '#FFFFFF',
                    textShadow: '0 1px 3px rgba(0,0,0,0.4)'
                  }}
                >
                  {fullProfile?.cultural?.religion 
                    ? (fullProfile?.cultural?.community 
                        ? `${fullProfile.cultural.religion} / ${fullProfile.cultural.community}`
                        : fullProfile.cultural.religion)
                    : (fullProfile?.cultural?.community || community || 'N/A')}
                  {(profession || fullProfile?.career?.job_title) && (
                    <span style={{ color: '#FFFFFF' }}>, {fullProfile?.career?.job_title || profession}</span>
                  )}
                </div>
              )}
              {!(fullProfile?.cultural?.religion || fullProfile?.cultural?.community || community) && (profession || fullProfile?.career?.job_title) && (
                <div 
                  className="matrimony-card-profession text-xs sm:text-sm" 
                  style={{ 
                    color: '#FFFFFF',
                    textShadow: '0 1px 3px rgba(0,0,0,0.4)'
                  }}
                >
                  {fullProfile?.career?.job_title || profession}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Glass circle with X mark in bottom left corner */}
      {stackIndex === 0 && (
        <div className="absolute bottom-4 left-4 z-30">
          <div 
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-[#f2dfbd]/35 bg-[#18110d]/42 shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-[#18110d]/62"
            onClick={(e) => {
              e.stopPropagation()
              // Swipe out (no X animation)
              animate(x, -1000, { 
                type: "spring",
                stiffness: 200,
                damping: 20,
                mass: 0.5
              })
              setTimeout(() => {
                onNotNow()
              }, 300)
            }}
          >
            <X className="h-6 w-6 text-[#fffaf2] drop-shadow-sm" />
          </div>
        </div>
      )}

      {/* Glass circle with tick mark in bottom right corner */}
      {stackIndex === 0 && (
        <div className="absolute bottom-4 right-4 z-30">
          <div 
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-[#d9b978]/45 bg-[#8f001c]/80 shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-[#a90022]"
            onClick={(e) => {
              e.stopPropagation()
              // Trigger heart animation and swipe out
              showHeartBurst()
              animate(x, 1000, { duration: 0.4, ease: "easeInOut" })
              setTimeout(() => {
                onConnect()
              }, 400)
            }}
          >
            <Check className="h-6 w-6 text-[#fffaf2] drop-shadow-sm" />
          </div>
        </div>
      )}


            {/* Visible card edges for stacked cards */}
            {stackIndex > 0 && (
              <>
                {/* Right edge highlight */}
                <div className="absolute -right-1 top-2 bottom-2 w-2 rounded-r-full bg-gradient-to-b from-[#d9b978]/60 via-[#8f001c]/70 to-[#d9b978]/60 shadow-lg" />
                {/* Bottom edge highlight */}
                <div className="absolute -bottom-1 left-2 right-2 h-2 rounded-b-full bg-gradient-to-r from-[#d9b978]/36 via-[#8f001c]/50 to-[#d9b978]/36 shadow-lg" />
              </>
            )}

            {/* Dim overlay for behind cards to hide details */}
            {stackIndex > 0 && <div className="absolute inset-0 bg-white/30" />}
          </motion.div>

          {/* Back Side - Full Profile */}
          {stackIndex === 0 && (
            <motion.div
              className={cn(
                "absolute inset-0 w-full h-full overflow-y-auto overflow-x-hidden",
                "rounded-2xl sm:rounded-3xl",
                "backface-hidden",
                "hide-scrollbar"
              )}
              style={{
                opacity: backOpacity,
                rotateY: 180,
                transformStyle: "preserve-3d",
              }}
            >
              {loadingProfile ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <div className="text-black">Loading profile...</div>
                </div>
              ) : (
                <>
                  {/* White Header with Name and Age */}
                  <div className="sticky top-0 z-40 bg-white backdrop-blur-sm border-b border-[#E5E5E5] rounded-t-2xl sm:rounded-t-3xl">
                    <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
                      <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-black">
                          {fullProfile?.name || name}, {fullProfile?.age || age}
                        </h1>
                        {location && (
                          <div className="flex items-center space-x-1 text-[#444444] text-sm mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>{location}</span>
                          </div>
                        )}
                        {/* Religion/Caste and Profession */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {(fullProfile?.cultural?.religion || fullProfile?.cultural?.community || community) && (
                            <div className="text-[#444444] text-sm">
                              {fullProfile?.cultural?.religion 
                                ? (fullProfile?.cultural?.community 
                                    ? `${fullProfile.cultural.religion} / ${fullProfile.cultural.community}`
                                    : fullProfile.cultural.religion)
                                : (fullProfile?.cultural?.community || community || 'N/A')}
                              {(profession || fullProfile?.career?.job_title) && (
                                <span>, {fullProfile?.career?.job_title || profession}</span>
                              )}
                            </div>
                          )}
                          {!(fullProfile?.cultural?.religion || fullProfile?.cultural?.community || community) && (profession || fullProfile?.career?.job_title) && (
                            <div className="text-[#444444] text-sm">
                              {fullProfile?.career?.job_title || profession}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              className={cn(
                                "w-8 h-8 sm:w-9 sm:h-9 p-0 rounded-full",
                                "bg-gray-100 border border-[#E5E5E5]",
                                "hover:bg-red-50 hover:border-red-500 hover:scale-110",
                                "transition-all duration-200",
                                "shadow-lg"
                              )}
                              onClick={handleReportClick}
                              aria-label="Report profile"
                            >
                              <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="bg-red-500 text-white border-red-400">
                            <p>Report</p>
                          </TooltipContent>
                        </Tooltip>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className={cn(
                            "w-8 h-8 sm:w-9 sm:h-9 p-0 rounded-full",
                            "bg-gray-100 border border-[#E5E5E5]",
                            "hover:bg-gray-200 hover:scale-110",
                            "transition-all duration-200",
                            "shadow-lg"
                          )}
                          onClick={handleInfoClick}
                          aria-label="Close profile"
                        >
                          <X className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="relative bg-white overflow-hidden">
                    {/* Photo Gallery Section */}
                    <div className="relative w-full bg-white px-4 sm:px-6 pt-6">
                      <div className="relative w-full aspect-square mx-auto rounded-xl sm:rounded-2xl overflow-hidden">
                        {(() => {
                          const profilePhotos = fullProfile?.photos || photos
                          const currentPhoto = profilePhotos[expandedPhotoIndex] || "/placeholder.svg"
                          
                          return (
                            <>
                              <img
                                src={currentPhoto}
                                alt={`Photo ${expandedPhotoIndex + 1}`}
                                className="w-full h-full object-cover"
                              />
                            
                            {/* Photo Navigation Arrows */}
                            {profilePhotos.length > 1 && (
                              <>
                                {expandedPhotoIndex > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-[#E5E5E5] z-20 shadow-md"
                                    onClick={(e) => handlePhotoNavigation('prev', e)}
                                  >
                                    <ChevronLeft className="w-5 h-5 text-black" />
                                  </Button>
                                )}
                                {expandedPhotoIndex < profilePhotos.length - 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-[#E5E5E5] z-20 shadow-md"
                                    onClick={(e) => handlePhotoNavigation('next', e)}
                                  >
                                    <ChevronRight className="w-5 h-5 text-black" />
                                  </Button>
                                )}
                                
                                {/* Photo Counter */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-black text-xs z-20 border border-[#E5E5E5] shadow-md">
                                  {expandedPhotoIndex + 1} / {profilePhotos.length}
                                </div>
                              </>
                            )}
                          </>
                        )
                      })()}
                      </div>
                    </div>

                    {/* Profile Information Sections */}
                    <div className="px-4 sm:px-6 py-6 space-y-6">
                      {/* Height and Religion Section */}
                      {((fullProfile?.personal?.height_cm) || (fullProfile?.cultural?.religion)) && (
                        <div className="flex flex-wrap gap-4">
                          {fullProfile?.personal?.height_cm && (
                            <div className="text-black text-sm sm:text-base">
                              <span className="text-[#444444]">Height: </span>
                              {fullProfile.personal.height_unit === 'ft' 
                                ? (() => {
                                    const totalInches = Math.round(fullProfile.personal.height_cm! / 2.54)
                                    const feet = Math.floor(totalInches / 12)
                                    const inches = totalInches % 12
                                    return `${feet}'${inches}"`
                                  })()
                                : `${fullProfile.personal.height_cm} cm`}
                            </div>
                          )}
                          {fullProfile?.cultural?.religion && (
                            <div className="text-black text-sm sm:text-base">
                              <span className="text-[#444444]">Religion: </span>
                              {fullProfile.cultural.religion}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bio Section */}
                      {(fullProfile?.bio || bio) && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-black text-base sm:text-lg">About</h3>
                          <p className="text-black text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                            {fullProfile?.bio || bio}
                          </p>
                        </div>
                      )}

                      {/* Personal Details Section */}
                      {fullProfile?.personal && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-black text-base sm:text-lg">Personal Details</h3>
                          <div className="space-y-2">
                            {fullProfile.personal.complexion && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Complexion: </span>
                                {fullProfile.personal.complexion}
                              </div>
                            )}
                            {fullProfile.personal.body_type && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Body Type: </span>
                                {fullProfile.personal.body_type}
                              </div>
                            )}
                            {fullProfile.personal.diet && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Diet: </span>
                                {fullProfile.personal.diet}
                              </div>
                            )}
                            {fullProfile.personal.marital_status && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Marital Status: </span>
                                {fullProfile.personal.marital_status}
                              </div>
                            )}
                            {(fullProfile.personal.smoker !== undefined || fullProfile.personal.drinker !== undefined) && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Lifestyle: </span>
                                {[
                                  fullProfile.personal.smoker ? 'Smoker' : null,
                                  fullProfile.personal.drinker ? 'Drinker' : null
                                ].filter(Boolean).join(', ') || 'Non-smoker, Non-drinker'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Career & Education Section */}
                      {fullProfile?.career && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-black text-base sm:text-lg">Career & Education</h3>
                          <div className="space-y-2">
                            {fullProfile.career.highest_education && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Education: </span>
                                {fullProfile.career.highest_education}
                                {fullProfile.career.college && `, ${fullProfile.career.college}`}
                              </div>
                            )}
                            {fullProfile.career.job_title && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Profession: </span>
                                {fullProfile.career.job_title}
                                {fullProfile.career.company && ` at ${fullProfile.career.company}`}
                              </div>
                            )}
                            {fullProfile.career.annual_income && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Annual Income: </span>
                                {fullProfile.career.annual_income}
                              </div>
                            )}
                            {fullProfile.career.work_location && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Work Location: </span>
                                {[
                                  fullProfile.career.work_location.city,
                                  fullProfile.career.work_location.state,
                                  fullProfile.career.work_location.country
                                ].filter(Boolean).join(', ') || 'Not specified'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Family Information Section */}
                      {fullProfile?.family && fullProfile.family.show_on_profile && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-black text-base sm:text-lg">Family Information</h3>
                          <div className="space-y-2">
                            {fullProfile.family.family_type && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Family Type: </span>
                                {fullProfile.family.family_type}
                              </div>
                            )}
                            {fullProfile.family.family_values && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Family Values: </span>
                                {fullProfile.family.family_values}
                              </div>
                            )}
                            {(fullProfile.family.father_occupation || fullProfile.family.mother_occupation) && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Parents: </span>
                                {[
                                  fullProfile.family.father_occupation && `Father - ${fullProfile.family.father_occupation}${fullProfile.family.father_company ? ` (${fullProfile.family.father_company})` : ''}`,
                                  fullProfile.family.mother_occupation && `Mother - ${fullProfile.family.mother_occupation}${fullProfile.family.mother_company ? ` (${fullProfile.family.mother_company})` : ''}`
                                ].filter(Boolean).join(', ')}
                              </div>
                            )}
                            {(fullProfile.family.brothers !== undefined || fullProfile.family.sisters !== undefined) && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Siblings: </span>
                                {[
                                  fullProfile.family.brothers !== undefined && fullProfile.family.brothers > 0 && `${fullProfile.family.brothers} brother${fullProfile.family.brothers > 1 ? 's' : ''}`,
                                  fullProfile.family.sisters !== undefined && fullProfile.family.sisters > 0 && `${fullProfile.family.sisters} sister${fullProfile.family.sisters > 1 ? 's' : ''}`
                                ].filter(Boolean).join(', ') || 'None'}
                              </div>
                            )}
                            {fullProfile.family.siblings_married && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Siblings Married: </span>
                                {fullProfile.family.siblings_married}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cultural & Religious Section */}
                      {fullProfile?.cultural && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-black text-base sm:text-lg">Cultural & Religious</h3>
                          <div className="space-y-2">
                            {fullProfile.cultural.mother_tongue && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Mother Tongue: </span>
                                {fullProfile.cultural.mother_tongue}
                              </div>
                            )}
                            {fullProfile.cultural.community && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Community: </span>
                                {fullProfile.cultural.community}
                              </div>
                            )}
                            {fullProfile.cultural.sub_caste && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Sub-caste: </span>
                                {fullProfile.cultural.sub_caste}
                              </div>
                            )}
                            {fullProfile.cultural.date_of_birth && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Date of Birth: </span>
                                {new Date(fullProfile.cultural.date_of_birth).toLocaleDateString()}
                              </div>
                            )}
                            {fullProfile.cultural.time_of_birth && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Time of Birth: </span>
                                {fullProfile.cultural.time_of_birth}
                              </div>
                            )}
                            {fullProfile.cultural.place_of_birth && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Place of Birth: </span>
                                {fullProfile.cultural.place_of_birth}
                              </div>
                            )}
                            {fullProfile.cultural.star_raashi && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Star/Raashi: </span>
                                {fullProfile.cultural.star_raashi}
                              </div>
                            )}
                            {fullProfile.cultural.gotra && (
                              <div className="text-black text-sm sm:text-base">
                                <span className="text-[#444444]">Gotra: </span>
                                {fullProfile.cultural.gotra}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons at Bottom */}
                      <div className="flex items-center justify-center space-x-6 pt-6 pb-8">
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent border-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleInfoClick(e)
                            setTimeout(() => onNotNow(), 300)
                          }}
                        >
                          <X className="w-8 h-8 sm:w-10 sm:h-10" />
                        </Button>

                        <Button
                          size="lg"
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0 bg-gradient-to-r from-[#97011A] to-[#7A0115] hover:from-[#7A0115] hover:to-[#97011A] text-white shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleInfoClick(e)
                            setTimeout(() => onConnect(), 300)
                          }}
                        >
                          <Check className="w-8 h-8 sm:w-10 sm:h-10" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>

    {/* Profile Modal */}
    <MatrimonyProfileModal
      profile={{
        id: `${name}-${age}`,
        name,
        age,
        height,
        profession,
        community,
        location,
        photos,
        bio,
        interests,
        education,
        religion: community, // Using community as religion for now
        verified,
        premium,
      }}
      open={showProfileModal}
      onOpenChange={setShowProfileModal}
      onConnect={() => {
        setShowProfileModal(false)
        onConnect()
      }}
      onNotNow={() => {
        setShowProfileModal(false)
        onNotNow()
      }}
    />

    {/* Report Dialog */}
    {currentUserId && (
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        reportedUserId={profileId}
        reporterId={currentUserId}
        matchType="matrimony"
        userName={name || "User"}
        onSuccess={handleReportSuccess}
      />
    )}
    </>
  )
}
