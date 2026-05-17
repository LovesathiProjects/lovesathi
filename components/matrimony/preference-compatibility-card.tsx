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
        "rounded-[1.35rem] border border-[#E7EAF0] bg-white p-4 shadow-[0_14px_36px_rgba(31,44,60,0.05)]",
        compact ? "space-y-4" : "space-y-5",
        className,
      )}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-[#26364A]">{summary.possessiveLabel} Preference</p>
          <div className="mt-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#F1F3F8] ring-1 ring-[#E7EAF0]">
            <img src={targetPhoto} alt="" className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="flex min-w-[8rem] flex-col items-center gap-2">
          <div className="h-px w-10 bg-[#E2E6EC]" />
          <div className="rounded-2xl bg-[#F7F8FB] px-4 py-3 text-center shadow-sm">
            <p className="text-sm font-black leading-5 text-[#26364A]">{matchCopy}</p>
          </div>
          <div className="h-px w-10 bg-[#E2E6EC]" />
        </div>

        <div className="min-w-0 text-right">
          <p className="text-sm font-black text-[#26364A]">You Match</p>
          <div className="ml-auto mt-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#F1F3F8] ring-1 ring-[#E7EAF0]">
            <img src={viewerPhoto} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-black text-[#26364A]">Basic Details</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#6F7C8B]">
          How {getFirstName(viewerProfile)} fits what {getFirstName(targetProfile)} is looking for.
        </p>
      </div>

      <div className="divide-y divide-[#EEF1F5]">
        {summary.rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr_auto] gap-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-black text-[#26364A]">{row.label}</p>
              <p className="mt-1 break-words text-sm font-semibold leading-6 text-[#6F7C8B]">{row.preference}</p>
            </div>
            <div className="pt-1">
              {row.matched ? (
                <CheckCircle2 className="h-6 w-6 text-[#2FA968]" />
              ) : (
                <MinusCircle className="h-6 w-6 text-[#B9C1CD]" />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
