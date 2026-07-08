"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { AppLayout } from "@/components/layout/app-layout"
import { QuickActions } from "@/components/navigation/quick-actions"
// Removed TopBackButton usage
import {
  Filter,
  ArrowLeft,
  Heart,
  ShieldCheck,
  Sparkles,
  Crown,
  MessageCircle,
  Star,
  X,
  Send,
  Briefcase,
  GraduationCap,
  ImageIcon,
  BadgeCheck,
  IndianRupee,
  Search,
  SlidersHorizontal,
  Users,
  MapPin,
  Pencil,
} from "lucide-react"
import { MatrimonySwipeCard } from "@/components/matrimony/matrimony-swipe-card"
import { MatrimonyChatList } from "@/components/matrimony/matrimony-chat-list"
import { ChatScreen } from "@/components/chat/chat-screen"
import { MatrimonyFilterSheet } from "@/components/matrimony/matrimony-filter-sheet"
import { StaticBackground } from "@/components/discovery/static-background"
import { BackFloatingButton } from "@/components/navigation/back-floating-button"
import { SettingsScreen } from "@/components/settings/settings-screen"
import { MatrimonyInfoScreen, type MatrimonyInfoScreenId } from "@/components/settings/matrimony-info-screen"
import { ActivityScreen } from "@/components/activity/activity-screen"
import { AppSettings } from "@/components/settings/app-settings"
import { MatrimonyPreferencesSettings } from "@/components/settings/matrimony-preferences-settings"
import { PremiumScreen } from "@/components/premium/premium-screen"
import { PaymentScreen } from "@/components/premium/payment-screen"
import { PremiumFeatures } from "@/components/premium/premium-features"
import { DiscountOfferDialog, DiscountOfferTimer } from "@/components/premium/discount-offer-dialog"
import { VerificationStatus } from "@/components/profile/verification-status"
import { EditProfile } from "@/components/profile/edit-profile"
import type { MatrimonyProfile } from "@/lib/mockMatrimonyProfiles"
import { supabase } from "@/lib/supabaseClient"
import { handleLogout } from "@/lib/logout"
import {
  getMatrimonyDiscoverySwipeStatus,
  getMatrimonyLikedProfiles,
  createPremiumDirectMatrimonyMatch,
  recordMatrimonyLike,
} from "@/lib/matchmakingService"
import { getLimitMessage, getSuperLikeLimitStatus, getUserEntitlementStatus, type EntitlementStatus, type UsageLimitStatus } from "@/lib/planLimits"
import { getProfileContacts, revealProfileContact } from "@/lib/profileContacts"
import { MatchNotification } from "@/components/chat/match-notification"
import type { FilterState } from "@/components/matrimony/matrimony-filter-sheet"
import { useToast } from "@/hooks/use-toast"
import { useMatrimonyShortlist } from "@/hooks/useMatrimonyShortlist"
import { MatrimonyShortlistView } from "@/components/matrimony/matrimony-shortlist"
import { MatrimonyProfileModal } from "@/components/matrimony/matrimony-profile-modal"
import { ProfileView } from "@/components/profile/profile-view"
import { calculateAgeFromDate } from "@/lib/age"
import { formatLocationValue, getLocationCity, parseLocationValue, type LocationValue } from "@/lib/location"
import { formatPublicProfileName } from "@/lib/displayName"
import { getPublicProfileId } from "@/lib/profileIdentity"
import { getProfileFallbackImage, getSafeProfilePhotos } from "@/lib/profileImages"
import { cn } from "@/lib/utils"
import { LocationCascadeSelect } from "@/components/location/location-cascade-select"

interface MatrimonyMainProps {
  onExit?: () => void
  initialScreen?:
    | "discover"
    | "messages"
    | "activity"
    | "chat"
    | "profile"
    | "edit-profile"
    | "premium"
    | "payment"
    | "premium-features"
    | "verification-status"
    | "app-settings"
    | "shortlist"
    | "view-profile"
    | "partner-preferences"
    | "astrology"
    | "phonebook"
    | "safety-centre"
    | "help-support"
    | "success-stories"
}

