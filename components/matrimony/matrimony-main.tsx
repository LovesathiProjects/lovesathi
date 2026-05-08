"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AppLayout } from "@/components/layout/app-layout"
import { QuickActions } from "@/components/navigation/quick-actions"
// Removed TopBackButton usage
import { Filter, ArrowLeft, Heart, ShieldCheck, Sparkles, Crown } from "lucide-react"
import { MatrimonySwipeCard } from "@/components/matrimony/matrimony-swipe-card"
import { MatrimonyChatList } from "@/components/matrimony/matrimony-chat-list"
import { ChatScreen } from "@/components/chat/chat-screen"
import { MatrimonyFilterSheet } from "@/components/matrimony/matrimony-filter-sheet"
import { DynamicBackground } from "@/components/discovery/dynamic-background"
import { StaticBackground } from "@/components/discovery/static-background"
import { BackFloatingButton } from "@/components/navigation/back-floating-button"
import { SettingsScreen } from "@/components/settings/settings-screen"
import { ActivityScreen } from "@/components/activity/activity-screen"
import { AppSettings } from "@/components/settings/app-settings"
import { PremiumScreen } from "@/components/premium/premium-screen"
import { PaymentScreen } from "@/components/premium/payment-screen"
import { PremiumFeatures } from "@/components/premium/premium-features"
import { VerificationStatus } from "@/components/profile/verification-status"
import { EditProfile } from "@/components/profile/edit-profile"
import type { MatrimonyProfile } from "@/lib/mockMatrimonyProfiles"
import { buildSupplementalMatrimonyProfiles } from "@/lib/matrimonySupplementalProfiles"
import { withUniqueDiscoveryPhotos } from "@/lib/discoveryPhotos"
import { supabase } from "@/lib/supabaseClient"
import { handleLogout } from "@/lib/logout"
import {
  getMatrimonyDiscoverySwipeStatus,
  getMatrimonyLikedProfiles,
  recordMatrimonyLike,
} from "@/lib/matchmakingService"
import { getSuperLikeLimitStatus, type UsageLimitStatus } from "@/lib/planLimits"
import { getProfileContacts } from "@/lib/profileContacts"
import { MatchNotification } from "@/components/chat/match-notification"
import type { FilterState } from "@/components/matrimony/matrimony-filter-sheet"
import { useToast } from "@/hooks/use-toast"
import { useMatrimonyShortlist } from "@/hooks/useMatrimonyShortlist"
import { MatrimonyShortlistView } from "@/components/matrimony/matrimony-shortlist"
import { MatrimonyProfileModal } from "@/components/matrimony/matrimony-profile-modal"
import { ProfileView } from "@/components/profile/profile-view"
import { calculateAgeFromDate } from "@/lib/age"
import { getLocationCity } from "@/lib/location"

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
  >(initialScreen)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [viewedUserId, setViewedUserId] = useState<string | null>(null)
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
            ? `${profile.name} was removed from your saved profiles.`
            : `${profile.name} has been saved for later.`,
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
          description: profileName ? `${profileName} was removed.` : "Profile removed.",
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
          title: `You liked ${profile.name}`,
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
          setLoading(false)
          return
        }

        if (!user) {
          setProfiles([])
          setSwipeLimitStatus(null)
          setLoading(false)
          return
        }

        await refreshSwipeLimitStatus(user.id)

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
            name,
            age,
            gender,
            photos,
            personal,
            career,
            cultural,
            family,
            bio,
            is_seeded_profile,
            admin_review_status
          `)
          .eq("profile_completed", true)
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
              name: matrimonyProfile.name,
              age: calculatedAge,
              education: careerData?.highest_education || "",
              profession: careerData?.job_title || "",
              location: location,
              community: culturalData?.community || undefined,
              photos: photosData.length > 0 ? photosData : ["/placeholder-user.jpg"],
              bio: bioText || undefined,
              interests: [], // Not in current schema, can be added later
              verified: verification?.verification_status === "approved",
              premium: premiumUserIds.has(matrimonyProfile.user_id),
              height, // Add height to profile
              phoneMasked: contact?.phoneMasked || undefined,
              phone: contact?.phoneRevealed || undefined,
              canRevealPhone: contact?.canReveal,
            }
          })
          .filter((profile): profile is NonNullable<typeof profile> => profile !== null) as MatrimonyProfile[]

        const realProfileNames = new Set(combinedProfiles.map((profile) => profile.name.toLowerCase()))
        const supplementalProfiles = buildSupplementalMatrimonyProfiles({
          currentUserGender,
          excludedIds: actedProfileIdSet,
          excludedNames: realProfileNames,
          targetCount: 240,
        })

        setProfiles(withUniqueDiscoveryPhotos([...combinedProfiles, ...supplementalProfiles]))
      } catch (error) {
        console.error("Unexpected error fetching matrimony profiles:", error)
        setProfiles([])
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
        : Array.from({ length: Math.min(4, profiles.length) }, (_, stackIndex) => {
            const profileIndex = (activeProfileIndex + stackIndex) % profiles.length
            return {
              profile: profiles[profileIndex],
              key: `${profiles[profileIndex].id}-${currentCardIndex}-${stackIndex}`,
            }
          }),
    [activeProfileIndex, currentCardIndex, profiles],
  )
  const swipeLocked = Boolean(swipeLimitStatus && !swipeLimitStatus.allowed)

  const removeProfileFromDeck = useCallback((profileId: string) => {
    setProfiles((previousProfiles) => {
      const nextProfiles = previousProfiles.filter((profile) => profile.id !== profileId)
      setCurrentCardIndex((previousIndex) => (nextProfiles.length > 0 ? previousIndex % nextProfiles.length : 0))
      return nextProfiles
    })
  }, [])

  const handleLike = async () => {
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

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to send interest.",
          variant: "destructive",
        })
        return false
      }

      const allowed = await ensureSwipeAllowed(user.id)
      if (!allowed) return false

      // Record the like in database
      const result = await recordMatrimonyLike(user.id, currentProfile.id, 'like')

      if (!result.success) {
        if (result.error?.toLowerCase().includes("swipe limit")) {
          await refreshSwipeLimitStatus(user.id)
          showSwipePaywall()
          return false
        }
        toast({
          title: "Could not send interest",
          description: result.error || "Please try again.",
          variant: "destructive",
        })
        return false
      }
      await refreshSwipeLimitStatus(user.id)
      
      if (result.success && result.isMatch) {
        // Show match notification
        setMatchedProfile(currentProfile)
        setMatchedMatchId(result.matchId || null)
        setShowMatchNotification(true)
      }

      removeProfileFromDeck(currentProfile.id)
      return true
    } catch (error) {
      console.error('[handleLike] Unexpected error:', error)
      return false
    }
  }

  const handlePass = async () => {
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

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to update discovery.",
          variant: "destructive",
        })
        return false
      }

      const allowed = await ensureSwipeAllowed(user.id)
      if (!allowed) return false

      // Record the pass in database
      const result = await recordMatrimonyLike(user.id, currentProfile.id, 'pass')

      if (!result.success) {
        if (result.error?.toLowerCase().includes("swipe limit")) {
          await refreshSwipeLimitStatus(user.id)
          showSwipePaywall()
          return false
        }
        toast({
          title: "Could not update profile",
          description: result.error || "Please try again.",
          variant: "destructive",
        })
        return false
      }
      await refreshSwipeLimitStatus(user.id)

      removeProfileFromDeck(currentProfile.id)
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

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to send a Super Like.",
          variant: "destructive",
        })
        return false
      }

      const superLikeStatus = await getSuperLikeLimitStatus(user.id)
      if (!superLikeStatus.allowed) {
        showPremiumUpsell(
          "Unlock Super Likes",
          superLikeStatus.error || "Choose a paid plan to send standout interest.",
          "discover",
        )
        return false
      }

      const result = await recordMatrimonyLike(user.id, currentProfile.id, "super_like")
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

      removeProfileFromDeck(currentProfile.id)
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
      {/* Floating header elements */}
      {currentScreen === "discover" && (
        <>
          <div className="fixed left-4 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 max-w-[70vw] rounded-[1.35rem] border border-[#d8c79f]/36 bg-[#ffffff]/78 px-4 py-3 shadow-[0_24px_60px_rgba(24,17,13,0.16)] backdrop-blur-2xl sm:left-6 sm:px-5">
            <p className="luxe-kicker text-[0.58rem] text-[#8f001c] sm:text-[0.65rem]">Lovesathi private salon</p>
            <p className="truncate font-serif text-xl font-bold leading-none tracking-[-0.05em] text-[#18110d] sm:text-2xl">Curated discovery</p>
            <p className="mt-1 hidden text-xs font-semibold text-[#685f58] sm:block">{profiles.length} profile dossiers prepared</p>
          </div>
          <div className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 sm:right-6">
            <Button
              variant="secondary"
              size="default"
              className="rounded-full border border-[#d8c79f]/40 bg-[#ffffff]/86 px-4 py-5 text-[#18110d] shadow-[0_24px_60px_rgba(24,17,13,0.16)] backdrop-blur-2xl hover:bg-white sm:px-5"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="h-5 w-5 text-[#8f001c]" />
              <span className="hidden font-bold sm:inline">Refine</span>
            </Button>
          </div>
        </>
      )}

      {currentScreen === "discover" && (
        <div className="fixed inset-0 flex h-[100dvh] min-h-[100dvh] w-screen flex-col overflow-hidden bg-[#fdfdfb]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(216,199,159,0.34),transparent_25rem),radial-gradient(circle_at_82%_12%,rgba(143,0,28,0.18),transparent_28rem),radial-gradient(circle_at_50%_104%,rgba(185,144,77,0.30),transparent_32rem),linear-gradient(135deg,#fdfdfb_0%,#fbf3e5_46%,#f1d9aa_100%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.34] [background-image:linear-gradient(rgba(185,144,77,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(185,144,77,0.10)_1px,transparent_1px)] [background-size:88px_88px] [mask-image:radial-gradient(circle_at_center,black,transparent_76%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[linear-gradient(to_bottom,rgba(255,253,248,0.96),rgba(255,253,248,0))]" />
          <div className="pointer-events-none absolute left-1/2 top-20 hidden h-[78vh] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#d8c79f]/30 to-transparent lg:block" />
          <div className="pointer-events-none absolute bottom-[-9rem] left-1/2 h-72 w-[52rem] -translate-x-1/2 rounded-full bg-[#b79b62]/20 blur-3xl" />
          <DynamicBackground imageUrl={currentProfile?.photos?.[0] || null} />
          
          <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(7.5rem+env(safe-area-inset-top))] sm:px-6 sm:pb-[calc(6.25rem+env(safe-area-inset-bottom))] lg:px-10 lg:pt-28">
            {loading ? (
              <div className="flex items-center justify-center h-full w-full">
                <div className="luxe-card rounded-[2rem] border-[#d8c79f]/30 p-8 text-center shadow-[0_28px_90px_rgba(24,17,13,0.14)]">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#d8c79f] border-t-[#8f001c]" />
                  <p className="mt-4 luxe-kicker text-[0.62rem] text-[#8f001c]">private curation</p>
                  <p className="mt-2 text-sm font-bold text-[#18110d]">Preparing premium profile dossiers...</p>
                </div>
              </div>
            ) : (
              <div className="grid w-full max-w-[1240px] items-center gap-5 lg:grid-cols-[minmax(230px,0.78fr)_minmax(420px,500px)_minmax(230px,0.78fr)] xl:gap-8">
                <aside className="hidden lg:block">
                  <div className="luxe-card space-y-5 rounded-[2rem] border-[#d8c79f]/28 p-6 shadow-[0_30px_90px_rgba(24,17,13,0.12)]">
                    <div>
                      <p className="luxe-kicker text-[0.62rem] text-[#8f001c]">today's salon</p>
                      <h2 className="mt-2 font-serif text-4xl font-bold leading-[0.95] tracking-[-0.07em] text-[#18110d]">
                        Serious introductions, beautifully curated.
                      </h2>
                    </div>
                    <p className="text-sm font-semibold leading-6 text-[#685f58]">
                      Every card should feel like a private profile dossier, not a casual swipe tile.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-[#d8c79f]/24 bg-white/62 p-4">
                        <p className="font-serif text-3xl font-bold tracking-[-0.06em] text-[#8f001c]">{profiles.length}</p>
                        <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#685f58]">profiles</p>
                      </div>
                      <div className="rounded-2xl border border-[#d8c79f]/24 bg-white/62 p-4">
                        <ShieldCheck className="h-6 w-6 text-[#8f001c]" />
                        <p className="mt-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#685f58]">trust first</p>
                      </div>
                    </div>
                  </div>
                </aside>

                {/* Card Stack */}
                <div className="relative mx-auto flex h-[min(64svh,610px)] w-full max-w-[min(92vw,470px)] items-center justify-center overflow-visible md:h-[min(72dvh,680px)]">
                  <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.78),rgba(216,199,159,0.22)_42%,transparent_70%)] blur-xl" />
                  <div className="pointer-events-none absolute -bottom-8 h-20 w-[82%] rounded-full bg-[#18110d]/20 blur-2xl" />
                  <div className="pointer-events-none absolute inset-x-7 -bottom-4 h-5 rounded-full bg-[#685f58]/18 blur-md" />
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
                              demo={profile.demo}
                              visibilityLabel={profile.visibilityLabel}
                              bio={profile.bio}
                              interests={profile.interests}
                              education={profile.education}
                              phoneMasked={profile.phoneMasked}
                              phone={profile.phone}
                              canRevealPhone={profile.canRevealPhone}
                              onConnect={index === 0 ? () => handleLike() : () => {}}
                              onNotNow={index === 0 ? () => handlePass() : () => {}}
                              onSuperLike={index === 0 ? () => handleSuperLike() : () => {}}
                              onPhoneUpgrade={() =>
                                showPremiumUpsell(
                                  "Unlock contact details",
                                  "Subscribe to reveal masked profile phone numbers safely inside Lovesathi.",
                                  "discover",
                                )
                              }
                              isShortlisted={shortlistedIds.has(profile.id)}
                              onToggleShortlist={() => handleShortlistToggle(profile)}
                              swipeLocked={swipeLocked}
                              onSwipeLocked={showSwipePaywall}
                              onProfileClick={() => {
                                setShortlistModalProfile(profile)
                              }}
                              stackIndex={index}
                            />
                          </div>
                        ))}
                    </div>
                  ) : (
                    <Card className="luxe-card flex h-96 w-full max-w-sm items-center justify-center rounded-[2rem] border-[#d8c79f]/30 shadow-[0_28px_90px_rgba(24,17,13,0.12)]">
                      <CardContent className="text-center space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#8f001c]/10">
                          <Heart className="h-8 w-8 text-[#8f001c]" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-serif text-2xl font-bold text-[#18110d]">No more profiles</h3>
                          <p className="text-sm leading-6 text-[#685f58]">
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
                    <div className="rounded-[1.75rem] border border-[#d8c79f]/28 bg-[#ffffff]/76 p-5 shadow-[0_24px_70px_rgba(24,17,13,0.10)] backdrop-blur-2xl">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8f001c] text-[#ffffff] shadow-[0_18px_42px_rgba(143,0,28,0.22)]">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 font-serif text-2xl font-bold tracking-[-0.05em] text-[#18110d]">Refined discovery</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#685f58]">
                        Tune age, height, location, family context, lifestyle, and verified-only visibility.
                      </p>
                    </div>
                    <div className="rounded-[1.75rem] border border-[#d8c79f]/28 bg-[#18110d]/88 p-5 text-[#ffffff] shadow-[0_28px_90px_rgba(24,17,13,0.18)] backdrop-blur-2xl">
                      <Crown className="h-6 w-6 text-[#d8c79f]" />
                      <p className="mt-4 luxe-kicker text-[0.58rem] text-[#d8c79f]">premium signal</p>
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
            <div className="pointer-events-none fixed bottom-[calc(5.35rem+env(safe-area-inset-bottom))] left-1/2 z-30 hidden -translate-x-1/2 rounded-full border border-[#d8c79f]/24 bg-[#ffffff]/70 px-4 py-2 text-xs font-bold text-[#685f58] shadow-[0_18px_48px_rgba(24,17,13,0.12)] backdrop-blur-xl sm:block">
              Swipe with intention. Tap the card for the full dossier.
            </div>
          )}
        </div>
      )}

      {currentScreen === "messages" && (
        <div className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-[#fdfdfb]">
          <MatrimonyChatList onChatClick={(chatId) => {
            setSelectedChatId(chatId)
            setCurrentScreen("chat")
          }} onBack={() => setCurrentScreen("discover")} />
        </div>
      )}

      {currentScreen === "activity" && (
        <div className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-[#fdfdfb]">
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
        <div className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-[#fdfdfb]">
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
                    <p className="luxe-kicker text-[0.62rem] text-[#8f001c]">saved profiles</p>
                    <h1 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#18110d]">Shortlist</h1>
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
        <div className="fixed inset-0 z-50 h-[100dvh] max-h-[100dvh] overflow-hidden bg-background">
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
            else if (id === "help_safety") router.push("/safety")
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
            planId={selectedPlanId || "monthly"}
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
      {showMatchNotification && matchedProfile && (
        <MatchNotification
          match={{
            id: matchedProfile.id,
            name: matchedProfile.name,
            avatar: matchedProfile.photos?.[0] || "/placeholder-user.jpg",
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
          onConnect={() => {
            void handleShortlistConnect(shortlistModalProfile)
            setShortlistModalProfile(null)
          }}
          onNotNow={() => {
            void handleShortlistRemove(shortlistModalProfile.id, shortlistModalProfile.name)
            setShortlistModalProfile(null)
          }}
        />
      )}

      {currentScreen === "app-settings" && (
        <div className="p-0 pb-0 mt-0">
          <AppSettings
            mode="matrimony"
            onNavigate={(id) => {
              if (id === "help_faq") router.push("/safety")
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

      
      {currentScreen !== "chat" && currentScreen !== "app-settings" && currentScreen !== "premium" && currentScreen !== "payment" && currentScreen !== "premium-features" && currentScreen !== "verification-status" && currentScreen !== "edit-profile" && currentScreen !== "view-profile" && (
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
