"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Briefcase, CheckCircle2, Edit, Heart, Home, MapPin, Phone, Share, Sparkles, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabaseClient"
import { recordMatrimonyLike, recordMatrimonyProfileView } from "@/lib/matchmakingService"
import { EditProfile } from "./edit-profile"
import { PreferenceCompatibilityCard } from "@/components/matrimony/preference-compatibility-card"
import type { MatrimonyProfileFull } from "@/lib/matrimonyService"
import { useToast } from "@/hooks/use-toast"
import { getProfileContact, revealProfileContact, type ProfileContactInfo } from "@/lib/profileContacts"
import { formatPublicProfileName } from "@/lib/displayName"
import { getUserEntitlementStatus } from "@/lib/planLimits"
import { getPublicProfileId } from "@/lib/profileIdentity"
import { getProfileFallbackImage, getSafeProfilePhotos } from "@/lib/profileImages"

interface ProfileViewProps {
  isOwnProfile?: boolean
  onEdit?: () => void
  onBack?: () => void
  userId?: string
  mode?: "matrimony"
  onUpgrade?: () => void
}

export function ProfileView({ isOwnProfile = false, onBack, userId, onUpgrade }: ProfileViewProps) {
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState<MatrimonyProfileFull | null>(null)
  const [verified, setVerified] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isMatched, setIsMatched] = useState(false)
  const [canLikeBack, setCanLikeBack] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [contact, setContact] = useState<ProfileContactInfo | null>(null)
  const [viewerIsPremium, setViewerIsPremium] = useState(false)
  const [viewerProfile, setViewerProfile] = useState<MatrimonyProfileFull | null>(null)
  const [photoFailed, setPhotoFailed] = useState(false)
  const { toast } = useToast()
  const publicName = formatPublicProfileName(profile?.name)
  const publicProfileId = getPublicProfileId(profile)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" })
    void fetchProfile()
  }, [userId, isOwnProfile])

  useEffect(() => {
    const count = (profile?.photos as string[] | undefined)?.length || 0
    if (count === 0) {
      setCurrentPhotoIndex(0)
      return
    }
    setCurrentPhotoIndex((prev) => (prev >= count ? 0 : prev))
    setPhotoFailed(false)
  }, [profile?.photos])

  async function fetchProfile() {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setViewerProfile(null)
        return
      }
      const entitlement = await getUserEntitlementStatus(user.id)
      setViewerIsPremium(entitlement.isPremium)

      const targetUserId = userId || user.id

      const { data, error } = await supabase
        .from("matrimony_profile_full")
        .select("*")
        .eq("user_id", targetUserId)
        .single()

      if (error) throw error
      setProfile(data as MatrimonyProfileFull)
      setContact(await getProfileContact(targetUserId))

      if (targetUserId === user.id) {
        setViewerProfile(data as MatrimonyProfileFull)
      } else {
        const { data: viewerData, error: viewerError } = await supabase
          .from("matrimony_profile_full")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (viewerError) console.warn("Unable to fetch viewer profile for compatibility:", viewerError.message)
        setViewerProfile((viewerData as MatrimonyProfileFull | null) || null)
      }

      const { data: verification } = await supabase
        .from("id_verifications")
        .select("verification_status")
        .eq("user_id", targetUserId)
        .eq("verification_status", "approved")
        .maybeSingle()

      setVerified(!!verification)

      if (!isOwnProfile && userId) {
        await recordMatrimonyProfileView(user.id, targetUserId)

        const { data: matches } = await supabase
          .from("matrimony_matches")
          .select("id,user1_id,user2_id")
          .eq("is_active", true)

        const matchData = matches?.find(
          (match) =>
            (match.user1_id === user.id && match.user2_id === targetUserId) ||
            (match.user1_id === targetUserId && match.user2_id === user.id),
        )

        setIsMatched(!!matchData)

        if (!matchData) {
          const { data: likeFromThem } = await supabase
            .from("matrimony_likes")
            .select("id")
            .eq("liker_id", targetUserId)
            .eq("liked_id", user.id)
            .in("action", ["like", "connect", "super_like"])
            .maybeSingle()

          const { data: likeFromMe } = await supabase
            .from("matrimony_likes")
            .select("id")
            .eq("liker_id", user.id)
            .eq("liked_id", targetUserId)
            .in("action", ["like", "connect", "super_like"])
            .maybeSingle()

          setCanLikeBack(!!likeFromThem && !likeFromMe)
        } else {
          setCanLikeBack(false)
        }
      } else {
        setIsMatched(false)
        setCanLikeBack(false)
      }
    } catch (error) {
      console.error("Error fetching matrimony profile:", error)
      setViewerProfile(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleLike() {
    if (!userId || isOwnProfile || isLiking) return

    try {
      setIsLiking(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const result = await recordMatrimonyLike(user.id, userId, "like")
      if (result.success) {
        await fetchProfile()
      } else {
        toast({
          title: "Could not send interest",
          description: result.error || "Please try again.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error liking matrimony profile:", error)
      toast({
        title: "Could not send interest",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLiking(false)
    }
  }

  if (editing && isOwnProfile) {
    return <EditProfile mode="matrimony" onBack={() => setEditing(false)} onSave={() => void fetchProfile()} />
  }

  if (loading) {
    return (
      <div className="luxe-light-page flex min-h-[100svh] items-center justify-center sm:min-h-[100dvh]">
        <div className="luxe-card rounded-[2rem] p-7 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#E83262] border-t-transparent" />
          <p className="mt-4 font-bold text-[#26364A]">Opening profile dossier...</p>
        </div>
      </div>
    )
  }

  const canViewAllPhotos = isOwnProfile || isMatched || viewerIsPremium
  const photos = getSafeProfilePhotos(profile?.photos as string[] | undefined, profile?.name, profile?.user_id, canViewAllPhotos ? undefined : 1)
  const personal = profile?.personal || {}
  const career = profile?.career || {}
  const family = profile?.family || {}
  const cultural = profile?.cultural || {}
  const preferences = profile?.partner_preferences || {}
  const preferenceRecord = preferences as Record<string, unknown>
  const preferredMinHeight = preferenceRecord.min_height_cm ?? preferenceRecord.min_height
  const preferredMaxHeight = preferenceRecord.max_height_cm ?? preferenceRecord.max_height
  const preferredMinHeightText = typeof preferredMinHeight === "number" || typeof preferredMinHeight === "string" ? preferredMinHeight : null
  const preferredMaxHeightText = typeof preferredMaxHeight === "number" || typeof preferredMaxHeight === "string" ? preferredMaxHeight : null
  const locationParts = [career.work_location?.city, career.work_location?.state, career.work_location?.country].filter(Boolean)
  const phoneIsRevealed = Boolean(contact?.phoneRevealed)
  const displayPhone = contact?.phoneRevealed || contact?.phoneMasked

  async function handleRevealContact() {
    if (!userId || isOwnProfile) return
    if (phoneIsRevealed) return
    if (!contact?.canReveal) {
      onUpgrade?.()
      toast({
        title: "Unlock contact details",
        description: "Choose a paid plan to reveal masked phone numbers.",
      })
      return
    }

    try {
      const revealed = await revealProfileContact(userId)
      setContact(revealed)
      toast({
        title: "Contact revealed",
        description: revealed.remainingContactViews === null
          ? "This contact is now available through your plan."
          : `${revealed.remainingContactViews} contact reveals remaining in your plan.`,
      })
    } catch (error: any) {
      toast({
        title: "Could not reveal contact",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="luxe-light-page min-h-[100svh] sm:min-h-[100dvh]">
      <div className="sticky top-0 z-20 border-b border-[#482b1a]/10 bg-[#ffffff]/84 shadow-[0_18px_55px_rgba(24,17,13,0.08)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {!isOwnProfile && onBack && (
              <Button variant="ghost" size="sm" className="shrink-0 p-2" onClick={onBack}>
                <ArrowLeft className="w-5 h-5 text-black" />
              </Button>
            )}
            <div className="min-w-0">
              <p className="luxe-kicker text-[0.62rem] text-[#E83262]">{isOwnProfile ? "my dossier" : "profile dossier"}</p>
              <h1 className="truncate font-serif text-2xl font-bold tracking-[-0.05em] text-[#26364A] sm:text-3xl">{isOwnProfile ? "My Profile" : publicName}</h1>
            </div>
          </div>
          {isOwnProfile ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="border-[#E5E5E5]">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="border-[#E5E5E5]">
                <Share className="w-4 h-4" />
              </Button>
            </div>
          ) : isMatched ? (
            <Badge className="bg-[#E83262] text-white">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Matched
            </Badge>
          ) : (
            <Button className="bg-[#E83262] hover:bg-[#C3264E]" onClick={handleLike} disabled={isLiking}>
              <Heart className="w-4 h-4 mr-2" />
              {isLiking ? "Liking..." : canLikeBack ? "Like Back" : "Like"}
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-5 p-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-32">
        {photos.length > 0 && (
          <div className="luxe-card overflow-hidden rounded-[2rem] border-[#E83262]/24 p-3">
            <div className="relative h-[min(64vw,24rem)] min-h-[15rem] overflow-hidden rounded-[1.5rem] bg-[#26364A] sm:h-96">
              <img
                src={photoFailed ? getProfileFallbackImage(profile?.name, profile?.user_id) : photos[currentPhotoIndex]}
                alt={profile?.name || "Profile photo"}
                className="h-full w-full object-cover"
                onError={() => setPhotoFailed(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#26364A]/42 via-transparent to-transparent" />
              {photos.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={cn("rounded-full transition-all", index === currentPhotoIndex ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/60")}
                    />
                  ))}
                </div>
              )}
              {verified && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-white text-black border border-[#E5E5E5]">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-[#E83262]" />
                    Verified
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {photos.length === 0 && (
          <div className="luxe-card rounded-[2rem] border-[#E83262]/24 p-8 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-[#E83262]" />
            <h2 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#26364A]">Photos pending</h2>
            <p className="mt-2 text-sm leading-6 text-[#6F7C8B]">Add clear profile photos to make this dossier feel complete.</p>
          </div>
        )}

        <Card className="luxe-card rounded-[2rem] border-[#E83262]/24">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold text-black">
                {isOwnProfile ? profile?.name : publicName}
                {profile?.age ? `, ${profile.age}` : ""}
              </h2>
              {verified && <CheckCircle2 className="w-5 h-5 text-[#E83262]" />}
            </div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9AA5B2]">ID - {publicProfileId}</p>

            <div className="flex flex-wrap gap-2">
              {profile?.gender && <Badge variant="secondary">{profile.gender}</Badge>}
              {personal.height_cm && <Badge variant="secondary">{personal.height_cm} cm</Badge>}
              {personal.marital_status && <Badge variant="secondary">{personal.marital_status}</Badge>}
            </div>

            {profile?.bio && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2 text-black">
                    <Sparkles className="w-4 h-4 text-[#E83262]" />
                    About Me
                  </h3>
                  <p className="text-sm leading-relaxed text-[#666666]">{profile.bio}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {displayPhone && (
          <Card className="luxe-card rounded-[2rem] border-[#E83262]/24">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E83262]/10 text-[#E83262]">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="luxe-kicker text-[0.62rem] text-[#E83262]">premium contact</p>
                  <h3 className="mt-1 text-lg font-bold text-[#26364A]">{displayPhone}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#6F7C8B]">
                    {phoneIsRevealed
                      ? "This phone number is revealed through your active plan."
                      : contact?.canReveal
                        ? "Included in your plan. Tap reveal to count it as a contact view."
                        : "Masked for free users. Subscribe to reveal contact details safely."}
                  </p>
                </div>
              </div>
              {!phoneIsRevealed && (
                <Button
                  className="luxe-button rounded-full"
                  onClick={handleRevealContact}
                >
                  {contact?.canReveal ? "Reveal Contact" : "Reveal with Premium"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="luxe-card rounded-[2rem] border-[#E83262]/24">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-black">
              <Briefcase className="w-5 h-5 text-[#E83262]" />
              Career & Education
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-[#666666]">
              {career.highest_education && <div><span className="font-medium text-black">Education:</span> {career.highest_education}</div>}
              {career.job_title && <div><span className="font-medium text-black">Profession:</span> {career.job_title}</div>}
              {career.company && <div><span className="font-medium text-black">Company:</span> {career.company}</div>}
              {career.annual_income && <div><span className="font-medium text-black">Income:</span> {career.annual_income}</div>}
              {locationParts.length > 0 && (
                <div className="sm:col-span-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#E83262]" />
                  <span>{locationParts.join(", ")}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="luxe-card rounded-[2rem] border-[#E83262]/24">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-black">
              <Users className="w-5 h-5 text-[#E83262]" />
              Family & Cultural Details
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-[#666666]">
              {family.family_type && <div><span className="font-medium text-black">Family Type:</span> {family.family_type}</div>}
              {family.family_values && <div><span className="font-medium text-black">Values:</span> {family.family_values}</div>}
              {cultural.religion && <div><span className="font-medium text-black">Religion:</span> {cultural.religion}</div>}
              {cultural.mother_tongue && <div><span className="font-medium text-black">Mother Tongue:</span> {cultural.mother_tongue}</div>}
              {cultural.community && <div><span className="font-medium text-black">Community:</span> {cultural.community}</div>}
              {cultural.place_of_birth && (
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-[#E83262]" />
                  <span>{cultural.place_of_birth}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!isOwnProfile && (
          <PreferenceCompatibilityCard
            targetProfile={profile}
            viewerProfile={viewerProfile}
            className="rounded-[2rem] border-[#E83262]/24"
          />
        )}

        <Card className="luxe-card rounded-[2rem] border-[#E83262]/24">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg text-black">Partner Preferences</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-[#666666]">
              {(preferences.min_age || preferences.max_age) && (
                <div>
                  <span className="font-medium text-black">Age Range:</span> {preferences.min_age || "?"} - {preferences.max_age || "?"}
                </div>
              )}
              {(preferredMinHeightText || preferredMaxHeightText) && (
                <div>
                  <span className="font-medium text-black">Height Range:</span>{" "}
                  {preferredMinHeightText || "?"} - {preferredMaxHeightText || "?"}
                </div>
              )}
              {Array.isArray(preferences.locations) && preferences.locations.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="font-medium text-black">Preferred Locations:</span> {preferences.locations.join(", ")}
                </div>
              )}
              {Array.isArray(preferences.communities) && preferences.communities.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="font-medium text-black">Preferred Communities:</span> {preferences.communities.join(", ")}
                </div>
              )}
              {Array.isArray(preferences.marital_status_prefs) && preferences.marital_status_prefs.length > 0 && (
                <div>
                  <span className="font-medium text-black">Marital Status:</span> {preferences.marital_status_prefs.join(", ")}
                </div>
              )}
              {Array.isArray(preferences.income_prefs) && preferences.income_prefs.length > 0 && (
                <div>
                  <span className="font-medium text-black">Income Preference:</span> {preferences.income_prefs.join(", ")}
                </div>
              )}
              {Array.isArray(preferences.manglik_prefs) && preferences.manglik_prefs.length > 0 && (
                <div>
                  <span className="font-medium text-black">Horoscope:</span> {preferences.manglik_prefs.join(", ")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
