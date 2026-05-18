"use client"

import { useEffect, useMemo, useState } from "react"
import { Clock, Crown, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabaseClient"
import { getUserEntitlementStatus } from "@/lib/planLimits"

const OFFER_REPEAT_MS = 14 * 24 * 60 * 60 * 1000
const OFFER_WINDOW_MS = 24 * 60 * 60 * 1000

function offerStorageKey(userId: string) {
  return `lovesathi.90_basic_discount_offer.last_shown:${userId}`
}

function formatRemainingTime(expiresAt: Date | null) {
  if (!expiresAt) return "24:00:00"
  const remainingMs = Math.max(expiresAt.getTime() - Date.now(), 0)
  const totalSeconds = Math.floor(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":")
}

async function getActiveDiscountOfferWindow() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const entitlement = await getUserEntitlementStatus(user.id)
  if (entitlement.isPremium) return null

  const { data: profile } = await supabase
    .from("matrimony_profile_full")
    .select("profile_completed, created_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!profile?.profile_completed) return null

  const now = Date.now()
  const key = offerStorageKey(user.id)
  const lastShown = Number(window.localStorage.getItem(key) || "0")
  const profileCreatedAt = new Date(profile.updated_at || profile.created_at).getTime()
  const firstWindowExpiresAt = profileCreatedAt + OFFER_WINDOW_MS

  if (!lastShown && now <= firstWindowExpiresAt) {
    return { userId: user.id, expiresAt: new Date(firstWindowExpiresAt), isFirstOffer: true }
  }

  if (lastShown && now - lastShown <= OFFER_WINDOW_MS) {
    return { userId: user.id, expiresAt: new Date(lastShown + OFFER_WINDOW_MS), isFirstOffer: false }
  }

  if (!lastShown || now - lastShown >= OFFER_REPEAT_MS) {
    return { userId: user.id, expiresAt: new Date(now + OFFER_WINDOW_MS), isFirstOffer: !lastShown }
  }

  return null
}

export function DiscountOfferDialog({ onSubscribe }: { onSubscribe: () => void }) {
  const [open, setOpen] = useState(false)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [isFirstOffer, setIsFirstOffer] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function maybeShowOffer() {
      const offer = await getActiveDiscountOfferWindow()
      if (!offer || cancelled) return

      const key = offerStorageKey(offer.userId)
      const lastShown = Number(window.localStorage.getItem(key) || "0")
      const shouldShow = !lastShown || Date.now() - lastShown >= OFFER_REPEAT_MS
      if (!shouldShow) return

      setUserId(offer.userId)
      setIsFirstOffer(offer.isFirstOffer)
      setExpiresAt(offer.expiresAt)
      setOpen(true)
      window.localStorage.setItem(key, String(Date.now()))
    }

    void maybeShowOffer()

    return () => {
      cancelled = true
    }
  }, [])

  const remainingLabel = useMemo(() => {
    if (!expiresAt) return "24 hours"
    const remainingMs = Math.max(expiresAt.getTime() - Date.now(), 0)
    const hours = Math.max(Math.ceil(remainingMs / (60 * 60 * 1000)), 1)
    return `${hours} hour${hours === 1 ? "" : "s"}`
  }, [expiresAt])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen && userId) {
      window.localStorage.setItem(offerStorageKey(userId), String(Date.now()))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden rounded-[2rem] border-[#E83262]/40 bg-[#FFFFFF] p-0 shadow-[0_30px_100px_rgba(24,17,13,0.28)] sm:max-w-xl">
        <div className="relative p-6 sm:p-8">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#E83262]/14 blur-2xl" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[#E83262]/30 blur-2xl" />
          <div className="relative space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E83262] text-white shadow-[0_18px_45px_rgba(194,165,116,0.25)]">
                <Crown className="h-7 w-7" />
              </div>
              <Badge className="border border-[#E83262]/20 bg-[#E83262]/10 px-3 py-1 text-[#E83262]">
                90% off Basic
              </Badge>
            </div>

            <DialogHeader className="text-left">
              <p className="luxe-kicker text-[0.68rem] text-[#E83262]">profile complete reward</p>
              <DialogTitle className="font-serif text-4xl font-bold leading-[0.95] tracking-[-0.06em] text-[#26364A] sm:text-5xl">
                {isFirstOffer ? "Your Basic 90% launch offer is live." : "Your Basic 90% Lovesathi offer is back."}
              </DialogTitle>
              <DialogDescription className="text-base leading-7 text-[#6F7C8B]">
                You have {remainingLabel} to avail this private Basic launch discount.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#E83262]/30 bg-white/70 p-3">
                <Sparkles className="mb-2 h-4 w-4 text-[#E83262]" />
                <p className="text-sm font-black text-[#26364A]">Basic membership</p>
                <p className="text-xs leading-5 text-[#6F7C8B]">90% private launch pricing</p>
              </div>
              <div className="rounded-2xl border border-[#E83262]/30 bg-white/70 p-3">
                <Crown className="mb-2 h-4 w-4 text-[#E83262]" />
                <p className="text-sm font-black text-[#26364A]">Basic only</p>
                <p className="text-xs leading-5 text-[#6F7C8B]">Essential, Signature, and Heritage stay at standard pricing.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="luxe-button h-12 flex-1 rounded-full"
                onClick={() => {
                  setOpen(false)
                  onSubscribe()
                }}
              >
                Claim Basic 90% Offer
              </Button>
              <Button variant="outline" className="h-12 rounded-full border-[#482b1a]/15 bg-white" onClick={() => handleOpenChange(false)}>
                Maybe later
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DiscountOfferTimer({ onSubscribe }: { onSubscribe: () => void }) {
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [remainingLabel, setRemainingLabel] = useState("24:00:00")

  useEffect(() => {
    let cancelled = false

    async function loadOffer() {
      const offer = await getActiveDiscountOfferWindow()
      if (!offer || cancelled) return
      setExpiresAt(offer.expiresAt)
      setRemainingLabel(formatRemainingTime(offer.expiresAt))
    }

    void loadOffer()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!expiresAt) return

    const interval = window.setInterval(() => {
      setRemainingLabel(formatRemainingTime(expiresAt))
      if (expiresAt.getTime() <= Date.now()) {
        setExpiresAt(null)
      }
    }, 1000)

    return () => window.clearInterval(interval)
  }, [expiresAt])

  if (!expiresAt) return null

  return (
    <button
      type="button"
      onClick={onSubscribe}
      className="fixed left-1/2 top-[calc(5.4rem+env(safe-area-inset-top))] z-40 -translate-x-1/2 rounded-full border border-[#E83262]/45 bg-[#FFFFFF]/88 px-4 py-2 text-left shadow-[0_18px_55px_rgba(58,43,36,0.16)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-[#E83262] sm:top-[calc(4.9rem+env(safe-area-inset-top))]"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E83262] text-white">
          <Clock className="h-4 w-4" />
        </span>
        <span>
          <span className="block luxe-kicker text-[0.55rem] text-[#E83262]">Basic 90% offer expires in</span>
          <span className="block font-mono text-sm font-black tracking-[0.12em] text-[#26364A]">{remainingLabel}</span>
        </span>
      </span>
    </button>
  )
}
