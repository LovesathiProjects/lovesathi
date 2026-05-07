"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MapPin, Star, Trash2 } from "lucide-react"
import type { MatrimonyProfile } from "@/lib/mockMatrimonyProfiles"
import { cn } from "@/lib/utils"
import { useMatrimonyShortlist } from "@/hooks/useMatrimonyShortlist"
import type { ShortlistActionResult } from "@/lib/matrimonyShortlistService"

interface MatrimonyShortlistViewProps {
  profiles: MatrimonyProfile[]
  loading?: boolean
  onRemove: (profileId: string) => Promise<ShortlistActionResult>
  onOpenProfile?: (profile: MatrimonyProfile) => void
}

export function MatrimonyShortlistView({
  profiles,
  loading,
  onRemove,
  onOpenProfile,
}: MatrimonyShortlistViewProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleRemove = async (profileId: string) => {
    setRemovingId(profileId)
    await onRemove(profileId)
    setRemovingId(null)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#8f001c]" />
        <p className="text-sm font-bold text-[#18110d]">Preparing your shortlist...</p>
      </div>
    )
  }

  if (!profiles || profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#8f001c]/10">
          <Star className="h-8 w-8 text-[#8f001c]" />
        </div>
        <div className="space-y-2">
          <h3 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#18110d]">No shortlisted profiles yet</h3>
          <p className="max-w-sm text-sm leading-6 text-[#685f58]">
            Tap the star icon on profiles that deserve a second look and build a calmer family-ready shortlist.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className="luxe-card cursor-pointer rounded-[1.5rem] border-[#d8c79f]/24 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(24,17,13,0.14)]"
          onClick={() => onOpenProfile?.(profile)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              onOpenProfile?.(profile)
            }
          }}
          aria-label={`Open profile for ${profile.name}`}
        >
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-12 h-12 border-2 border-[#E5E5E5]">
                <AvatarImage src={profile.photos?.[0] || "/placeholder.svg"} alt={profile.name} />
                <AvatarFallback className="bg-gray-100 text-black">{profile.name[0]}</AvatarFallback>
              </Avatar>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-black truncate">
                {profile.name}
                {profile.age && <span className="text-[#444444] ml-1">, {profile.age}</span>}
              </h3>
              {profile.location && (
                <p className="text-sm text-[#444444] flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile.location}
                </p>
              )}
              {profile.education && (
                <p className="text-sm text-[#444444] mt-1">{profile.education}</p>
              )}
            </div>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "flex-shrink-0 rounded-full hover:bg-red-50 hover:text-[#97011A] transition-all",
                removingId === profile.id && "opacity-60 pointer-events-none",
              )}
              onClick={(event) => {
                event.stopPropagation()
                handleRemove(profile.id)
              }}
              aria-label="Remove from shortlist"
            >
              {removingId === profile.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#97011A]" />
              ) : (
                <Trash2 className="w-4 h-4 text-[#444444]" />
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function MatrimonyShortlistScreen({
  onOpenProfile,
  onActionComplete,
}: {
  onOpenProfile?: (profile: MatrimonyProfile) => void
  onActionComplete?: (result: ShortlistActionResult, profileId: string) => void
}) {
  const { shortlistedProfiles, loading, removeProfile } = useMatrimonyShortlist()

  const handleRemove = async (profileId: string) => {
    const result = await removeProfile(profileId)
    onActionComplete?.(result, profileId)
    return result
  }

  return (
    <MatrimonyShortlistView
      profiles={shortlistedProfiles}
      loading={loading}
      onRemove={handleRemove}
      onOpenProfile={onOpenProfile}
    />
  )
}
