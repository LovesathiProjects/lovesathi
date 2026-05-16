"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X, MapPin, Briefcase, GraduationCap, Users, Share, Flag, Heart, ChevronLeft, ChevronRight, Phone, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MatrimonyProfile } from "@/lib/mockMatrimonyProfiles"
import { formatPublicProfileName } from "@/lib/displayName"
import { getPublicProfileId } from "@/lib/profileIdentity"
import { getProfileFallbackImage, getSafeProfilePhotos } from "@/lib/profileImages"

const SUPER_LIKE_ICON_SRC = "/lovesathi-superlike-star-polished.png"

interface MatrimonyProfileModalProps {
  profile: MatrimonyProfile
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnect: () => void
  onNotNow: () => void
  onChat?: () => void
  onSuperLike?: () => void
  onPhoneUpgrade?: () => void
  onRevealPhone?: (profileId: string) => Promise<string | null>
  viewerIsPremium?: boolean
  isMatched?: boolean
}

function cleanText(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || null
  return String(value)
}

function compactList(values: unknown[]) {
  return values.map(cleanText).filter(Boolean).join(", ") || null
}

function InfoLine({ label, value }: { label: string; value: unknown }) {
  const displayValue = cleanText(value)
  if (!displayValue) return null

  return (
    <div className="min-w-0">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#9AA5B2]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-6 text-[#26364A]">{displayValue}</p>
    </div>
  )
}

