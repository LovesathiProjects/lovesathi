"use client"

import { CheckCircle2, MinusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPublicProfileName } from "@/lib/displayName"
import { getProfileFallbackImage, getSafeProfilePhotos } from "@/lib/profileImages"
import {
  buildPreferenceCompatibility,
  type ProfileForCompatibility,
} from "@/lib/preferenceCompatibility"

interface PreferenceCompatibilityCardProps {
  targetProfile: ProfileForCompatibility
  viewerProfile: ProfileForCompatibility
  className?: string
  compact?: boolean
}

function getProfilePhoto(profile: ProfileForCompatibility) {
  const profileId = String(profile?.user_id || profile?.id || profile?.name || "profile")
  const profileName = String(profile?.name || "Profile")
  const photos = getSafeProfilePhotos(profile?.photos as string[] | undefined, profileName, profileId, 1)
  return photos[0] || getProfileFallbackImage(profileName, profileId)
}

function getFirstName(profile: ProfileForCompatibility) {
  const formatted = formatPublicProfileName(String(profile?.name || "You"))
  return formatted.split(" ")[0] || formatted
}

export function PreferenceCompatibilityCard({
  targetProfile,
  viewerProfile,
  className,
  compact = false,
}: PreferenceCompatibilityCardProps) {
  const summary = buildPreferenceCompatibility(targetProfile, viewerProfile)

  if (!targetProfile || !viewerProfile || summary.rows.length === 0) {
    return null
  }

  const targetPhoto = getProfilePhoto(targetProfile)
  const viewerPhoto = getProfilePhoto(viewerProfile)
  const matchCopy = `You match ${summary.matched}/${summary.total} of ${summary.possessiveLabel.toLowerCase()} preference`

  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-[1.35rem] border border-[#E7EAF0] bg-white shadow-[0_14px_36px_rgba(31,44,60,0.05)]",
        compact ? "p-3.5 sm:p-4" : "p-4 sm:p-5",
        compact ? "space-y-4" : "space-y-5",
        className,
      )}
    >
      <div className="grid min-w-0 grid-cols-[minmax(4rem,1fr)_minmax(8.5rem,auto)_minmax(4rem,1fr)] items-center gap-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black leading-5 text-[#26364A] sm:text-sm">{summary.possessiveLabel} Preference</p>
          <div className="mt-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#F1F3F8] ring-1 ring-[#E7EAF0] sm:h-14 sm:w-14">
            <img src={targetPhoto} alt="" className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-center gap-2">
          <div className="h-px w-8 bg-[#E2E6EC] sm:w-10" />
          <div className="max-w-[11rem] rounded-2xl bg-[#F7F8FB] px-3 py-2.5 text-center shadow-sm sm:max-w-[13rem] sm:px-4 sm:py-3">
            <p className="text-xs font-black leading-5 text-[#26364A] sm:text-sm">{matchCopy}</p>
          </div>
          <div className="h-px w-8 bg-[#E2E6EC] sm:w-10" />
        </div>

        <div className="min-w-0 text-right">
          <p className="text-xs font-black leading-5 text-[#26364A] sm:text-sm">You Match</p>
          <div className="ml-auto mt-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#F1F3F8] ring-1 ring-[#E7EAF0] sm:h-14 sm:w-14">
            <img src={viewerPhoto} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-black text-[#26364A] sm:text-lg">Basic Details</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#6F7C8B]">
          How {getFirstName(viewerProfile)} fits what {getFirstName(targetProfile)} is looking for.
        </p>
      </div>

      <div className="divide-y divide-[#EEF1F5]">
        {summary.rows.map((row) => (
          <div key={row.id} className={cn("grid grid-cols-[1fr_auto] gap-3", compact ? "py-3" : "py-4")}>
            <div className="min-w-0">
              <p className="text-sm font-black text-[#26364A]">{row.label}</p>
              <p className="mt-1 break-words text-sm font-semibold leading-6 text-[#6F7C8B]">{row.preference}</p>
            </div>
            <div className="pt-1">
              {row.matched ? (
                <CheckCircle2 className={cn("text-[#2FA968]", compact ? "h-5 w-5" : "h-6 w-6")} />
              ) : (
                <MinusCircle className={cn("text-[#B9C1CD]", compact ? "h-5 w-5" : "h-6 w-6")} />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
