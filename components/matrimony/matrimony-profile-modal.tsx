"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { X, MapPin, Briefcase, GraduationCap, Users, Share, Flag, Heart, ChevronLeft, ChevronRight, Phone } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MatrimonyProfile } from "@/lib/mockMatrimonyProfiles"

interface MatrimonyProfileModalProps {
  profile: MatrimonyProfile
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnect: () => void
  onNotNow: () => void
  onPhoneUpgrade?: () => void
}

export function MatrimonyProfileModal({ profile, open, onOpenChange, onConnect, onNotNow, onPhoneUpgrade }: MatrimonyProfileModalProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const displayPhone = profile.canRevealPhone ? profile.phone || profile.phoneMasked : profile.phoneMasked

  const handlePhotoClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const cardWidth = rect.width

    if (clickX > cardWidth / 2) {
      // Right side - next photo
      if (currentPhotoIndex < profile.photos.length - 1) {
        setCurrentPhotoIndex((prev) => prev + 1)
      }
    } else {
      // Left side - previous photo
      if (currentPhotoIndex > 0) {
        setCurrentPhotoIndex((prev) => prev - 1)
      }
    }
  }

  const nextPhoto = () => {
    if (currentPhotoIndex < profile.photos.length - 1) {
      setCurrentPhotoIndex((prev) => prev + 1)
    }
  }

  const prevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex((prev) => prev - 1)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md p-0 gap-0 max-h-[95vh] sm:max-h-[90vh] overflow-hidden bg-white mx-2 sm:mx-0 rounded-2xl sm:rounded-3xl shadow-2xl" showCloseButton={false}>
        <div className="flex flex-col h-full overflow-hidden rounded-2xl sm:rounded-3xl">
          {/* Photo Section */}
          <div className="relative h-80 sm:h-96 flex-shrink-0 overflow-hidden rounded-t-2xl sm:rounded-t-3xl" onClick={handlePhotoClick}>
            <img
              src={profile.photos[currentPhotoIndex] || "/placeholder.svg"}
              alt={`${profile.name} photo ${currentPhotoIndex + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                if (target.src !== "/placeholder.svg") {
                  target.src = "/placeholder.svg"
                }
              }}
              crossOrigin="anonymous"
            />

            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Photo navigation arrows */}
            {profile.photos.length > 1 && (
              <>
                {currentPhotoIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      prevPhoto()
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                )}
                {currentPhotoIndex < profile.photos.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      nextPhoto()
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                )}
              </>
            )}

            {/* Photo indicators */}
            {profile.photos.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
                {profile.photos.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      index === currentPhotoIndex ? "bg-white w-8" : "bg-white/40 w-1.5",
                    )}
                  />
                ))}
              </div>
            )}

            {/* Header Actions */}
            <div className="absolute top-4 right-4 flex space-x-2 z-20">
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full w-9 h-9 p-0 bg-black/40 backdrop-blur-sm hover:bg-black/60 border-0"
                onClick={(e) => {
                  e.stopPropagation()
                  // Share functionality
                }}
              >
                <Share className="w-4 h-4 text-white" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full w-9 h-9 p-0 bg-black/40 backdrop-blur-sm hover:bg-black/60 border-0"
                onClick={(e) => {
                  e.stopPropagation()
                  // Report functionality
                }}
              >
                <Flag className="w-4 h-4 text-white" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full w-9 h-9 p-0 bg-black/40 backdrop-blur-sm hover:bg-black/60 border-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenChange(false)
                }}
              >
                <X className="w-4 h-4 text-white" />
              </Button>
            </div>

            {/* Badges */}
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 z-20">
              {profile.verified && (
                <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1.5 font-medium shadow-lg">
                  Verified
                </Badge>
              )}
              {profile.premium && (
                <Badge className="bg-[#97011A] text-white text-xs px-3 py-1.5 font-medium shadow-lg">
                  Premium
                </Badge>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="p-5 sm:p-6 space-y-5">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {profile.name}, {profile.age}
                    {profile.height && <span className="text-xl sm:text-2xl font-normal text-gray-600"> • {profile.height}</span>}
                  </h1>
                  {profile.location && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm sm:text-base">{profile.location}</span>
                    </div>
                  )}
                  {displayPhone && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!profile.canRevealPhone) onPhoneUpgrade?.()
                      }}
                      className={cn(
                        "mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold",
                        profile.canRevealPhone
                          ? "border-[#97011A]/20 bg-[#97011A]/8 text-[#97011A]"
                          : "border-gray-200 bg-gray-50 text-gray-700 hover:border-[#97011A]/30",
                      )}
                    >
                      <Phone className="h-4 w-4" />
                      {displayPhone}
                    </button>
                  )}
                </div>

                {/* Details Grid */}
                <div className="space-y-3 pt-2">
                  {profile.profession && (
                    <div className="flex items-start space-x-3">
                      <Briefcase className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Profession</p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">{profile.profession}</p>
                      </div>
                    </div>
                  )}
                  
                  {profile.education && (
                    <div className="flex items-start space-x-3">
                      <GraduationCap className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Education</p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">{profile.education}</p>
                      </div>
                    </div>
                  )}
                  
                  {profile.community && (
                    <div className="flex items-start space-x-3">
                      <Users className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Community</p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">{profile.community}</p>
                      </div>
                    </div>
                  )}
                  
                  {profile.religion && profile.religion !== profile.community && (
                    <div className="flex items-start space-x-3">
                      <Users className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Religion</p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">{profile.religion}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base sm:text-lg text-gray-900">About</h3>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  </div>
                </>
              )}

              {/* Interests */}
              {profile.interests && profile.interests.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base sm:text-lg text-gray-900">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest) => (
                        <Badge 
                          key={interest} 
                          variant="secondary" 
                          className="text-xs sm:text-sm px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 font-normal"
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 p-5 sm:p-6 border-t border-gray-200 bg-gray-50/50 rounded-b-2xl sm:rounded-b-3xl">
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                size="lg"
                className="w-16 h-16 rounded-full p-0 border-2 border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 bg-white shadow-md"
                onClick={onNotNow}
              >
                <X className="w-7 h-7" />
              </Button>

              <Button
                size="lg"
                className="w-16 h-16 rounded-full p-0 bg-gradient-to-r from-[#97011A] to-[#7A0115] hover:from-[#7A0115] hover:to-[#97011A] shadow-lg shadow-[#97011A]/30"
                onClick={onConnect}
              >
                <Heart className="w-7 h-7 fill-white text-white" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