function DossierSection({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[1.35rem] border border-[#F1D5DD] bg-white p-4 shadow-[0_14px_36px_rgba(31,44,60,0.04)]">
      <h3 className="flex items-center gap-2 text-base font-black text-[#26364A]">
        {icon}
        {title}
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

export function MatrimonyProfileModal({ profile, open, onOpenChange, onConnect, onNotNow, onChat, onSuperLike, onPhoneUpgrade, onRevealPhone, viewerIsPremium = false, isMatched = false }: MatrimonyProfileModalProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [photoFailed, setPhotoFailed] = useState(false)
  const [revealedPhone, setRevealedPhone] = useState<string | null>(profile.phone || null)
  const phoneIsRevealed = Boolean(revealedPhone || profile.phone)
  const displayPhone = revealedPhone || profile.phone || profile.phoneMasked
  const displayName = formatPublicProfileName(profile.name)
  const publicProfileId = getPublicProfileId(profile)
  const visiblePhotos = getSafeProfilePhotos(profile.photos, profile.name, profile.id, viewerIsPremium || isMatched ? undefined : 1)
  const currentPhoto = photoFailed ? getProfileFallbackImage(profile.name, profile.id) : visiblePhotos[currentPhotoIndex]
  const personal = profile.personal || {}
  const career = profile.career || {}
  const cultural = profile.cultural || {}
  const family = profile.family || {}
  const preferences = profile.partnerPreferences || {}
  const workLocation = career.work_location || {}
  const workLocationLabel = compactList([workLocation.city, workLocation.state, workLocation.country])
  const birthLocation =
    cultural.place_of_birth ||
    compactList([
      cultural.birth_city || cultural.birthCity,
      cultural.birth_state || cultural.birthState,
      cultural.birth_country || cultural.birthCountry,
    ])
  const heightDisplay = profile.height || (personal.height_cm ? `${personal.height_cm} cm` : null)
  const maritalStatus = profile.maritalStatus || personal.marital_status
  const income = profile.income || career.annual_income
  const education = profile.education || career.highest_education
  const profession = profile.profession || career.job_title
  const hasAnyPreferences = Boolean(
    preferences.min_age ||
      preferences.max_age ||
      preferences.min_height ||
      preferences.max_height ||
      (Array.isArray(preferences.locations) && preferences.locations.length) ||
      (Array.isArray(preferences.communities) && preferences.communities.length) ||
      (Array.isArray(preferences.education_prefs) && preferences.education_prefs.length) ||
      (Array.isArray(preferences.profession_prefs) && preferences.profession_prefs.length) ||
      (Array.isArray(preferences.diet_prefs) && preferences.diet_prefs.length) ||
      (Array.isArray(preferences.marital_status_prefs) && preferences.marital_status_prefs.length),
  )

  useEffect(() => {
    setRevealedPhone(profile.phone || null)
    setCurrentPhotoIndex(0)
    setPhotoFailed(false)
  }, [profile.id, profile.phone])

  const handlePhotoClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const cardWidth = rect.width

    if (clickX > cardWidth / 2) {
      // Right side - next photo
      if (currentPhotoIndex < visiblePhotos.length - 1) {
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
    if (currentPhotoIndex < visiblePhotos.length - 1) {
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
      <DialogContent className="!flex h-[min(calc(100svh-1rem),860px)] w-[min(calc(100vw-1rem),30rem)] max-w-none gap-0 overflow-hidden rounded-2xl bg-white p-0 shadow-2xl sm:h-[min(calc(100dvh-2rem),860px)] sm:max-w-md sm:rounded-3xl" showCloseButton={false}>
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl sm:rounded-3xl">
          {/* Photo Section */}
          <div className="relative h-[min(34svh,19rem)] min-h-[12rem] max-h-80 flex-shrink-0 overflow-hidden rounded-t-2xl sm:h-[min(36dvh,24rem)] sm:max-h-96 sm:rounded-t-3xl" onClick={handlePhotoClick}>
            <img
              src={currentPhoto || getProfileFallbackImage(profile.name, profile.id)}
              alt={`${profile.name} photo ${currentPhotoIndex + 1}`}
              className="w-full h-full object-cover"
              onError={() => setPhotoFailed(true)}
            />

            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Photo navigation arrows */}
            {visiblePhotos.length > 1 && (
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
                {currentPhotoIndex < visiblePhotos.length - 1 && (
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
            {visiblePhotos.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
                {visiblePhotos.map((_, index) => (
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
            {onSuperLike && (
              <button
                type="button"
                aria-label="Send Super Like"
                onClick={(e) => {
                  e.stopPropagation()
                  onSuperLike()
                }}
                className="absolute left-4 top-4 z-20 flex h-[3.35rem] w-[3.35rem] items-center justify-center rounded-[1.35rem] border border-white/22 bg-[linear-gradient(145deg,#080706,#18122a_48%,#050505)] p-[3px] shadow-[0_18px_46px_rgba(0,0,0,0.36),0_0_30px_rgba(100,78,255,0.22),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-xl transition hover:scale-105 hover:border-[#E83262]/60"
              >
                <img
                  src={SUPER_LIKE_ICON_SRC}
                  alt=""
                  className="h-full w-full scale-[1.06] rounded-[1.1rem] object-cover"
                  draggable={false}
                />
              </button>
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
                <Badge className="bg-[#E83262] text-white text-xs px-3 py-1.5 font-medium shadow-lg">
                  Premium
                </Badge>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white pr-1 [-webkit-overflow-scrolling:touch]">
            <div className="space-y-5 p-5 sm:p-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                    {displayName}, {profile.age}{heightDisplay ? ` - ${heightDisplay}` : ""}
                  </h1>
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#9AA5B2]">ID - {publicProfileId}</p>
                  {profile.location && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm sm:text-base">{profile.location}</span>
                    </div>
                  )}
                  {displayPhone && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (phoneIsRevealed) return
                        if (profile.canRevealPhone && onRevealPhone) {
                          const nextPhone = await onRevealPhone(profile.id)
                          if (nextPhone) setRevealedPhone(nextPhone)
                          return
                        }
                        onPhoneUpgrade?.()
                      }}
                      className={cn(
                        "mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold",
                        phoneIsRevealed
                          ? "border-[#E83262]/20 bg-[#E83262]/8 text-[#E83262]"
                          : "border-gray-200 bg-gray-50 text-gray-700 hover:border-[#E83262]/30",
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

              {profile.bio && (
                <DossierSection title="About Me" icon={<Heart className="h-4 w-4 text-[#E83262]" />}>
                  <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-[#5A6878] sm:col-span-2">{profile.bio}</p>
                </DossierSection>
              )}

              <DossierSection title="Career & Education" icon={<Briefcase className="h-4 w-4 text-[#E83262]" />}>
                <InfoLine label="Education" value={education} />
                <InfoLine label="College" value={career.college} />
                <InfoLine label="Profession" value={profession} />
                <InfoLine label="Company" value={career.company} />
                <InfoLine label="Income" value={income} />
                <InfoLine label="Work Location" value={workLocationLabel} />
              </DossierSection>

              <DossierSection title="Family & Cultural Details" icon={<Users className="h-4 w-4 text-[#E83262]" />}>
                <InfoLine label="Family Type" value={family.family_type} />
                <InfoLine label="Family Values" value={family.family_values} />
                <InfoLine label="Religion" value={profile.religion || cultural.religion} />
                <InfoLine label="Community" value={profile.community || cultural.community} />
                <InfoLine label="Sub-community" value={cultural.sub_caste || cultural.sub_community} />
                <InfoLine label="Mother Tongue" value={cultural.mother_tongue} />
                <InfoLine label="Birth Place" value={birthLocation} />
                <InfoLine label="Time of Birth" value={cultural.time_of_birth} />
                <InfoLine label="Star / Raashi" value={cultural.star_raashi} />
                <InfoLine label="Gotra" value={cultural.gotra} />
              </DossierSection>

              <DossierSection title="Lifestyle & Personal Details" icon={<Users className="h-4 w-4 text-[#E83262]" />}>
                <InfoLine label="Height" value={heightDisplay} />
                <InfoLine label="Marital Status" value={maritalStatus} />
                <InfoLine label="Complexion" value={personal.complexion} />
                <InfoLine label="Body Type" value={personal.body_type} />
                <InfoLine label="Diet" value={personal.diet} />
                <InfoLine
                  label="Lifestyle"
                  value={compactList([
                    personal.smoker === false ? "Non-smoker" : personal.smoker ? "Smoker" : null,
                    personal.drinker === false ? "Non-drinker" : personal.drinker ? "Drinker" : null,
                  ])}
                />
              </DossierSection>

              {hasAnyPreferences && (
                <DossierSection title="Partner Preferences" icon={<Heart className="h-4 w-4 text-[#E83262]" />}>
                  <InfoLine
                    label="Age Range"
                    value={preferences.min_age || preferences.max_age ? `${preferences.min_age || "?"} - ${preferences.max_age || "?"}` : null}
                  />
                  <InfoLine
                    label="Height Range"
                    value={preferences.min_height || preferences.max_height ? `${preferences.min_height || "?"} - ${preferences.max_height || "?"}` : null}
                  />
                  <InfoLine label="Locations" value={preferences.locations} />
                  <InfoLine label="Communities" value={preferences.communities} />
                  <InfoLine label="Education" value={preferences.education_prefs} />
                  <InfoLine label="Profession" value={preferences.profession_prefs} />
                  <InfoLine label="Diet" value={preferences.diet_prefs} />
                  <InfoLine label="Marital Status" value={preferences.marital_status_prefs} />
                </DossierSection>
              )}

              {profile.interests && profile.interests.length > 0 && (
                <section className="rounded-[1.35rem] border border-[#F1D5DD] bg-white p-4 shadow-[0_14px_36px_rgba(31,44,60,0.04)]">
                  <h3 className="text-base font-black text-[#26364A]">Interests</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.interests.map((interest) => (
                      <Badge key={interest} variant="secondary" className="rounded-full bg-[#F6F7FB] px-3 py-1.5 text-xs font-bold text-[#526173]">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 rounded-b-2xl border-t border-gray-200 bg-gray-50/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur sm:rounded-b-3xl sm:p-5 sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                size="lg"
                className="w-16 h-16 rounded-full p-0 border-2 border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 bg-white shadow-md"
                onClick={onNotNow}
              >
                <X className="w-7 h-7" />
              </Button>

              {onChat && (
                <Button
                  type="button"
                  size="lg"
                  aria-label="Open Chat"
                  className="h-16 w-16 rounded-full border border-[#DCE2EB] bg-white p-0 text-[#26364A] shadow-[0_14px_34px_rgba(31,44,60,0.12)] transition hover:scale-105 hover:border-[#E83262]/35 hover:bg-[#FFF3F7] hover:text-[#E83262]"
                  onClick={onChat}
                >
                  <MessageCircle className="h-7 w-7" />
                </Button>
              )}

              <Button
                size="lg"
                className="w-16 h-16 rounded-full p-0 bg-gradient-to-r from-[#E83262] to-[#C3264E] hover:from-[#C3264E] hover:to-[#E83262] shadow-lg shadow-[#E83262]/30"
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
