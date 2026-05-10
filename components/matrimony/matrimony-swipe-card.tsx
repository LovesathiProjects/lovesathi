"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Check, X, Info, MoreHorizontal, MapPin, Briefcase, GraduationCap, Users, ChevronLeft, ChevronRight, Flag, Star, ImageIcon, Sparkles, Phone, Crown } from "lucide-react"
import { cn } from "@/lib/utils"
import { SwipeAnimations, useSwipeAnimation } from "../discovery/swipe-animations"
import { MatrimonyProfileModal } from "./matrimony-profile-modal"
import { getMatrimonyProfile, type MatrimonyProfileFull } from "@/lib/matrimonyService"
import { ReportDialog } from "@/components/chat/report-dialog"
import { useToast } from "@/hooks/use-toast"
import { formatPublicProfileName, getDisplayInitial } from "@/lib/displayName"

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
  viewerIsPremium?: boolean
  demo?: boolean
  visibilityLabel?: string
  bio?: string
  interests?: string[]
  education?: string
  phoneMasked?: string
  phone?: string
  canRevealPhone?: boolean
  onConnect: () => boolean | void | Promise<boolean | void>
  onNotNow: () => boolean | void | Promise<boolean | void>
  onSuperLike?: () => boolean | void | Promise<boolean | void>
  onPhoneUpgrade?: () => void
  onRevealPhone?: (profileId: string) => Promise<string | null>
  onPremiumProfileUpgrade?: () => void
  onProfileClick?: () => void
  currentUserId?: string | null
  stackIndex?: number // 0 is top, then 1,2 for depth visuals
  isShortlisted?: boolean
  onToggleShortlist?: () => Promise<any> | void
  swipeLocked?: boolean
  onSwipeLocked?: () => void
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
  viewerIsPremium = false,
  demo,
  visibilityLabel,
  bio,
  interests,
  education,
  phoneMasked,
  phone,
  canRevealPhone = false,
  onConnect,
  onNotNow,
  onSuperLike,
  onPhoneUpgrade,
  onRevealPhone,
  onPremiumProfileUpgrade,
  currentUserId,
  stackIndex = 0,
  isShortlisted = false,
  onToggleShortlist,
  swipeLocked = false,
  onSwipeLocked,
}: MatrimonySwipeCardProps) {
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [imageLoadFailed, setImageLoadFailed] = useState(false)
  const [expandedPhotoIndex, setExpandedPhotoIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [fullProfile, setFullProfile] = useState<MatrimonyProfileFull | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [shortlistBusy, setShortlistBusy] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [revealedPhone, setRevealedPhone] = useState<string | null>(phone || null)
  const [superLikeCue, setSuperLikeCue] = useState(false)
  const lastTapAtRef = React.useRef(0)
  const { toast } = useToast()
  const isTopCard = stackIndex === 0
  const safePhotos = useMemo(
    () => photos.filter((photo) => typeof photo === "string" && photo.trim().length > 0),
    [photos],
  )
  const activePhoto = safePhotos[currentPhotoIndex] || null

  useEffect(() => {
    if (safePhotos.length > 0 && currentPhotoIndex > safePhotos.length - 1) {
      setCurrentPhotoIndex(0)
    }
  }, [currentPhotoIndex, safePhotos.length])

  useEffect(() => {
    setImageLoadFailed(false)
  }, [activePhoto])

  useEffect(() => {
    setRevealedPhone(phone || null)
  }, [phone, profileId])

  const handleReportClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isTopCard && currentUserId) {
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

  const { animation, showHeartBurst, hideAnimation } = useSwipeAnimation()
  
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
    const scale = 1 - stackIndex * 0.035
    const translateY = stackIndex * 10
    const translateX = stackIndex * 6
    const opacity = Math.max(0.36, 1 - stackIndex * 0.22)
    const rotate = stackIndex * 1.2
    
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
      if (currentPhotoIndex < safePhotos.length - 1) {
        setCurrentPhotoIndex((prev) => prev + 1)
      }
    } else {
      // Left side - previous photo
      if (currentPhotoIndex > 0) {
        setCurrentPhotoIndex((prev) => prev - 1)
      }
    }
  }

  const resetSwipePosition = () => {
    animate(x, 0, {
      type: "spring",
      stiffness: 400,
      damping: 35,
      mass: 0.6,
    })
    animate(y, 0, {
      type: "spring",
      stiffness: 400,
      damping: 35,
      mass: 0.6,
    })
  }

  const handleLockedSwipeAttempt = () => {
    resetSwipePosition()
    onSwipeLocked?.()
  }

  const handleDragEnd = (event: any, info: any) => {
    // Lower threshold for easier swiping, better velocity detection
    const threshold = 80
    const velocity = info.velocity.x
    const velocityThreshold = 300 // Lower velocity threshold for more responsive swipes
    
    // Use both distance and velocity for more natural feel
    const shouldConnect = info.offset.x > threshold || velocity > velocityThreshold
    const shouldNotNow = info.offset.x < -threshold || velocity < -velocityThreshold

    if ((shouldConnect || shouldNotNow) && swipeLocked) {
      handleLockedSwipeAttempt()
      return
    }
    
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
        void Promise.resolve(onConnect()).then((result) => {
          if (result === false) resetSwipePosition()
        })
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
        void Promise.resolve(onNotNow()).then((result) => {
          if (result === false) resetSwipePosition()
        })
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
    if (premiumLocked) {
      onPremiumProfileUpgrade?.()
      toast({
        title: "Premium profile details",
        description: "Subscribe to view full details for premium members.",
      })
      return
    }
    if (isTopCard) {
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
    const profilePhotos = fullProfile?.photos || safePhotos
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

  const cardInitial = getDisplayInitial(name)
  const displayName = formatPublicProfileName(name)
  const modalDisplayName = formatPublicProfileName(fullProfile?.name || name)
  const phoneIsRevealed = Boolean(revealedPhone || phone)
  const displayPhone = revealedPhone || phone || phoneMasked
  const premiumLocked = Boolean(premium && !viewerIsPremium)

  const handlePhoneClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (premiumLocked) {
      onPremiumProfileUpgrade?.()
      return
    }
    if (phoneIsRevealed) return
    if (canRevealPhone && onRevealPhone) {
      try {
        const nextPhone = await onRevealPhone(profileId)
        if (nextPhone) {
          setRevealedPhone(nextPhone)
          toast({
            title: "Contact revealed",
            description: "This profile contact is now saved to your premium reveals.",
          })
        }
      } catch (error: any) {
        toast({
          title: "Could not reveal contact",
          description: error.message || "Please try again.",
          variant: "destructive",
        })
      }
      return
    }
    onPhoneUpgrade?.()
    toast({
      title: "Premium contact reveal",
      description: "Subscribe to reveal phone numbers safely inside Lovesathi.",
    })
  }

  const triggerSuperLike = () => {
    if (!onSuperLike) return
    if (swipeLocked) {
      handleLockedSwipeAttempt()
      return
    }
    setSuperLikeCue(true)
    animate(y, -42, { duration: 0.22, ease: "easeOut" })
    setTimeout(() => setSuperLikeCue(false), 520)
    setTimeout(() => {
      void Promise.resolve(onSuperLike()).then((result) => {
        if (result === false) resetSwipePosition()
      })
    }, 120)
  }

  const handleDoubleTapSuperLike = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isTopCard || isFlipped || swipeLocked) return
    const target = e.target as HTMLElement
    if (target.closest("button,a,input,textarea,select,[role='button']")) return

    const now = Date.now()
    if (now - lastTapAtRef.current < 320) {
      e.stopPropagation()
      lastTapAtRef.current = 0
      triggerSuperLike()
      return
    }

    lastTapAtRef.current = now
  }

  const handleSuperLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    triggerSuperLike()
  }

  return (
    <>
      {/* Swipe Animations */}
      <SwipeAnimations 
        show={isTopCard && animation.show} 
        type={animation.type} 
        onComplete={hideAnimation}
        hideOverlay={true}
      />

      <motion.div
        className={cn(
          "w-full max-w-[min(92vw,470px)] cursor-grab active:cursor-grabbing select-none touch-none",
          "relative rounded-[2.65rem] transform-gpu will-change-transform",
          // 3D perspective container
          "perspective-[1200px]",
          // Base height for card expansion calculation
          isTopCard && isFlipped ? "h-[min(78dvh,720px)] sm:h-[min(84dvh,760px)] md:h-[min(84dvh,760px)]" : "h-[min(64svh,610px)] md:h-[min(72dvh,680px)]",
          // Enhanced shadows for realistic depth
          // Full-view shadow for Matrimony: soft grey shadow when flipped (elevated card appearance)
          isTopCard && isFlipped && "shadow-[0_8px_32px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.1)]",
          // Regular stack shadows when not flipped
          isTopCard && !isFlipped && "shadow-[0_26px_70px_-22px_rgba(24,17,13,0.46),0_12px_34px_-18px_rgba(194,165,116,0.28),inset_0_1px_0_rgba(255,255,255,0.32)]",
          stackIndex === 1 && "shadow-[0_18px_52px_-18px_rgba(24,17,13,0.42),0_8px_25px_-8px_rgba(0,0,0,0.25)]",
          stackIndex === 2 && "shadow-[0_12px_38px_-14px_rgba(24,17,13,0.34),0_6px_20px_-6px_rgba(0,0,0,0.2)]",
          stackIndex > 2 && "shadow-[0_8px_25px_-8px_rgba(0,0,0,0.25),0_4px_15px_-4px_rgba(0,0,0,0.15)]",
          // Smooth transition for shadow changes
          "transition-shadow duration-500 ease-out",
        )}
        style={{
          x,
          y,
          rotate: isTopCard ? rotate : depthStyles.rotate,
          scale: isTopCard ? combinedScale : depthStyles.scale,
          translateY: depthStyles.translateY,
          translateX: depthStyles.translateX,
          zIndex: depthStyles.zIndex,
          opacity: isTopCard ? combinedOpacity : depthStyles.opacity,
        }}
        drag={isTopCard && !isFlipped}
        dragConstraints={{ left: -500, right: 500, top: -200, bottom: 200 }}
        dragElastic={0.28}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 420, bounceDamping: 38 }}
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
          className="relative h-full w-full rounded-[2.65rem]"
          style={{
            rotateY: rotateY,
            scale: isTopCard ? scaleValue : depthStyles.scale,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Front Side */}
          <motion.div
            className={cn(
              "absolute inset-0 h-full w-full overflow-hidden rounded-[2.65rem] border border-[#C2A574]/52 bg-[#3A2B24]",
              "ring-1 ring-white/30",
              "backface-hidden"
            )}
            style={{
              opacity: isTopCard ? frontOpacity : 1,
              rotateY: 0,
              transformStyle: "preserve-3d",
            }}
            onClick={isTopCard ? handlePhotoClick : undefined}
            onDoubleClick={(e) => {
              e.stopPropagation()
              if (!swipeLocked) triggerSuperLike()
            }}
            onTouchEnd={handleDoubleTapSuperLike}
          >
      {/* Background photo fills the card */}
      {activePhoto && !imageLoadFailed ? (
        <img
          src={activePhoto}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            premiumLocked && isTopCard && "scale-105 blur-[14px] brightness-90 saturate-75",
            !isTopCard && "brightness-75 saturate-90",
          )}
          onError={() => setImageLoadFailed(true)}
          crossOrigin="anonymous"
          decoding="async"
          loading={isTopCard ? "eager" : "lazy"}
          fetchPriority={isTopCard ? "high" : "low"}
        />
      ) : (
        <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_28%_14%,rgba(255,255,255,0.84),transparent_18rem),radial-gradient(circle_at_76%_0%,rgba(216,199,159,0.34),transparent_20rem),linear-gradient(145deg,#eceae5,#c8c3ba_48%,#8B7B70_100%)]">
          <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.20)_1px,transparent_1px)] [background-size:54px_54px]" />
          <div className="absolute left-1/2 top-[38%] flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/28 bg-white/18 text-[#ffffff] shadow-[0_24px_70px_rgba(24,17,13,0.22)] backdrop-blur-xl">
            <span className="font-serif text-6xl font-bold tracking-[-0.08em] drop-shadow-lg">{cardInitial}</span>
          </div>
          <div className="absolute left-1/2 top-[58%] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/24 bg-[#3A2B24]/24 px-4 py-2 text-xs font-bold text-[#ffffff] shadow-[0_18px_48px_rgba(24,17,13,0.18)] backdrop-blur-xl">
            <ImageIcon className="h-4 w-4" />
            Private portrait
          </div>
          <Sparkles className="absolute right-8 top-24 h-5 w-5 text-white/60" />
        </div>
      )}

      {premiumLocked && isTopCard && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#3A2B24]/18 backdrop-blur-[1px]">
          <div className="mx-8 rounded-[1.7rem] border border-[#C2A574]/45 bg-[#FBF8F3]/88 p-5 text-center shadow-[0_24px_70px_rgba(58,43,36,0.18)] backdrop-blur-xl">
            <Crown className="mx-auto h-7 w-7 text-[#C2A574]" />
            <p className="mt-3 luxe-kicker text-[0.58rem] text-[#C2A574]">premium profile</p>
            <p className="mt-2 text-sm font-bold leading-6 text-[#3A2B24]">
              Photo and full details unlock with a paid plan.
            </p>
          </div>
        </div>
      )}

      {/* Frosted glass overlay with gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.26),transparent_17rem),linear-gradient(to_bottom,rgba(24,17,13,0.06),rgba(24,17,13,0.10)_34%,rgba(24,17,13,0.88))]" />
      
      {/* Subtle frosted glass effect on top portion */}
      {isTopCard && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-transparent backdrop-blur-[0.35px]" />
          <div className="pointer-events-none absolute inset-[1px] z-10 rounded-[2.58rem] border border-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-18px_55px_rgba(194,165,116,0.10)]" />
          <div className="pointer-events-none absolute inset-x-10 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[#ffffff]/80 to-transparent" />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -left-1/2 top-0 z-10 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/18 to-transparent blur-sm"
            animate={{ x: ["0%", "430%"] }}
            transition={{ duration: 7.5, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
          />
        </>
      )}

      {/* Top-right controls */}
      {isTopCard && (
        <div className="absolute left-4 right-4 top-4 z-20 flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {verified && (
              <Badge className="border-white/20 bg-white/18 px-3 py-1 text-[#ffffff] shadow-lg backdrop-blur-xl">
                <Check className="h-3 w-3" />
                Verified
              </Badge>
            )}
            {premium && (
              <Badge className="border-[#C2A574]/50 bg-[#C2A574]/24 px-3 py-1 text-[#ffffff] shadow-lg backdrop-blur-xl">
                Premium
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
          {onToggleShortlist && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              aria-label={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
              aria-pressed={isShortlisted}
              onClick={handleShortlistClick}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border border-[#C2A574]/40 bg-[#3A2B24]/38 text-[#ffffff] shadow-[0_12px_34px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-colors",
                isShortlisted ? "border-[#C2A574] bg-[#C2A574]/72 text-[#C2A574]" : "hover:bg-[#3A2B24]/62",
                shortlistBusy && "opacity-60 pointer-events-none",
              )}
            >
              <Star className="w-4 h-4" fill={isShortlisted ? "currentColor" : "none"} strokeWidth={1.8} />
            </motion.button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-11 w-11 rounded-full border border-[#C2A574]/40 bg-[#3A2B24]/38 p-0 shadow-[0_12px_34px_rgba(0,0,0,0.2)] backdrop-blur-xl hover:bg-[#3A2B24]/62"
            onClick={handleInfoClick}
          >
            <MoreHorizontal className="h-4 w-4 text-[#ffffff]" />
          </Button>
          </div>
        </div>
      )}

      {isTopCard && safePhotos.length > 1 && (
        <div className="absolute left-5 right-5 top-[4.7rem] z-20 flex gap-1.5">
          {safePhotos.map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1 flex-1 rounded-full bg-white/34 shadow-[0_1px_8px_rgba(0,0,0,0.18)]",
                index === currentPhotoIndex && "bg-[#ffffff]",
              )}
            />
          ))}
        </div>
      )}

      {/* Bottom profile information overlay - Simplified design - hidden when flipped */}
      {isTopCard && !isFlipped && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          {/* Dark gradient overlay - strengthened for better text readability */}
          <div className="h-60 rounded-b-[2.65rem] bg-[linear-gradient(to_top,rgba(24,17,13,0.95)_0%,rgba(24,17,13,0.72)_42%,rgba(24,17,13,0.22)_78%,transparent_100%)]" />
          
          {/* Profile information - positioned above the buttons */}
          <div className="absolute bottom-20 left-5 right-5 z-10 matrimony-card-overlay-text sm:left-6 sm:right-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full border border-[#C2A574]/28 bg-[#ffffff]/12 px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.24em] text-[#C2A574] backdrop-blur-xl">
                private dossier
              </span>
              {premium && (
                <span className="rounded-full border border-[#C2A574]/36 bg-[#C2A574]/20 px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.22em] text-[#ffffff] backdrop-blur-xl">
                  premium
                </span>
              )}
            </div>
            <h2 
              className="matrimony-card-name mb-1 truncate font-serif text-4xl font-bold leading-[0.92] tracking-[-0.07em] sm:text-5xl"
              style={{ 
                color: '#FFFFFF',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)'
              }}
            >
              {displayName}, {age}
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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {height && (
                <span className="rounded-full border border-white/18 bg-white/14 px-3 py-1 text-xs font-bold text-[#ffffff] backdrop-blur">
                  {height}
                </span>
              )}
              {displayPhone && (
                <button
                  type="button"
                  onClick={handlePhoneClick}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold text-[#ffffff] backdrop-blur sm:text-sm",
                    phoneIsRevealed
                      ? "border-[#C2A574]/38 bg-[#C2A574]/24"
                      : "border-white/18 bg-white/14 hover:bg-white/22",
                  )}
                >
                  <Phone className="h-3.5 w-3.5" />
                  {displayPhone}
                </button>
              )}
              {(fullProfile?.cultural?.religion || fullProfile?.cultural?.community || community) && (
                <div 
                  className="matrimony-card-profession rounded-full border border-white/18 bg-white/14 px-3 py-1 text-xs font-bold backdrop-blur sm:text-sm"
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
                  className="matrimony-card-profession rounded-full border border-white/18 bg-white/14 px-3 py-1 text-xs font-bold backdrop-blur sm:text-sm"
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

      {isTopCard && !isFlipped && (
        <motion.div
          className="pointer-events-none absolute bottom-[5.15rem] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#C2A574]/36 bg-[#FBF8F3]/82 px-3.5 py-2 text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#8f6f37] shadow-[0_18px_42px_rgba(24,17,13,0.18)] backdrop-blur-xl"
          animate={superLikeCue ? { scale: [1, 1.08, 1], y: [0, -6, 0] } : { scale: 1, y: 0 }}
          transition={{ duration: 0.42, ease: "easeOut" }}
        >
          <Sparkles className="h-3.5 w-3.5 text-[#C2A574]" />
          Double tap to Super Like
        </motion.div>
      )}

      {/* Glass circle with X mark in bottom left corner */}
      {isTopCard && (
        <div className="absolute bottom-4 left-4 z-30">
          <motion.button
            type="button"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.92 }}
            className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-[#C2A574]/40 bg-[#3A2B24]/48 shadow-[0_18px_42px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl transition-colors duration-200 hover:bg-[#3A2B24]/64"
            onClick={(e) => {
              e.stopPropagation()
              if (swipeLocked) {
                handleLockedSwipeAttempt()
                return
              }
              // Swipe out (no X animation)
              animate(x, -1000, { 
                type: "spring",
                stiffness: 200,
                damping: 20,
                mass: 0.5
              })
              setTimeout(() => {
                void Promise.resolve(onNotNow()).then((result) => {
                  if (result === false) resetSwipePosition()
                })
              }, 300)
            }}
          >
            <X className="h-7 w-7 text-[#ffffff] drop-shadow-sm" />
          </motion.button>
        </div>
      )}

      {/* Glass circle with tick mark in bottom right corner */}
      {isTopCard && (
        <div className="absolute bottom-4 right-4 z-30">
          <motion.button
            type="button"
            whileHover={{ scale: 1.06, y: -3 }}
            whileTap={{ scale: 0.92 }}
            className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-[#C2A574]/60 bg-[linear-gradient(135deg,#C2A574_0%,#b0182f_42%,#c89645_100%)] shadow-[0_24px_56px_rgba(194,165,116,0.36),inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-xl transition-all duration-200 hover:brightness-110"
            onClick={(e) => {
              e.stopPropagation()
              if (swipeLocked) {
                handleLockedSwipeAttempt()
                return
              }
              // Trigger heart animation and swipe out
              showHeartBurst()
              animate(x, 1000, { duration: 0.4, ease: "easeInOut" })
              setTimeout(() => {
                void Promise.resolve(onConnect()).then((result) => {
                  if (result === false) resetSwipePosition()
                })
              }, 400)
            }}
          >
            <Check className="h-7 w-7 text-[#ffffff] drop-shadow-sm" />
          </motion.button>
        </div>
      )}


            {/* Visible card edges for stacked cards */}
            {!isTopCard && (
              <>
                {/* Right edge highlight */}
                <div className="absolute -right-1 top-2 bottom-2 w-2 rounded-r-full bg-gradient-to-b from-[#C2A574]/60 via-[#C2A574]/70 to-[#C2A574]/60 shadow-lg" />
                {/* Bottom edge highlight */}
                <div className="absolute -bottom-1 left-2 right-2 h-2 rounded-b-full bg-gradient-to-r from-[#C2A574]/36 via-[#C2A574]/50 to-[#C2A574]/36 shadow-lg" />
              </>
            )}

            {/* Dim overlay for behind cards to hide details */}
            {!isTopCard && <div className="absolute inset-0 rounded-[2.65rem] bg-white/30" />}
          </motion.div>

          {/* Back Side - Full Profile */}
          {isTopCard && (
            <motion.div
              className={cn(
                "absolute inset-0 w-full h-full overflow-y-auto overflow-x-hidden",
                "rounded-[2.65rem] border border-[#C2A574]/30 bg-[#F7F3EE]",
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
                <div className="absolute inset-0 flex items-center justify-center bg-[#F7F3EE]">
                  <div className="rounded-[1.5rem] border border-[#C2A574]/30 bg-white/78 p-6 text-center shadow-[0_18px_48px_rgba(24,17,13,0.1)]">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#C2A574] border-t-[#C2A574]" />
                    <p className="mt-3 text-sm font-bold text-[#3A2B24]">Opening profile dossier...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* White Header with Name and Age */}
                  <div className="sticky top-0 z-40 rounded-t-[2.65rem] border-b border-[#C2A574]/22 bg-[#F7F3EE]/88 shadow-[0_18px_45px_rgba(24,17,13,0.08)] backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-6">
                      <div className="min-w-0">
                        <p className="luxe-kicker text-[0.58rem] text-[#C2A574]">full profile dossier</p>
                        <h1 className="truncate font-serif text-2xl font-bold tracking-[-0.06em] text-[#3A2B24] sm:text-3xl">
                          {modalDisplayName}, {fullProfile?.age || age}
                        </h1>
                        {location && (
                          <div className="mt-1 flex items-center space-x-1 text-sm text-[#8B7B70]">
                            <MapPin className="w-3 h-3" />
                            <span>{location}</span>
                          </div>
                        )}
                        {displayPhone && (
                          <button
                            type="button"
                            onClick={handlePhoneClick}
                            className={cn(
                              "mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold",
                                phoneIsRevealed
                                  ? "border-[#C2A574]/34 bg-[#fff7df] text-[#3A2B24]"
                                  : "border-[#C2A574]/28 bg-white/72 text-[#8B7B70] hover:border-[#C2A574]/30",
                            )}
                          >
                            <Phone className="h-3.5 w-3.5 text-[#C2A574]" />
                            {displayPhone}
                          </button>
                        )}
                        {/* Religion/Caste and Profession */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {(fullProfile?.cultural?.religion || fullProfile?.cultural?.community || community) && (
                            <div className="rounded-full border border-[#C2A574]/24 bg-white/72 px-3 py-1 text-xs font-bold text-[#8B7B70]">
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
                            <div className="rounded-full border border-[#C2A574]/24 bg-white/72 px-3 py-1 text-xs font-bold text-[#8B7B70]">
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
                                "h-9 w-9 rounded-full p-0 sm:h-10 sm:w-10",
                                "border border-[#C2A574]/28 bg-white/78",
                                "hover:border-red-500 hover:bg-red-50 hover:scale-105",
                                "transition-all duration-200",
                                "shadow-lg"
                              )}
                              onClick={handleReportClick}
                              aria-label="Report profile"
                            >
                              <Flag className="h-4 w-4 text-[#3A2B24] sm:h-5 sm:w-5" />
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
                            "h-9 w-9 rounded-full p-0 sm:h-10 sm:w-10",
                            "border border-[#C2A574]/28 bg-white/78",
                            "hover:bg-[#EFE7DB] hover:scale-105",
                            "transition-all duration-200",
                            "shadow-lg"
                          )}
                          onClick={handleInfoClick}
                          aria-label="Close profile"
                        >
                          <X className="h-4 w-4 text-[#3A2B24] sm:h-5 sm:w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="relative overflow-hidden bg-[linear-gradient(180deg,#F7F3EE,#EFE7DB_55%,#F7F3EE)]">
                    {/* Photo Gallery Section */}
                    <div className="relative w-full px-4 pt-6 sm:px-6">
                      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-[1.5rem] border border-[#C2A574]/24 shadow-[0_18px_48px_rgba(24,17,13,0.12)] sm:rounded-[1.8rem]">
                        {(() => {
                          const profilePhotos = fullProfile?.photos || photos
                          const currentPhoto = profilePhotos[expandedPhotoIndex] || "/placeholder.svg"
                          
                          return (
                            <>
                              <img
                                src={currentPhoto}
                                alt={`Photo ${expandedPhotoIndex + 1}`}
                                className="h-full w-full object-cover"
                              />
                            
                            {/* Photo Navigation Arrows */}
                            {profilePhotos.length > 1 && (
                              <>
                                {expandedPhotoIndex > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute left-2 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full border border-[#C2A574]/30 bg-white/90 shadow-md hover:bg-white"
                                    onClick={(e) => handlePhotoNavigation('prev', e)}
                                  >
                                    <ChevronLeft className="w-5 h-5 text-black" />
                                  </Button>
                                )}
                                {expandedPhotoIndex < profilePhotos.length - 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-2 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full border border-[#C2A574]/30 bg-white/90 shadow-md hover:bg-white"
                                    onClick={(e) => handlePhotoNavigation('next', e)}
                                  >
                                    <ChevronRight className="w-5 h-5 text-black" />
                                  </Button>
                                )}
                                
                                {/* Photo Counter */}
                                <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#C2A574]/30 bg-white/90 px-3 py-1 text-xs font-bold text-[#3A2B24] shadow-md backdrop-blur-sm">
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
                    <div className="space-y-5 px-4 py-6 sm:px-6">
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
                      {displayPhone && (
                        <div className="rounded-[1.5rem] border border-[#C2A574]/24 bg-white/78 p-4 shadow-[0_14px_40px_rgba(24,17,13,0.06)]">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="luxe-kicker text-[0.58rem] text-[#C2A574]">premium contact</p>
                              <p className="mt-1 font-bold text-[#3A2B24]">{displayPhone}</p>
                              <p className="mt-1 text-xs leading-5 text-[#8B7B70]">
                                {phoneIsRevealed
                                  ? "This contact is revealed through your active plan."
                                  : canRevealPhone
                                    ? "Included in your plan. Tap to reveal and count it as a contact view."
                                    : "Masked for free users. Tap to unlock contact reveal."}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handlePhoneClick}
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#C2A574] text-[#3A2B24] shadow-[0_14px_32px_rgba(194,165,116,0.22)]"
                            >
                              <Phone className="h-4 w-4" />
                            </button>
                          </div>
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
                                  fullProfile.family.father_occupation && `Father - ${fullProfile.family.father_occupation}`,
                                  fullProfile.family.mother_occupation && `Mother - ${fullProfile.family.mother_occupation}`
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

                      <div className="pt-6 text-center">
                        <button
                          type="button"
                          onClick={handleSuperLikeClick}
                          className="rounded-full border border-[#C2A574]/36 bg-[#FBF8F3]/86 px-4 py-2 text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#8f6f37] shadow-[0_14px_34px_rgba(58,43,36,0.12)] transition-colors hover:bg-[#F7F3EE]"
                        >
                          Double tap card to Super Like
                        </button>
                      </div>

                      {/* Action Buttons at Bottom */}
                      <div className="flex items-center justify-center space-x-6 pt-4 pb-8">
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent border-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (swipeLocked) {
                              handleLockedSwipeAttempt()
                              return
                            }
                            handleInfoClick(e)
                            setTimeout(() => {
                              void Promise.resolve(onNotNow()).then((result) => {
                                if (result === false) resetSwipePosition()
                              })
                            }, 300)
                          }}
                        >
                          <X className="w-8 h-8 sm:w-10 sm:h-10" />
                        </Button>

                        <Button
                          size="lg"
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0 bg-gradient-to-r from-[#D2BA86] to-[#C2A574] hover:from-[#C2A574] hover:to-[#B9975E] text-[#3A2B24] shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (swipeLocked) {
                              handleLockedSwipeAttempt()
                              return
                            }
                            handleInfoClick(e)
                            setTimeout(() => {
                              void Promise.resolve(onConnect()).then((result) => {
                                if (result === false) resetSwipePosition()
                              })
                            }, 300)
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
    {isTopCard && (
    <MatrimonyProfileModal
      profile={{
        id: profileId,
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
        demo,
        visibilityLabel,
        phoneMasked,
        phone,
        canRevealPhone,
      }}
      open={showProfileModal}
      onOpenChange={setShowProfileModal}
      onPhoneUpgrade={onPhoneUpgrade}
      onRevealPhone={onRevealPhone}
      onConnect={() => {
        if (swipeLocked) {
          onSwipeLocked?.()
          return
        }
        setShowProfileModal(false)
        void onConnect()
      }}
      onNotNow={() => {
        if (swipeLocked) {
          onSwipeLocked?.()
          return
        }
        setShowProfileModal(false)
        void onNotNow()
      }}
    />
    )}

    {/* Report Dialog */}
    {isTopCard && currentUserId && (
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        reportedUserId={profileId}
        reporterId={currentUserId}
        matchType="matrimony"
        userName={displayName}
        onSuccess={handleReportSuccess}
      />
    )}
    </>
  )
}