function MatrimonyListProfileCard({
  profile,
  viewerIsPremium,
  isShortlisted,
  onOpen,
  onInterest,
  onIgnore,
  onShortlist,
  onChat,
  onUpgrade,
}: {
  profile: MatrimonyProfile
  viewerIsPremium: boolean
  isShortlisted: boolean
  onOpen: () => void
  onInterest: () => void
  onIgnore: () => void
  onShortlist: () => void
  onChat: () => void
  onUpgrade: () => void
}) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const visiblePhotos = getSafeProfilePhotos(profile.photos, profile.name, profile.id, viewerIsPremium ? undefined : 1)
  const fallbackPhoto = getProfileFallbackImage(profile.name, profile.id)
  const primaryPhoto = photoFailed ? fallbackPhoto : visiblePhotos[0]
  const visiblePhotoCount = viewerIsPremium ? Math.max(profile.photos?.length || 1, 1) : 1
  const isPremiumLocked = Boolean(profile.premium && !viewerIsPremium)
  const profileCity = profile.location?.split(",")?.[0]?.trim() || profile.location
  const salary = (profile as MatrimonyProfile & { income?: string }).income || "Rs. 3 - 4 Lakh p.a"
  const education = profile.education || "Education shared"
  const maritalStatus = (profile as MatrimonyProfile & { maritalStatus?: string }).maritalStatus || "Never Married"
  const compatibilityLabel = profile.verified ? "Most Compatible" : profile.premium ? "Top Profile" : null
  const publicProfileId = getPublicProfileId(profile)

  useEffect(() => {
    setPhotoFailed(false)
  }, [profile.id, visiblePhotos[0]])

  const handleOpen = () => {
    if (isPremiumLocked) {
      onUpgrade()
      return
    }
    onOpen()
  }

  return (
    <article className="overflow-hidden rounded-[1.25rem] border border-[#E7EAF0] bg-white shadow-[0_10px_30px_rgba(30,43,58,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(30,43,58,0.10)]">
      <div className="grid min-h-[12.5rem] grid-cols-[7.75rem_minmax(0,1fr)] sm:min-h-[13.5rem] sm:grid-cols-[12.5rem_1fr]">
        <button
          type="button"
          onClick={handleOpen}
          className="relative min-h-full overflow-hidden bg-[#F1F3F8] text-left"
          aria-label={`Open ${profile.name}'s profile`}
        >
          {primaryPhoto ? (
            <img
              src={primaryPhoto}
              alt={profile.name}
              className={`h-full min-h-[13.5rem] w-full object-cover ${isPremiumLocked ? "blur-[5px] scale-105 opacity-80" : ""}`}
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <div className="flex h-full min-h-[13.5rem] w-full items-center justify-center bg-[#EEF1F6]">
              <ImageIcon className="h-9 w-9 text-[#9AA5B2]" />
            </div>
          )}
          <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/58 px-2 py-1 text-xs font-bold text-white backdrop-blur">
            <ImageIcon className="h-3.5 w-3.5" />
            {visiblePhotoCount}
          </div>
          {isPremiumLocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/18">
              <span className="rounded-full bg-[#E83262] px-3 py-1 text-xs font-bold text-white shadow-lg">Premium</span>
            </div>
          )}
        </button>

        <div className="flex min-w-0 flex-col">
          <button type="button" onClick={handleOpen} className="flex-1 p-4 text-left sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#657386]">Active recently</p>
                <p className="mt-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#9AA5B2]">ID - {publicProfileId}</p>
                <div className="mt-1 flex min-w-0 items-center gap-2">
                  <h3 className="truncate text-2xl font-extrabold tracking-[-0.03em] text-[#26364A] sm:text-3xl">
                    {formatPublicProfileName(profile.name)}, {profile.age}
                  </h3>
                  {profile.verified && <BadgeCheck className="h-5 w-5 shrink-0 fill-[#45A7E8] text-white" />}
                </div>
              </div>
              {compatibilityLabel && (
                <span className="hidden rounded-l-full bg-[#FFF0F5] px-3 py-1 text-xs font-bold text-[#E83262] sm:inline-flex">
                  {compatibilityLabel}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.95rem] font-semibold text-[#4D5B6C]">
              <span>{profile.height || "5ft 5in"}</span>
              <span aria-hidden="true">&middot;</span>
              <span>{profileCity}</span>
              {profile.community && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span>{profile.community}</span>
                </>
              )}
            </div>

            <div className="mt-2 grid gap-x-4 gap-y-1.5 text-sm font-semibold text-[#697789] sm:grid-cols-2">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Briefcase className="h-4 w-4 shrink-0 text-[#9AA5B2]" />
                <span className="truncate">{profile.profession}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <IndianRupee className="h-4 w-4 shrink-0 text-[#9AA5B2]" />
                <span className="truncate">{salary}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <GraduationCap className="h-4 w-4 shrink-0 text-[#9AA5B2]" />
                <span className="truncate">{education}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Heart className="h-4 w-4 shrink-0 text-[#9AA5B2]" />
                <span className="truncate">{maritalStatus}</span>
              </span>
            </div>

            {profile.bio && (
              <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-[#657386]">{profile.bio}</p>
            )}
          </button>

          <div className="grid grid-cols-4 border-t border-[#F3D8E1] bg-[#FFF3F7] text-[#D72C5B]">
            <button type="button" onClick={onInterest} className="flex items-center justify-center gap-1.5 px-2 py-4 text-sm font-bold hover:bg-white/70">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Interest</span>
            </button>
            <button type="button" onClick={onShortlist} className="flex items-center justify-center gap-1.5 px-2 py-4 text-sm font-bold hover:bg-white/70">
              <Star className="h-4 w-4" fill={isShortlisted ? "currentColor" : "none"} />
              <span className="hidden sm:inline">Shortlist</span>
            </button>
            <button type="button" onClick={onIgnore} className="flex items-center justify-center gap-1.5 px-2 py-4 text-sm font-bold hover:bg-white/70">
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Ignore</span>
            </button>
            <button type="button" onClick={onChat} className="flex items-center justify-center gap-1.5 px-2 py-4 text-sm font-bold hover:bg-white/70">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function MatrimonyDiscoveryList({
  loading,
  profiles,
  viewerIsPremium,
  viewerLocation,
  shortlistedIds,
  swipeLimitStatus,
  appliedFilters,
  onOpenFilters,
  onOpenPremium,
  onClearFilters,
  onOpenProfile,
  onInterest,
  onIgnore,
  onShortlist,
  onChat,
}: {
  loading: boolean
  profiles: MatrimonyProfile[]
  viewerIsPremium: boolean
  viewerLocation?: string | null
  shortlistedIds: Set<string>
  swipeLimitStatus: UsageLimitStatus | null
  appliedFilters: FilterState | null
  onOpenFilters: () => void
  onOpenPremium: () => void
  onClearFilters: () => void
  onOpenProfile: (profile: MatrimonyProfile) => void
  onInterest: (profile: MatrimonyProfile) => void
  onIgnore: (profile: MatrimonyProfile) => void
  onShortlist: (profile: MatrimonyProfile) => void
  onChat: (profile: MatrimonyProfile) => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [quickFilters, setQuickFilters] = useState({
    nearby: false,
    withPhotos: false,
    selfProfiles: false,
  })
  const [nearbyLocation, setNearbyLocation] = useState("")
  const [nearbyDraft, setNearbyDraft] = useState<LocationValue>({})
  const [showNearbyEditor, setShowNearbyEditor] = useState(false)
  const resolvedNearbyLocation = nearbyLocation || viewerLocation || ""
  const nearbyCity = getLocationCity(resolvedNearbyLocation).trim()

  useEffect(() => {
    if (viewerLocation && !nearbyLocation) {
      setNearbyLocation(viewerLocation)
    }
  }, [nearbyLocation, viewerLocation])

  const openNearbyEditor = () => {
    setNearbyDraft(parseLocationValue(resolvedNearbyLocation))
    setShowNearbyEditor(true)
  }

  const handleNearbyChipClick = () => {
    if (!nearbyCity) {
      openNearbyEditor()
      return
    }

    setQuickFilters((previous) => ({ ...previous, nearby: !previous.nearby }))
  }

  const applyNearbyLocation = () => {
    const formattedLocation = formatLocationValue(nearbyDraft)
    if (!formattedLocation) return

    setNearbyLocation(formattedLocation)
    setQuickFilters((previous) => ({ ...previous, nearby: true }))
    setShowNearbyEditor(false)
  }

  const resetNearbyToProfile = () => {
    if (!viewerLocation) return

    setNearbyLocation(viewerLocation)
    setNearbyDraft(parseLocationValue(viewerLocation))
    setQuickFilters((previous) => ({ ...previous, nearby: true }))
  }

  const clearNearbyLocation = () => {
    setNearbyLocation("")
    setQuickFilters((previous) => ({ ...previous, nearby: false }))
    setShowNearbyEditor(false)
  }

  const visibleProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const nearbyLocationValue = resolvedNearbyLocation.trim().toLowerCase()
    const nearbyCityValue = getLocationCity(resolvedNearbyLocation).trim().toLowerCase()
    return profiles.filter((profile) => {
      const searchable = [profile.name, profile.location, profile.profession, profile.education, profile.community]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      const matchesSearch = query ? searchable.includes(query) : true
      const profileCity = getLocationCity(profile.location).toLowerCase()
      const profileLocation = profile.location.toLowerCase()
      const matchesNearby = quickFilters.nearby
        ? nearbyCityValue
          ? profileCity === nearbyCityValue || profileLocation.includes(nearbyCityValue) || profileLocation.includes(nearbyLocationValue)
          : true
        : true
      const matchesPhotos = quickFilters.withPhotos ? profile.hasRealPhotos !== false && profile.photos.length > 0 : true
      const matchesSelf = quickFilters.selfProfiles ? String(profile.createdBy || "Self").toLowerCase() === "self" : true

      return matchesSearch && matchesNearby && matchesPhotos && matchesSelf
    })
  }, [profiles, quickFilters.nearby, quickFilters.selfProfiles, quickFilters.withPhotos, resolvedNearbyLocation, searchQuery])
  const quickFilterCount = Number(quickFilters.nearby) + Number(quickFilters.withPhotos) + Number(quickFilters.selfProfiles)
  const hasFilters = Boolean(
    quickFilterCount ||
      (appliedFilters &&
        (appliedFilters.locations.length ||
        appliedFilters.communities.length ||
        appliedFilters.educationPrefs.length ||
        appliedFilters.professionPrefs.length ||
        appliedFilters.familyTypePrefs.length ||
        appliedFilters.dietPrefs.length ||
        appliedFilters.lifestylePrefs.length ||
        appliedFilters.verifiedOnly ||
          appliedFilters.premiumOnly)),
  )
  const clearAllFilters = () => {
    setQuickFilters({ nearby: false, withPhotos: false, selfProfiles: false })
    onClearFilters()
  }
  const quickFilterChips = [
    { key: "withPhotos" as const, label: "With Photos" },
    { key: "selfProfiles" as const, label: "Self Profiles" },
  ]

  return (
    <div className="fixed inset-0 flex h-[100svh] flex-col overflow-hidden bg-[#F6F7FB] text-[#26364A] sm:h-[100dvh]">
      <header className="shrink-0 border-b border-[#E4E7EE] bg-white/95 px-4 pt-[calc(0.85rem+env(safe-area-inset-top))] shadow-[0_12px_30px_rgba(31,44,60,0.06)] backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 pb-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-[#E83262]">Lovesathi Matches</p>
            <h1 className="truncate text-2xl font-black tracking-[-0.04em] text-[#26364A] sm:text-3xl">Search Matches</h1>
            <p className="hidden text-sm font-semibold text-[#6F7C8B] sm:block">
              {profiles.length} curated profiles prepared for serious introductions.
            </p>
          </div>
          <Button
            type="button"
            onClick={onOpenPremium}
            className="hidden rounded-xl bg-[#E83262] px-5 font-black text-white shadow-[0_14px_30px_rgba(232,50,98,0.22)] hover:bg-[#C3264E] sm:inline-flex"
          >
            Upgrade Membership
          </Button>
        </div>

        <div className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={onOpenFilters}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E83262]/35 bg-white px-4 py-2 text-sm font-bold text-[#26364A] shadow-sm"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#E83262]" />
            Filters
            {hasFilters && <span className="h-2 w-2 rounded-full bg-[#E83262]" />}
          </button>
          <button
            type="button"
            onClick={handleNearbyChipClick}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-sm transition",
              quickFilters.nearby
                ? "border-[#E83262]/40 bg-[#FFF3F7] text-[#E83262]"
                : "border-[#D9DFE8] bg-white text-[#526173] hover:border-[#E83262]/30",
            )}
          >
            <MapPin className="h-4 w-4" />
            {nearbyCity ? `Nearby ${nearbyCity}` : "Set Nearby"}
            {quickFilters.nearby && <X className="h-3.5 w-3.5 text-[#E83262]" />}
          </button>
          <button
            type="button"
            onClick={openNearbyEditor}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#D9DFE8] bg-white px-3 py-2 text-sm font-bold text-[#526173] shadow-sm transition hover:border-[#E83262]/30 hover:text-[#E83262]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          {quickFilterChips.map((chip) => {
            const active = quickFilters[chip.key]
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setQuickFilters((previous) => ({ ...previous, [chip.key]: !previous[chip.key] }))}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-sm transition",
                  active
                    ? "border-[#E83262]/40 bg-[#FFF3F7] text-[#E83262]"
                    : "border-[#D9DFE8] bg-white text-[#526173] hover:border-[#E83262]/30",
                )}
              >
                {chip.label}
                {active && <X className="h-3.5 w-3.5 text-[#E83262]" />}
              </button>
            )
          })}
          {hasFilters && (
            <button type="button" onClick={clearAllFilters} className="shrink-0 rounded-full px-4 py-2 text-sm font-black text-[#E83262]">
              Reset
            </button>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(9.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[1fr_18rem]">
          <section className="min-w-0 space-y-4">
            <div className="rounded-[1.25rem] border border-[#E7EAF0] bg-white p-3 shadow-[0_10px_28px_rgba(31,44,60,0.05)]">
              <div className="flex items-center gap-3 rounded-xl border border-[#E4E7EE] bg-[#F8FAFC] px-3 py-2.5">
                <Search className="h-5 w-5 text-[#8B96A5]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, city, caste, education, or profession"
                  className="h-8 min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-[#26364A] outline-none placeholder:text-[#98A3B3]"
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-[1.25rem] border border-[#E7EAF0] bg-white p-10 text-center shadow-[0_10px_30px_rgba(31,44,60,0.06)]">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#F7C6D3] border-t-[#E83262]" />
                <p className="mt-4 text-sm font-bold text-[#526173]">Preparing matching profiles...</p>
              </div>
            ) : visibleProfiles.length > 0 ? (
              visibleProfiles.map((profile) => (
                <MatrimonyListProfileCard
                  key={profile.id}
                  profile={profile}
                  viewerIsPremium={viewerIsPremium}
                  isShortlisted={shortlistedIds.has(profile.id)}
                  onOpen={() => onOpenProfile(profile)}
                  onInterest={() => onInterest(profile)}
                  onIgnore={() => onIgnore(profile)}
                  onShortlist={() => onShortlist(profile)}
                  onChat={() => onChat(profile)}
                  onUpgrade={onOpenPremium}
                />
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-[#E7EAF0] bg-white p-10 text-center shadow-[0_10px_30px_rgba(31,44,60,0.06)]">
                <Users className="mx-auto h-10 w-10 text-[#E83262]" />
                <h2 className="mt-4 text-xl font-black text-[#26364A]">No profiles found</h2>
                <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#6F7C8B]">
                  Try relaxing filters or searching a wider city, education, or community.
                </p>
                <Button type="button" onClick={clearAllFilters} className="mt-5 rounded-xl bg-[#E83262] px-6 font-black text-white hover:bg-[#C3264E]">
                  Clear filters
                </Button>
              </div>
            )}
          </section>

          <aside className="hidden space-y-4 lg:block">
            <div className="rounded-[1.25rem] border border-[#E7EAF0] bg-white p-5 shadow-[0_10px_30px_rgba(31,44,60,0.06)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#E83262]">Membership</p>
              <h2 className="mt-2 text-xl font-black text-[#26364A]">Upgrade to connect faster</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#6F7C8B]">
                Unlock contact reveal, premium profiles, super interests, and priority support.
              </p>
              <Button type="button" onClick={onOpenPremium} className="mt-4 w-full rounded-xl bg-[#E83262] font-black text-white hover:bg-[#C3264E]">
                Upgrade Now
              </Button>
            </div>
            <div className="rounded-[1.25rem] border border-[#E7EAF0] bg-white p-5 shadow-[0_10px_30px_rgba(31,44,60,0.06)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#E83262]">Today</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#F6F7FB] p-3">
                  <p className="text-2xl font-black text-[#26364A]">{profiles.length}</p>
                  <p className="text-xs font-bold text-[#6F7C8B]">Profiles</p>
                </div>
                <div className="rounded-xl bg-[#F6F7FB] p-3">
                  <p className="text-2xl font-black text-[#26364A]">
                    {swipeLimitStatus?.isPremium ? "Max" : swipeLimitStatus?.remaining ?? 15}
                  </p>
                  <p className="text-xs font-bold text-[#6F7C8B]">Free swipes</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <DiscountOfferTimer onSubscribe={onOpenPremium} />
      <Dialog open={showNearbyEditor} onOpenChange={setShowNearbyEditor}>
        <DialogContent className="max-h-[calc(100svh-1rem)] w-[min(calc(100vw-1rem),34rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[1.5rem] border border-[#E7EAF0] bg-white p-0 text-[#26364A] shadow-[0_30px_80px_rgba(31,44,60,0.24)] sm:max-h-[calc(100dvh-2rem)]">
          <div className="min-w-0 border-b border-[#E7EAF0] px-5 py-4">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-[#E83262]">Discovery location</p>
            <DialogTitle className="mt-1 text-2xl font-black tracking-[-0.04em]">Edit Nearby</DialogTitle>
            <DialogDescription className="mt-1 text-sm font-semibold leading-6 text-[#6F7C8B]">
              Your profile can prefill Nearby, but this lets you tune discovery without changing your saved profile.
            </DialogDescription>
          </div>
          <div className="min-w-0 space-y-5 overflow-y-auto overflow-x-hidden px-5 py-5">
            <LocationCascadeSelect
              value={nearbyDraft}
              onChange={setNearbyDraft}
              countryLabel="Country"
              stateLabel="State"
              cityLabel="City"
              className="grid min-w-0 grid-cols-1 gap-4"
            />
            <div className="flex min-w-0 flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={clearNearbyLocation}
                className="w-full rounded-full px-4 font-black text-[#6F7C8B] hover:text-[#E83262] sm:w-auto"
              >
                Clear Nearby
              </Button>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetNearbyToProfile}
                  disabled={!viewerLocation}
                  className="w-full min-w-0 rounded-full border-[#D9DFE8] bg-white px-4 font-black text-[#526173] sm:w-auto"
                >
                  Use profile location
                </Button>
                <Button
                  type="button"
                  onClick={applyNearbyLocation}
                  disabled={!nearbyDraft.country || !nearbyDraft.state || !nearbyDraft.city}
                  className="w-full rounded-full bg-[#E83262] px-5 font-black text-white hover:bg-[#C3264E] sm:w-auto"
                >
                  Apply Nearby
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


export function MatrimonyMain({ onExit, initialScreen = "discover" }: MatrimonyMainProps) {
  const router = useRouter()
  const [profiles, setProfiles] = useState<MatrimonyProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentScreen, setCurrentScreen] = useState<
    | "discover"
    | "messages"
    | "activity"
    | "chat"
    | "profile"
    | "edit-profile"
    | "premium"
    | "payment"
    | "premium-features"
    | "verification-status"
    | "app-settings"
    | "shortlist"
    | "view-profile"
    | "partner-preferences"
    | "astrology"
    | "phonebook"
    | "safety-centre"
    | "help-support"
    | "success-stories"
  >(initialScreen)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [viewedUserId, setViewedUserId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [viewerLocation, setViewerLocation] = useState<string | null>(null)
  const [viewerProfile, setViewerProfile] = useState<Record<string, any> | null>(null)
  const [cameFromChat, setCameFromChat] = useState<boolean>(false)
  const [cameFromShortlist, setCameFromShortlist] = useState<boolean>(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined)
  const [showMatchNotification, setShowMatchNotification] = useState(false)
  const [matchedProfile, setMatchedProfile] = useState<MatrimonyProfile | null>(null)
  const [matchedMatchId, setMatchedMatchId] = useState<string | null>(null)
  const [appliedFilters, setAppliedFilters] = useState<FilterState | null>(null)
  const [shortlistModalProfile, setShortlistModalProfile] = useState<MatrimonyProfile | null>(null)
  const [swipeLimitStatus, setSwipeLimitStatus] = useState<UsageLimitStatus | null>(null)
  const [viewerIsPremium, setViewerIsPremium] = useState(false)
  const [viewerEntitlement, setViewerEntitlement] = useState<EntitlementStatus | null>(null)
  const [premiumBackTarget, setPremiumBackTarget] = useState<"discover" | "profile" | "activity">("profile")
  const { toast } = useToast()
  const {
    shortlistedProfiles,
    shortlistedIds,
    loading: shortlistLoading,
    removeProfile: removeFromShortlist,
    toggleShortlist,
  } = useMatrimonyShortlist()

  useEffect(() => {
    setCurrentScreen(initialScreen)
  }, [initialScreen])

  const handleOpenShortlist = useCallback(() => {
    setCurrentScreen("shortlist")
    router.push("/matrimony/shortlist")
  }, [router])

  const handleOpenDiscover = useCallback(() => {
    setCurrentScreen("discover")
    router.push("/matrimony/discovery")
  }, [router])

  const showSwipePaywall = useCallback(() => {
    toast({
      title: "Unlock unlimited discovery",
      description: "Free members can swipe 15 times every 12 hours. Choose a paid plan to keep sending interests and passes.",
    })
    setPremiumBackTarget("discover")
    setCurrentScreen("premium")
  }, [toast])

  const showPremiumUpsell = useCallback(
    (title: string, description: string, backTarget: "discover" | "profile" | "activity" = "discover") => {
      toast({ title, description })
      setPremiumBackTarget(backTarget)
      setCurrentScreen("premium")
    },
    [toast],
  )

  const handleRevealPhone = useCallback(
    async (profileId: string) => {
      if (!viewerIsPremium) {
        showPremiumUpsell(
          "Unlock contact details",
          "Phone numbers are available only on paid plans. Upgrade to reveal verified contact details safely.",
          "discover",
        )
        return null
      }

      const localProfile = profiles.find((profile) => profile.id === profileId)
      if (localProfile?.phone) {
        setProfiles((previousProfiles) =>
          previousProfiles.map((profile) =>
            profile.id === profileId
              ? {
                  ...profile,
                  phone: localProfile.phone,
                  phoneMasked: localProfile.phoneMasked || profile.phoneMasked,
                  canRevealPhone: true,
                }
              : profile,
          ),
        )
        toast({
          title: "Contact revealed",
          description: "This phone number is now visible through your active plan.",
        })
        return localProfile.phone
      }

      const contact = await revealProfileContact(profileId)
      if (contact.phoneRevealed) {
        setProfiles((previousProfiles) =>
          previousProfiles.map((profile) =>
            profile.id === profileId
              ? {
                  ...profile,
                  phone: contact.phoneRevealed || undefined,
                  phoneMasked: contact.phoneMasked || profile.phoneMasked,
                  canRevealPhone: true,
                }
              : profile,
          ),
        )
      }
      return contact.phoneRevealed
    },
    [profiles, showPremiumUpsell, toast, viewerIsPremium],
  )

  const refreshSwipeLimitStatus = useCallback(async (userId: string) => {
    const status = await getMatrimonyDiscoverySwipeStatus(userId)
    setSwipeLimitStatus(status)
    return status
  }, [])

  const ensureSwipeAllowed = useCallback(
    async (userId: string) => {
      const status = await refreshSwipeLimitStatus(userId)
      if (!status.allowed) {
        showSwipePaywall()
        return false
      }
      return true
    },
    [refreshSwipeLimitStatus, showSwipePaywall],
  )

  const handleShortlistToggle = useCallback(
    async (profile: MatrimonyProfile) => {
      const wasShortlisted = shortlistedIds.has(profile.id)
      const result = await toggleShortlist(profile)

      if (result.success) {
        toast({
          title: wasShortlisted ? "Removed from shortlist" : "Added to shortlist",
          description: wasShortlisted
            ? `${formatPublicProfileName(profile.name)} was removed from your saved profiles.`
            : `${formatPublicProfileName(profile.name)} has been saved for later.`,
        })
      } else {
        toast({
          title: "Unable to update shortlist",
          description: result.error || "Please try again.",
          variant: "destructive",
        })
      }

      return result
    },
    [shortlistedIds, toggleShortlist, toast],
  )

  const handleShortlistRemove = useCallback(
    async (profileId: string, profileName?: string) => {
      const result = await removeFromShortlist(profileId)

      if (result.success) {
        toast({
          title: "Removed from shortlist",
          description: profileName ? `${formatPublicProfileName(profileName)} was removed.` : "Profile removed.",
        })
      } else {
        toast({
          title: "Unable to update shortlist",
          description: result.error || "Please try again.",
          variant: "destructive",
        })
      }

      return result
    },
    [removeFromShortlist, toast],
  )

  const handleShortlistConnect = useCallback(
    async (profile: MatrimonyProfile) => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
          throw new Error("Please sign in to continue.")
        }

        const allowed = await ensureSwipeAllowed(user.id)
        if (!allowed) return

        const result = await recordMatrimonyLike(user.id, profile.id, "like")
        if (!result.success) {
          throw new Error(result.error || "Unable to connect.")
        }

        toast({
          title: `You liked ${formatPublicProfileName(profile.name)}`,
          description: "We'll notify you if it's a match.",
        })
      } catch (error: any) {
        toast({
          title: "Could not connect",
          description: error.message || "Please try again.",
          variant: "destructive",
        })
      }
    },
    [ensureSwipeAllowed, toast],
  )

  // Fetch profiles from Supabase
  useEffect(() => {
    async function fetchProfiles() {
      try {
        setLoading(true)
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error("Auth error:", authError)
          setProfiles([])
          setCurrentUserId(null)
          setViewerLocation(null)
          setViewerProfile(null)
          setLoading(false)
          return
        }

        if (!user) {
          setProfiles([])
          setCurrentUserId(null)
          setViewerLocation(null)
          setViewerProfile(null)
          setSwipeLimitStatus(null)
          setViewerEntitlement(null)
          setLoading(false)
          return
        }

        setCurrentUserId(user.id)
        await refreshSwipeLimitStatus(user.id)
        const entitlement = await getUserEntitlementStatus(user.id)
        setViewerIsPremium(entitlement.isPremium)
        setViewerEntitlement(entitlement)

        // Fetch current user's gender from user_profiles
        const { data: currentUserProfile, error: currentUserError } = await supabase
          .from("user_profiles")
          .select("gender")
          .eq("user_id", user.id)
          .single()

        if (currentUserError && currentUserError.code !== 'PGRST116') {
          console.error("Error fetching current user profile:", currentUserError)
        }

        // Fetch matrimony profiles from consolidated table (only completed ones)
        // Build query with age filter if applied
        let query = supabase
          .from("matrimony_profile_full")
          .select(`
            user_id,
            public_profile_id,
            name,
            age,
            gender,
            created_by,
            photos,
            personal,
            career,
            cultural,
            family,
            partner_preferences,
            bio,
            profile_hidden,
            is_seeded_profile,
            admin_review_status
          `)
          .eq("profile_completed", true)
          .eq("profile_hidden", false)
          .neq("admin_review_status", "rejected")

        // Apply age filter at database level if available
        if (appliedFilters?.ageRange) {
          query = query
            .gte("age", appliedFilters.ageRange[0])
            .lte("age", appliedFilters.ageRange[1])
        }

        const { data: matrimonyProfiles, error: profilesError } = await query

        if (profilesError) {
          console.error("Error fetching matrimony profiles:", profilesError)
          setProfiles([])
          setViewerProfile(null)
          setLoading(false)
          return
        }

        const profileRows = matrimonyProfiles || []

        // Get user IDs for verifications
        const userIds = profileRows.map((p) => p.user_id)
        // Fetch ID verifications (for verified status)
        const [{ data: verifications, error: verificationsError }, { data: premiumIds, error: premiumIdsError }] =
          userIds.length > 0
            ? await Promise.all([
                supabase
                  .from("id_verifications")
                  .select("user_id, verification_status")
                  .in("user_id", userIds),
                supabase.rpc("get_lovesathi_premium_profile_ids", { p_user_ids: userIds }),
              ])
            : [
                { data: [], error: null },
                { data: [], error: null },
              ]

        if (verificationsError) console.error("Error fetching verifications:", verificationsError)
        if (premiumIdsError) console.warn("Unable to fetch premium profile ids:", premiumIdsError.message)
        const premiumUserIds = new Set<string>((premiumIds as string[] | null) || [])
        const contactMap = await getProfileContacts(userIds)

        // Get current user's gender for filtering
        const currentUserGender = currentUserProfile?.gender?.toLowerCase()
        const currentMatrimonyProfile = profileRows.find((profile) => profile.user_id === user.id)
        const currentCareer = (currentMatrimonyProfile?.career as any) || {}
        const currentCultural = (currentMatrimonyProfile?.cultural as any) || {}
        const currentWorkLocation = currentCareer?.work_location || {}
        const workLocationLabel = formatLocationValue(currentWorkLocation)
        const birthLocationLabel = typeof currentCultural.place_of_birth === "string" ? currentCultural.place_of_birth.trim() : ""
        setViewerLocation(workLocationLabel || birthLocationLabel || null)
        setViewerProfile((currentMatrimonyProfile as Record<string, any> | undefined) || null)

        // Hide profiles the user has already liked, passed, or connected with.
        const actedProfileIds = await getMatrimonyLikedProfiles(user.id)
        const actedProfileIdSet = new Set(actedProfileIds)

        // Combine all data from consolidated table
        const combinedProfiles = profileRows
          .map((matrimonyProfile) => {
            // Extract data from JSONB fields
            const photosData = (matrimonyProfile.photos as string[]) || []
            const personalData = (matrimonyProfile.personal as any) || {}
            const careerData = (matrimonyProfile.career as any) || {}
            const culturalData = (matrimonyProfile.cultural as any) || {}
            const familyData = (matrimonyProfile.family as any) || {}
            const preferenceData = (matrimonyProfile.partner_preferences as any) || {}
            const bioText = matrimonyProfile.bio || null
            const verification = verifications?.find((v) => v.user_id === matrimonyProfile.user_id)
            const contact = contactMap.get(matrimonyProfile.user_id)

            // Skip if no essential data
            if (!matrimonyProfile.name) {
              return null
            }

            // Exclude current user's profile
            if (user && matrimonyProfile.user_id === user.id) {
              return null
            }

            if (actedProfileIdSet.has(matrimonyProfile.user_id)) {
              return null
            }

            // Filter by gender preference
            // If current user is male, show only female profiles
            // If current user is female, show only male profiles
            // If current user gender is not set or is 'prefer_not_to_say', show all profiles
            const profileGender = String(matrimonyProfile.gender || "").toLowerCase()
            if (currentUserGender === 'male' && profileGender !== 'female') {
              return null
            }
            if (currentUserGender === 'female' && profileGender !== 'male') {
              return null
            }
            // If currentUserGender is null or 'prefer_not_to_say', show all profiles

            // Calculate age (prefer from profile, fallback to DOB calculation)
            let calculatedAge = matrimonyProfile.age || 0
            if (culturalData?.date_of_birth) {
              calculatedAge = calculateAgeFromDate(culturalData.date_of_birth) || calculatedAge
            }

            // Format location from work_location object
            const workLocation = careerData?.work_location || {}
            const locationParts = []
            if (workLocation.city) locationParts.push(workLocation.city)
            if (workLocation.state) locationParts.push(workLocation.state)
            if (workLocation.country) locationParts.push(workLocation.country)
            const location = locationParts.length > 0 
              ? locationParts.join(", ") 
              : culturalData?.place_of_birth || "India"

            // Format height
            const height = personalData?.height_cm ? `${personalData.height_cm} cm` : undefined

            // Apply filters (if any are set)
            if (appliedFilters) {
              // Apply height filter
              if (appliedFilters.heightRange) {
                const heightCm = personalData?.height_cm
                if (heightCm) {
                  if (heightCm < appliedFilters.heightRange[0] || 
                      heightCm > appliedFilters.heightRange[1]) {
                    return null
                  }
                }
              }

              // Apply location filter (match only by city)
              if (appliedFilters.locations && appliedFilters.locations.length > 0) {
                // If "Any" is selected, skip location filtering
                if (!appliedFilters.locations.includes("Any")) {
                  const profileCity = workLocation.city?.toLowerCase() || ""
                  const matchesLocation = appliedFilters.locations.some(selectedLocation => {
                    const selectedCityLower = getLocationCity(selectedLocation).toLowerCase()
                    // Match only by city name (case-insensitive)
                    return profileCity === selectedCityLower
                  })
                  
                  if (!matchesLocation) {
                    return null
                  }
                }
              }

              // Apply education filter
              if (appliedFilters.educationPrefs && appliedFilters.educationPrefs.length > 0) {
                if (!appliedFilters.educationPrefs.includes("Any")) {
                  const education = (careerData?.highest_education || "").toLowerCase()
                  const matchesEducation = appliedFilters.educationPrefs.some(pref => {
                    return education.includes(pref.toLowerCase()) ||
                           pref.toLowerCase().includes(education)
                  })
                  if (!matchesEducation) {
                    return null
                  }
                }
              }

              // Apply profession filter
              if (appliedFilters.professionPrefs && appliedFilters.professionPrefs.length > 0) {
                if (!appliedFilters.professionPrefs.includes("Any")) {
                  const profession = (careerData?.job_title || "").toLowerCase()
                  const matchesProfession = appliedFilters.professionPrefs.some(pref => {
                    return profession.includes(pref.toLowerCase()) ||
                           pref.toLowerCase().includes(profession)
                  })
                  if (!matchesProfession) {
                    return null
                  }
                }
              }

              // Apply community filter
              if (appliedFilters.communities && appliedFilters.communities.length > 0) {
                if (!appliedFilters.communities.includes("Any") && !appliedFilters.communities.includes("Open to all")) {
                  const community = (culturalData?.community || "").toLowerCase()
                  if (!community) return null

                  const matchesCommunity = appliedFilters.communities.some(pref => {
                    const preference = pref.toLowerCase()
                    return community.includes(preference) || preference.includes(community)
                  })
                  if (!matchesCommunity) {
                    return null
                  }
                }
              }

              // Apply family type filter
              if (appliedFilters.familyTypePrefs && appliedFilters.familyTypePrefs.length > 0) {
                if (!appliedFilters.familyTypePrefs.includes("Any")) {
                  const familyType = ((matrimonyProfile.family as any)?.family_type || "").toLowerCase()
                  const matchesFamilyType = appliedFilters.familyTypePrefs.some(pref => {
                    return familyType.includes(pref.toLowerCase())
                  })
                  if (!matchesFamilyType) {
                    return null
                  }
                }
              }

              // Apply diet filter
              if (appliedFilters.dietPrefs && appliedFilters.dietPrefs.length > 0) {
                if (!appliedFilters.dietPrefs.includes("Any")) {
                  const diet = (personalData?.diet || "").toLowerCase()
                  const matchesDiet = appliedFilters.dietPrefs.some(pref => {
                    const prefLower = pref.toLowerCase()
                    // Handle special cases
                    if (prefLower === "strictly vegetarian" && diet.includes("vegetarian")) return true
                    if (prefLower === "jain vegetarian" && diet.includes("jain")) return true
                    if (prefLower === "non-vegetarian" && diet.includes("non")) return true
                    if (prefLower === "open to both") return true
                    return diet.includes(prefLower) || prefLower.includes(diet)
                  })
                  if (!matchesDiet) {
                    return null
                  }
                }
              }

              // Apply lifestyle filter (smoker/drinker)
              if (appliedFilters.lifestylePrefs && appliedFilters.lifestylePrefs.length > 0) {
                if (!appliedFilters.lifestylePrefs.includes("Any")) {
                  const isSmoker = personalData?.smoker || false
                  const isDrinker = personalData?.drinker || false
                  
                  const matchesLifestyle = appliedFilters.lifestylePrefs.some(pref => {
                    const prefLower = pref.toLowerCase()
                    if (prefLower === "non-smoker" && isSmoker) return false
                    if (prefLower === "non-drinker" && isDrinker) return false
                    if (prefLower === "occasional drinker" && !isDrinker) return false
                    if (prefLower === "social drinker" && !isDrinker) return false
                    return true
                  })
                  
                  if (!matchesLifestyle) {
                    return null
                  }
                }
              }

              // Apply verified only filter
              if (appliedFilters.verifiedOnly) {
                if (verification?.verification_status !== "approved") {
                  return null
                }
              }

              if (appliedFilters.premiumOnly && !premiumUserIds.has(matrimonyProfile.user_id)) {
                return null
              }
            }

            return {
              id: matrimonyProfile.user_id,
              publicProfileId: matrimonyProfile.public_profile_id || getPublicProfileId({ user_id: matrimonyProfile.user_id }),
              name: matrimonyProfile.name,
              age: calculatedAge,
              gender: matrimonyProfile.gender || personalData?.gender || undefined,
              education: careerData?.highest_education || "",
              profession: careerData?.job_title || "",
              income: careerData?.annual_income || undefined,
              location: location,
              community: culturalData?.community || undefined,
              religion: culturalData?.religion || undefined,
              photos: getSafeProfilePhotos(photosData, matrimonyProfile.name, matrimonyProfile.user_id),
              hasRealPhotos: photosData.length > 0,
              bio: bioText || undefined,
              interests: [], // Not in current schema, can be added later
              verified: verification?.verification_status === "approved",
              premium: premiumUserIds.has(matrimonyProfile.user_id),
              height, // Add height to profile
              maritalStatus: personalData?.marital_status || undefined,
              createdBy: matrimonyProfile.created_by || "Self",
              personal: personalData,
              career: careerData,
              cultural: culturalData,
              family: familyData,
              partnerPreferences: preferenceData,
              phoneMasked: contact?.phoneMasked || undefined,
              phone: contact?.phoneRevealed || undefined,
              canRevealPhone: contact?.canReveal,
            }
          })
          .filter((profile): profile is NonNullable<typeof profile> => profile !== null) as MatrimonyProfile[]

        setProfiles(combinedProfiles)
      } catch (error) {
        console.error("Unexpected error fetching matrimony profiles:", error)
        setProfiles([])
        setViewerProfile(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfiles()
  }, [appliedFilters, refreshSwipeLimitStatus])

  // Prevent body scroll when on discover screen
  useEffect(() => {
    if (currentScreen === "discover") {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [currentScreen])

  const activeProfileIndex = profiles.length > 0 ? currentCardIndex % profiles.length : 0
  const currentProfile = profiles[activeProfileIndex]
  const hasMoreProfiles = profiles.length > 0
  const visibleProfileStack = useMemo(
    () =>
      profiles.length === 0
        ? []
        : Array.from({ length: Math.min(3, profiles.length) }, (_, stackIndex) => {
            const profileIndex = (activeProfileIndex + stackIndex) % profiles.length
            return {
              profile: profiles[profileIndex],
              key: profiles[profileIndex].id,
            }
          }),
    [activeProfileIndex, profiles],
  )
  const swipeLocked = Boolean(swipeLimitStatus && !swipeLimitStatus.allowed)

  const consumeSwipeAllowance = useCallback(() => {
    setSwipeLimitStatus((previousStatus) => {
      if (!previousStatus || previousStatus.isPremium || typeof previousStatus.remaining !== "number") {
        return previousStatus
      }

      const remaining = Math.max(previousStatus.remaining - 1, 0)
      return {
        ...previousStatus,
        allowed: remaining > 0,
        remaining,
        kind: remaining > 0 ? undefined : "swipe",
        error: remaining > 0 ? undefined : getLimitMessage("swipe"),
      }
    })
  }, [])

  const removeProfileFromDeck = useCallback((profileId: string) => {
    setProfiles((previousProfiles) => {
      const nextProfiles = previousProfiles.filter((profile) => profile.id !== profileId)
      setCurrentCardIndex((previousIndex) => (nextProfiles.length > 0 ? previousIndex % nextProfiles.length : 0))
      return nextProfiles
    })
  }, [])

  const handleLike = () => {
    try {
      const currentProfile = profiles[activeProfileIndex]
      if (!currentProfile) {
        toast({
          title: "No profile selected",
          description: "Please wait while we prepare the next profile.",
          variant: "destructive",
        })
        return false
      }

      if (!currentUserId) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to send interest.",
          variant: "destructive",
        })
        return false
      }

      if (swipeLocked) {
        showSwipePaywall()
        return false
      }

      removeProfileFromDeck(currentProfile.id)
      consumeSwipeAllowance()

      void (async () => {
        const result = await recordMatrimonyLike(currentUserId, currentProfile.id, "like")

        if (!result.success) {
          if (result.error?.toLowerCase().includes("swipe limit")) {
            await refreshSwipeLimitStatus(currentUserId)
            showSwipePaywall()
            return
          }
          toast({
            title: "Could not send interest",
            description: result.error || "Please try again.",
            variant: "destructive",
          })
          await refreshSwipeLimitStatus(currentUserId)
          return
        }

        if (result.isMatch) {
          setMatchedProfile(currentProfile)
          setMatchedMatchId(result.matchId || null)
          setShowMatchNotification(true)
        }

        void refreshSwipeLimitStatus(currentUserId)
      })()

      return true
    } catch (error) {
      console.error('[handleLike] Unexpected error:', error)
      return false
    }
  }

  const handlePass = () => {
    try {
      const currentProfile = profiles[activeProfileIndex]
      if (!currentProfile) {
        toast({
          title: "No profile selected",
          description: "Please wait while we prepare the next profile.",
          variant: "destructive",
        })
        return false
      }

      if (!currentUserId) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to update discovery.",
          variant: "destructive",
        })
        return false
      }

      if (swipeLocked) {
        showSwipePaywall()
        return false
      }

      removeProfileFromDeck(currentProfile.id)
      consumeSwipeAllowance()

      void (async () => {
        const result = await recordMatrimonyLike(currentUserId, currentProfile.id, "pass")

        if (!result.success) {
          if (result.error?.toLowerCase().includes("swipe limit")) {
            await refreshSwipeLimitStatus(currentUserId)
            showSwipePaywall()
            return
          }
          toast({
            title: "Could not update profile",
            description: result.error || "Please try again.",
            variant: "destructive",
          })
          await refreshSwipeLimitStatus(currentUserId)
          return
        }

        void refreshSwipeLimitStatus(currentUserId)
      })()

      return true
    } catch (error) {
      console.error('[handlePass] Unexpected error:', error)
      return false
    }
  }

  const handleSuperLike = async () => {
    try {
      const currentProfile = profiles[activeProfileIndex]
      if (!currentProfile) {
        toast({
          title: "No profile selected",
          description: "Please wait while we prepare the next profile.",
          variant: "destructive",
        })
        return false
      }

      if (!currentUserId) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to send a Super Like.",
          variant: "destructive",
        })
        return false
      }

      const superLikeStatus = await getSuperLikeLimitStatus(currentUserId)
      if (!superLikeStatus.allowed) {
        showPremiumUpsell(
          "Unlock Super Likes",
          superLikeStatus.error || "Upgrade for more standout interests.",
          "discover",
        )
        return false
      }

      removeProfileFromDeck(currentProfile.id)
      const result = await recordMatrimonyLike(currentUserId, currentProfile.id, "super_like")
      if (!result.success) {
        toast({
          title: "Could not send Super Like",
          description: result.error || "Please try again.",
          variant: "destructive",
        })
        return false
      }

      toast({
        title: `Super Like sent to ${currentProfile.name}`,
        description:
          typeof superLikeStatus.remaining === "number"
            ? `${Math.max(superLikeStatus.remaining - 1, 0)} Super Likes remaining this month.`
            : "Your profile was placed above regular interests.",
      })

      if (result.isMatch) {
        setMatchedProfile(currentProfile)
        setMatchedMatchId(result.matchId || null)
        setShowMatchNotification(true)
      }

      return true
    } catch (error: any) {
      console.error("[handleSuperLike] Unexpected error:", error)
      toast({
        title: "Could not send Super Like",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  const handleProfileAction = useCallback(
    async (profile: MatrimonyProfile, preference: "like" | "pass" | "super_like") => {
      try {
        if (!currentUserId) {
          toast({
            title: "Please sign in",
            description: "You need to be signed in to interact with profiles.",
            variant: "destructive",
          })
          return false
        }

        if (preference === "super_like") {
          const superLikeStatus = await getSuperLikeLimitStatus(currentUserId)
          if (!superLikeStatus.allowed) {
            showPremiumUpsell(
              "Unlock Super Likes",
              superLikeStatus.error || "Upgrade for more standout interests.",
              "discover",
            )
            return false
          }
        } else if (swipeLocked) {
          showSwipePaywall()
          return false
        }

        removeProfileFromDeck(profile.id)
        if (preference !== "super_like") {
          consumeSwipeAllowance()
        }

        const result = await recordMatrimonyLike(currentUserId, profile.id, preference)
        if (!result.success) {
          if (result.error?.toLowerCase().includes("swipe limit")) {
            await refreshSwipeLimitStatus(currentUserId)
            showSwipePaywall()
            return false
          }

          toast({
            title: preference === "pass" ? "Could not ignore profile" : "Could not send interest",
            description: result.error || "Please try again.",
            variant: "destructive",
          })
          await refreshSwipeLimitStatus(currentUserId)
          return false
        }

        if (preference === "like") {
          toast({
            title: "Interest sent",
            description: `${formatPublicProfileName(profile.name)} will see your interest.`,
          })
        }

        if (preference === "super_like") {
          toast({
            title: "Super Interest sent",
            description: `${formatPublicProfileName(profile.name)} will see your profile above regular interests.`,
          })
        }

        if (result.isMatch) {
          setMatchedProfile(profile)
          setMatchedMatchId(result.matchId || null)
          setShowMatchNotification(true)
        }

        void refreshSwipeLimitStatus(currentUserId)
        return true
      } catch (error: any) {
        toast({
          title: "Could not update profile",
          description: error.message || "Please try again.",
          variant: "destructive",
        })
        return false
      }
    },
    [
      consumeSwipeAllowance,
      currentUserId,
      refreshSwipeLimitStatus,
      removeProfileFromDeck,
      showPremiumUpsell,
      showSwipePaywall,
      swipeLocked,
      toast,
    ],
  )

  const handleDiscoveryChat = useCallback(
    async (profile: MatrimonyProfile) => {
      if (!currentUserId) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to start a conversation.",
          variant: "destructive",
        })
        return
      }

      if (!viewerIsPremium && profile.premium) {
        showPremiumUpsell(
          "Unlock premium direct chat",
          "Free starter chats work with free profiles only. Upgrade to chat directly with premium members.",
          "discover",
        )
        return
      }

      const result = await createPremiumDirectMatrimonyMatch(profile.id)
      if (!result.success || !result.matchId) {
        const limitMessage = result.error?.toLowerCase() || ""
        if (
          limitMessage.includes("direct chat") ||
          limitMessage.includes("starter chat") ||
          limitMessage.includes("premium profiles")
        ) {
          showPremiumUpsell(
            "Unlock direct chat",
            result.error || "Upgrade for unlimited direct conversations.",
            "discover",
          )
          return
        }

        toast({
          title: "Could not open chat",
          description: result.error || "Please try again after sending interest.",
          variant: "destructive",
        })
        return
      }

      if (!viewerIsPremium) {
        toast({
          title: "Starter chat opened",
          description: "Free plan includes 3 direct chats and 1 message per profile.",
        })
      }

      setSelectedChatId(result.matchId)
      setCurrentScreen("chat")
    },
    [currentUserId, showPremiumUpsell, toast, viewerIsPremium],
  )

  return (
    <AppLayout 
      activeTab="discover" 
      onTabChange={() => {}} 
      showBottomTabs={false}
      onSettingsClick={() => setCurrentScreen("app-settings")}
      showSettingsButton={true}
      currentScreen={currentScreen}
      mode="matrimony"
    >
      {currentScreen === "discover" && (
        <MatrimonyDiscoveryList
          loading={loading}
          profiles={profiles}
          viewerIsPremium={viewerIsPremium}
          viewerLocation={viewerLocation}
          shortlistedIds={shortlistedIds}
          swipeLimitStatus={swipeLimitStatus}
          appliedFilters={appliedFilters}
          onOpenFilters={() => setShowFilters(true)}
          onOpenPremium={() => {
            setSelectedPlanId("essential")
            setPremiumBackTarget("discover")
            setCurrentScreen("premium")
          }}
          onClearFilters={() => {
            setAppliedFilters(null)
            setCurrentCardIndex(0)
          }}
          onOpenProfile={(profile) => {
            if (profile.premium && !viewerIsPremium) {
              showPremiumUpsell(
                "Unlock premium profile details",
                "Premium profiles are visible to free members, but photos and full details unlock with a paid Lovesathi plan.",
                "discover",
              )
              return
            }
            setShortlistModalProfile(profile)
          }}
          onInterest={(profile) => {
            void handleProfileAction(profile, "like")
          }}
          onIgnore={(profile) => {
            void handleProfileAction(profile, "pass")
          }}
          onShortlist={(profile) => {
            void handleShortlistToggle(profile)
          }}
          onChat={(profile) => void handleDiscoveryChat(profile)}
        />
      )}

      {/* Legacy swipe discovery kept dormant while the list-first matrimony experience rolls out. */}
      {false && currentScreen === "discover" && (
        <>
          <div className="fixed left-4 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 max-w-[70vw] rounded-[1.35rem] border border-[#E83262]/36 bg-[#ffffff]/78 px-4 py-3 shadow-[0_24px_60px_rgba(24,17,13,0.16)] backdrop-blur-2xl sm:left-6 sm:px-5">
            <p className="luxe-kicker text-[0.58rem] text-[#E83262] sm:text-[0.65rem]">Lovesathi private salon</p>
            <p className="truncate font-serif text-xl font-bold leading-none tracking-[-0.05em] text-[#26364A] sm:text-2xl">Curated discovery</p>
            <p className="mt-1 hidden text-xs font-semibold text-[#6F7C8B] sm:block">{profiles.length} profile dossiers prepared</p>
          </div>
          <div className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 sm:right-6">
            <Button
              variant="secondary"
              size="default"
              className="rounded-full border border-[#E83262]/40 bg-[#ffffff]/86 px-4 py-5 text-[#26364A] shadow-[0_24px_60px_rgba(24,17,13,0.16)] backdrop-blur-2xl hover:bg-white sm:px-5"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="h-5 w-5 text-[#E83262]" />
              <span className="hidden font-bold sm:inline">Refine</span>
            </Button>
          </div>
          <DiscountOfferTimer
            onSubscribe={() => {
              setSelectedPlanId("essential")
              setPremiumBackTarget("discover")
              setCurrentScreen("premium")
            }}
          />
          {viewerEntitlement?.paymentDue && (
            <button
              type="button"
              className="fixed left-1/2 top-[calc(5.6rem+env(safe-area-inset-top))] z-40 w-[min(92vw,28rem)] -translate-x-1/2 rounded-full border border-[#E83262]/35 bg-[#26364A]/92 px-4 py-3 text-left shadow-[0_24px_70px_rgba(24,17,13,0.22)] backdrop-blur-2xl sm:top-[calc(5rem+env(safe-area-inset-top))]"
              onClick={() => {
                setPremiumBackTarget("discover")
                setCurrentScreen("premium")
              }}
            >
              <span className="block luxe-kicker text-[0.55rem] text-[#E83262]">subscription renewal due</span>
              <span className="block text-sm font-bold text-[#fff7df]">
                {viewerEntitlement?.graceDaysRemaining || 0} day{viewerEntitlement?.graceDaysRemaining === 1 ? "" : "s"} of grace left. Tap to renew.
              </span>
            </button>
          )}
        </>
      )}

      {false && currentScreen === "discover" && (
        <div className="fixed inset-0 flex h-[100svh] min-h-[100svh] w-full flex-col overflow-hidden bg-[#F6F7FB] sm:h-[100dvh] sm:min-h-[100dvh]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(216,199,159,0.34),transparent_25rem),radial-gradient(circle_at_82%_12%,rgba(194,165,116,0.18),transparent_28rem),radial-gradient(circle_at_50%_104%,rgba(185,144,77,0.30),transparent_32rem),linear-gradient(135deg,#F6F7FB_0%,#fbf3e5_46%,#f1d9aa_100%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.34] [background-image:linear-gradient(rgba(185,144,77,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(185,144,77,0.10)_1px,transparent_1px)] [background-size:88px_88px] [mask-image:radial-gradient(circle_at_center,black,transparent_76%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[linear-gradient(to_bottom,rgba(255,253,248,0.96),rgba(255,253,248,0))]" />
          <div className="pointer-events-none absolute left-1/2 top-20 hidden h-[78vh] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#E83262]/30 to-transparent lg:block" />
          <div className="pointer-events-none absolute bottom-[-9rem] left-1/2 h-72 w-[52rem] -translate-x-1/2 rounded-full bg-[#E83262]/20 blur-3xl" />
          
          <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(7.5rem+env(safe-area-inset-top))] sm:px-6 sm:pb-[calc(6.25rem+env(safe-area-inset-bottom))] lg:px-10 lg:pt-28">
            {loading ? (
              <div className="flex items-center justify-center h-full w-full">
                <div className="luxe-card rounded-[2rem] border-[#E83262]/30 p-8 text-center shadow-[0_28px_90px_rgba(24,17,13,0.14)]">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#E83262] border-t-[#E83262]" />
                  <p className="mt-4 luxe-kicker text-[0.62rem] text-[#E83262]">private curation</p>
                  <p className="mt-2 text-sm font-bold text-[#26364A]">Preparing premium profile dossiers...</p>
                </div>
              </div>
            ) : (
              <div className="grid w-full max-w-[1240px] items-center gap-5 lg:grid-cols-[minmax(230px,0.78fr)_minmax(420px,500px)_minmax(230px,0.78fr)] xl:gap-8">
                <aside className="hidden lg:block">
                  <div className="luxe-card space-y-5 rounded-[2rem] border-[#E83262]/28 p-6 shadow-[0_30px_90px_rgba(24,17,13,0.12)]">
                    <div>
                      <p className="luxe-kicker text-[0.62rem] text-[#E83262]">today's salon</p>
                      <h2 className="mt-2 font-serif text-4xl font-bold leading-[0.95] tracking-[-0.07em] text-[#26364A]">
                        Serious introductions, beautifully curated.
                      </h2>
                    </div>
                    <p className="text-sm font-semibold leading-6 text-[#6F7C8B]">
                      Every card should feel like a private profile dossier, not a casual swipe tile.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-[#E83262]/24 bg-white/62 p-4">
                        <p className="font-serif text-3xl font-bold tracking-[-0.06em] text-[#E83262]">{profiles.length}</p>
                        <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#6F7C8B]">profiles</p>
                      </div>
                      <div className="rounded-2xl border border-[#E83262]/24 bg-white/62 p-4">
                        <ShieldCheck className="h-6 w-6 text-[#E83262]" />
                        <p className="mt-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#6F7C8B]">trust first</p>
                      </div>
                    </div>
                  </div>
                </aside>

                {/* Card Stack */}
                <div className="relative mx-auto flex h-[min(64svh,610px)] w-full max-w-[min(92vw,470px)] items-center justify-center overflow-visible md:h-[min(72dvh,680px)]">
                  <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.78),rgba(216,199,159,0.22)_42%,transparent_70%)] blur-xl" />
                  <div className="pointer-events-none absolute -bottom-8 h-20 w-[82%] rounded-full bg-[#26364A]/20 blur-2xl" />
                  <div className="pointer-events-none absolute inset-x-7 -bottom-4 h-5 rounded-full bg-[#6F7C8B]/18 blur-md" />
                  {hasMoreProfiles && profiles.length > 0 ? (
                    <div className="relative w-full h-full overflow-visible">
                      {visibleProfileStack.map(({ profile, key }, index) => (
                          <div key={key} className="absolute inset-0 flex items-center justify-center">
                            <MatrimonySwipeCard
                              profileId={profile.id}
                              name={profile.name}
                              age={profile.age}
                              height={profile.height}
                              profession={profile.profession}
                              community={profile.community}
                              location={profile.location}
                              photos={profile.photos}
                              verified={profile.verified}
                              premium={profile.premium}
                              viewerIsPremium={viewerIsPremium}
                              visibilityLabel={profile.visibilityLabel}
                              bio={profile.bio}
                              interests={profile.interests}
                              education={profile.education}
                              phoneMasked={profile.phoneMasked}
                              phone={profile.phone}
                              canRevealPhone={profile.canRevealPhone}
                              currentUserId={currentUserId}
                              onConnect={index === 0 ? () => handleLike() : () => {}}
                              onNotNow={index === 0 ? () => handlePass() : () => {}}
                              onChat={index === 0 ? () => void handleDiscoveryChat(profile) : undefined}
                              onSuperLike={index === 0 ? () => handleSuperLike() : () => {}}
                              onPhoneUpgrade={() =>
                                showPremiumUpsell(
                                  "Unlock contact details",
                                  "Subscribe to reveal masked profile phone numbers safely inside Lovesathi.",
                                  "discover",
                                )
                              }
                              onPremiumProfileUpgrade={() =>
                                showPremiumUpsell(
                                  "Unlock premium profile details",
                                  "Premium profiles are visible to free members, but photos and full details unlock with a paid Lovesathi plan.",
                                  "discover",
                                )
                              }
                              onRevealPhone={handleRevealPhone}
                              isShortlisted={shortlistedIds.has(profile.id)}
                              onToggleShortlist={() => handleShortlistToggle(profile)}
                              swipeLocked={swipeLocked}
                              onSwipeLocked={showSwipePaywall}
                              onProfileClick={() => {
                                if (profile.premium && !viewerIsPremium) {
                                  showPremiumUpsell(
                                    "Unlock premium profile details",
                                    "Subscribe to view premium profile photos and full family details.",
                                    "discover",
                                  )
                                  return
                                }
                                setShortlistModalProfile(profile)
                              }}
                              stackIndex={index}
                            />
                          </div>
                        ))}
                    </div>
                  ) : (
                    <Card className="luxe-card flex h-96 w-full max-w-sm items-center justify-center rounded-[2rem] border-[#E83262]/30 shadow-[0_28px_90px_rgba(24,17,13,0.12)]">
                      <CardContent className="text-center space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E83262]/10">
                          <Heart className="h-8 w-8 text-[#E83262]" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-serif text-2xl font-bold text-[#26364A]">No more profiles</h3>
                          <p className="text-sm leading-6 text-[#6F7C8B]">
                            {profiles.length === 0
                              ? "No matching completed profiles are available right now. Try relaxing filters, checking your preferences, or coming back after more members complete verification."
                              : "You have reviewed this set. New completed profiles will appear here as members join."}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                          {profiles.length > 0 && (
                            <Button onClick={() => setCurrentCardIndex(0)} className="luxe-button rounded-full">Start Over</Button>
                          )}
                          {appliedFilters && (
                            <Button
                              variant="outline"
                              className="rounded-full border-[#482b1a]/15 bg-white"
                              onClick={() => {
                                setAppliedFilters(null)
                                setCurrentCardIndex(0)
                              }}
                            >
                              Clear filters
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <aside className="hidden lg:block">
                  <div className="space-y-4">
                    <div className="rounded-[1.75rem] border border-[#E83262]/28 bg-[#ffffff]/76 p-5 shadow-[0_24px_70px_rgba(24,17,13,0.10)] backdrop-blur-2xl">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E83262] text-white shadow-[0_18px_42px_rgba(194,165,116,0.22)]">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 font-serif text-2xl font-bold tracking-[-0.05em] text-[#26364A]">Refined discovery</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#6F7C8B]">
                        Tune age, height, location, family context, lifestyle, and verified-only visibility.
                      </p>
                    </div>
                    <div className="rounded-[1.75rem] border border-[#E83262]/28 bg-[#26364A]/88 p-5 text-[#ffffff] shadow-[0_28px_90px_rgba(24,17,13,0.18)] backdrop-blur-2xl">
                      <Crown className="h-6 w-6 text-[#E83262]" />
                      <p className="mt-4 luxe-kicker text-[0.58rem] text-[#E83262]">premium signal</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#ffffff]/78">
                        Verified filters reopen after the free allowance when a paid membership is active.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </div>
          {hasMoreProfiles && profiles.length > 0 && (
            <div className="pointer-events-none fixed bottom-[calc(5.35rem+env(safe-area-inset-bottom))] left-1/2 z-30 hidden -translate-x-1/2 rounded-full border border-[#E83262]/24 bg-[#ffffff]/70 px-4 py-2 text-xs font-bold text-[#6F7C8B] shadow-[0_18px_48px_rgba(24,17,13,0.12)] backdrop-blur-xl sm:block">
              Swipe with intention. Tap the card for the full dossier.
            </div>
          )}
        </div>
      )}

      {currentScreen === "messages" && (
        <div className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-[#F6F7FB]">
          <MatrimonyChatList onChatClick={(chatId) => {
            setSelectedChatId(chatId)
            setCurrentScreen("chat")
          }} onBack={() => setCurrentScreen("discover")} />
        </div>
      )}

      {currentScreen === "activity" && (
        <div className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-[#F6F7FB]">
          <ActivityScreen
            mode="matrimony"
            onProfileClick={(userId) => {
              setViewedUserId(userId)
              setCurrentScreen("view-profile")
            }}
            onMatchClick={(matchId) => {
              setSelectedChatId(matchId)
              setCurrentScreen("chat")
            }}
            onUpgrade={() =>
              showPremiumUpsell(
                "Unlock profile viewers",
                "Premium members can see who recently viewed their profile.",
                "activity",
              )
            }
            onBack={() => setCurrentScreen("discover")}
          />
        </div>
      )}

      {currentScreen === "shortlist" && (
        <div className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-[#F6F7FB]">
          <div className="flex flex-col h-full relative">
            {/* Static Background */}
            <StaticBackground />
            
            {/* Header */}
            <div className="flex-shrink-0 border-b border-[#482b1a]/10 bg-[#ffffff]/84 p-4 shadow-[0_18px_55px_rgba(24,17,13,0.08)] backdrop-blur-xl">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-2 hover:bg-gray-50 rounded-full text-black" 
                    onClick={handleOpenDiscover}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <p className="luxe-kicker text-[0.62rem] text-[#E83262]">saved profiles</p>
                    <h1 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#26364A]">Shortlist</h1>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <MatrimonyShortlistView
                profiles={shortlistedProfiles}
                loading={shortlistLoading}
                onRemove={async (profileId) => {
                  const profile = shortlistedProfiles.find((p) => p.id === profileId)
                  return handleShortlistRemove(profileId, profile?.name)
                }}
                onOpenProfile={(profile) => {
  setViewedUserId(profile.id)
  setCameFromShortlist(true)
  setCurrentScreen("view-profile")
}}
              />
            </div>
          </div>
        </div>
      )}

      {currentScreen === "chat" && selectedChatId && (
        <div className="fixed inset-0 z-50 h-[100svh] max-h-[100svh] overflow-hidden bg-background sm:h-[100dvh] sm:max-h-[100dvh]">
          <ChatScreen 
            matchId={selectedChatId} 
            onBack={() => setCurrentScreen("messages")} 
            onViewProfile={(userId, mode) => {
              setViewedUserId(userId)
              setCameFromChat(true)
              setCurrentScreen("view-profile")
            }}
          />
        </div>
      )}

      {currentScreen === "profile" && (
        <SettingsScreen
          mode="matrimony"
          onNavigate={(id) => {
            if (id === "profile") setCurrentScreen("edit-profile")
            else if (id === "premium") {
              setPremiumBackTarget("profile")
              setCurrentScreen("premium")
            }
            else if (id === "verification") setCurrentScreen("verification-status")
            else if (id === "app_settings") setCurrentScreen("app-settings")
            else if (id === "partner_preferences") setCurrentScreen("partner-preferences")
            else if (id === "astrology") setCurrentScreen("astrology")
            else if (id === "phonebook") setCurrentScreen("phonebook")
            else if (id === "events") router.push("/events")
            else if (id === "help_safety") setCurrentScreen("safety-centre")
            else if (id === "help_support") setCurrentScreen("help-support")
            else if (id === "success_stories") setCurrentScreen("success-stories")
            else if (id === "help_faq") router.push("/faq")
            else if (id === "help_contact") router.push("/contact")
            else if (id === "help_report_bug") router.push("/contact")
          }}
          onLogout={handleLogout}
          onBack={() => setCurrentScreen("discover")}
        />
      )}

      {currentScreen === "edit-profile" && (
        <div className="p-0 pb-0 mt-0">
          <EditProfile
            mode="matrimony"
            onBack={() => setCurrentScreen("profile")}
            onSave={() => {
              // Profile will refresh automatically
              setCurrentScreen("profile")
            }}
          />
        </div>
      )}

      {currentScreen === "premium" && (
        <div className="p-0 pb-0 mt-0">
          <PremiumScreen
            mode="matrimony"
            onPlanSelect={(planId) => setSelectedPlanId(planId)}
            onSubscribe={(planId) => {
              setSelectedPlanId(planId)
              setCurrentScreen("payment")
            }}
            onBack={() => setCurrentScreen(premiumBackTarget)}
          />
        </div>
      )}

      {currentScreen === "payment" && (
        <div className="p-0 pb-0 mt-0">
          <PaymentScreen
            planId={selectedPlanId || "essential"}
            onSuccess={() => setCurrentScreen("premium-features")}
            onCancel={() => setCurrentScreen("premium")}
          />
        </div>
      )}

      {currentScreen === "premium-features" && (
        <div className="p-0 pb-0 mt-0">
          <PremiumFeatures onBack={() => setCurrentScreen("profile")} />
        </div>
      )}

      {currentScreen === "verification-status" && (
        <div className="p-0 pb-0 mt-0">
          <VerificationStatus mode="matrimony" onBack={() => setCurrentScreen("profile")} />
        </div>
      )}

      {currentScreen === "partner-preferences" && (
        <MatrimonyPreferencesSettings onBack={() => setCurrentScreen("profile")} />
      )}

      {(["astrology", "phonebook", "safety-centre", "help-support", "success-stories"] as string[]).includes(currentScreen) && (
        <MatrimonyInfoScreen
          screen={currentScreen as MatrimonyInfoScreenId}
          onBack={() => setCurrentScreen("profile")}
        />
      )}

      {currentScreen === "view-profile" && viewedUserId && (
        <div className="p-0 pb-0 mt-0">
          <ProfileView 
            mode="matrimony" 
            userId={viewedUserId}
            isOwnProfile={false}
            onUpgrade={() =>
              showPremiumUpsell(
                "Unlock contact details",
                "Subscribe to reveal masked profile phone numbers and keep contact sharing safe.",
                "activity",
              )
            }
            onBack={() => {
              if (cameFromChat) {
                setCameFromChat(false)
                setCurrentScreen("chat")
              } else if (cameFromShortlist) {
                setCameFromShortlist(false)
                setCurrentScreen("shortlist")
              } else {
                setCurrentScreen("activity")
              }
            }}
          />
        </div>
      )}

      {/* Match Notification */}
      <DiscountOfferDialog
        onSubscribe={() => {
          setSelectedPlanId("basic")
          setPremiumBackTarget("discover")
          setCurrentScreen("premium")
        }}
      />

      {showMatchNotification && matchedProfile && (
        <MatchNotification
          match={{
            id: matchedProfile.id,
            name: matchedProfile.name,
            avatar: matchedProfile.photos?.[0] || getProfileFallbackImage(matchedProfile.name, matchedProfile.id),
            age: matchedProfile.age,
            mutualInterests: matchedProfile.interests || []
          }}
          onStartChat={() => {
            setShowMatchNotification(false)
            if (matchedMatchId) {
              setSelectedChatId(matchedMatchId)
              setCurrentScreen("chat")
            } else {
              console.error("No matchId available for chat")
            }
          }}
          onKeepSwiping={() => {
            setShowMatchNotification(false)
            setMatchedProfile(null)
            setMatchedMatchId(null)
          }}
          onClose={() => {
            setShowMatchNotification(false)
            setMatchedProfile(null)
            setMatchedMatchId(null)
          }}
        />
      )}

      {shortlistModalProfile && (
        <MatrimonyProfileModal
          profile={shortlistModalProfile}
          open={!!shortlistModalProfile}
          viewerProfile={viewerProfile}
          viewerIsPremium={viewerIsPremium}
          isMatched={false}
          onOpenChange={(open) => {
            if (!open) setShortlistModalProfile(null)
          }}
          onPhoneUpgrade={() =>
            showPremiumUpsell(
              "Unlock contact details",
              "Subscribe to reveal masked profile phone numbers safely inside Lovesathi.",
              "discover",
            )
          }
          onRevealPhone={handleRevealPhone}
          onConnect={() => {
            void handleShortlistConnect(shortlistModalProfile)
            setShortlistModalProfile(null)
          }}
          onChat={() => {
            setShortlistModalProfile(null)
            void handleDiscoveryChat(shortlistModalProfile)
          }}
          onSuperLike={() => {
            void handleProfileAction(shortlistModalProfile, "super_like")
            setShortlistModalProfile(null)
          }}
          onNotNow={() => {
            void handleShortlistRemove(shortlistModalProfile.id, shortlistModalProfile.name)
            setShortlistModalProfile(null)
          }}
        />
      )}

      {currentScreen === "app-settings" && (
        <div className="min-h-[100dvh] p-0 pb-0 mt-0">
          <AppSettings
            mode="matrimony"
            onNavigate={(id) => {
              if (id === "help_faq") router.push("/faq")
              else if (id === "help_safety") router.push("/safety")
              else if (id === "help_contact") router.push("/contact")
              else if (id === "help_report_bug") router.push("/contact")
              else if (id === "app_settings") {
                toast({
                  title: "Settings saved locally",
                  description: "Persistent notification and visibility controls are queued for the next backend pass.",
                })
              }
            }}
            onLogout={handleLogout}
            onBack={() => setCurrentScreen("profile")}
          />
        </div>
      )}

      
      {currentScreen !== "chat" && currentScreen !== "app-settings" && currentScreen !== "premium" && currentScreen !== "payment" && currentScreen !== "premium-features" && currentScreen !== "verification-status" && currentScreen !== "edit-profile" && currentScreen !== "view-profile" && currentScreen !== "partner-preferences" && currentScreen !== "astrology" && currentScreen !== "phonebook" && currentScreen !== "safety-centre" && currentScreen !== "help-support" && currentScreen !== "success-stories" && (
        <QuickActions
          activeTab={currentScreen}
          onOpenChat={() => setCurrentScreen("messages")}
          onOpenActivity={() => setCurrentScreen("activity")}
          onOpenProfile={() => setCurrentScreen("profile")}
          onDiscover={handleOpenDiscover}
          onOpenShortlist={handleOpenShortlist}
          showShortlist
          mode="matrimony"
        />
      )}

      {/* Matrimony Filter Sheet */}
      <MatrimonyFilterSheet 
        open={showFilters} 
        onOpenChange={setShowFilters}
        onApplyFilters={(filters) => {
          setAppliedFilters(filters)
          setCurrentCardIndex(0) // Reset to first card when filters change
        }}
      />
    </AppLayout>
  )
}
