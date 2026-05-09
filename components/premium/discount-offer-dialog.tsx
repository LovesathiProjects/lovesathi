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
  return `lovesathi.70_discount_offer.last_shown:${userId}`
}

export function DiscountOfferDialog({ onSubscribe }: { onSubscribe: () => void }) {
  const [open, setOpen] = useState(false)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [isFirstOffer, setIsFirstOffer] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function maybeShowOffer() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const entitlement = await getUserEntitlementStatus(user.id)
      if (entitlement.isPremium || cancelled) return

      const { data: profile } = await supabase
        .from("matrimony_profile_full")
        .select("profile_completed, created_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!profile?.profile_completed || cancelled) return

      const key = offerStorageKey(user.id)
      const lastShown = Number(window.localStorage.getItem(key) || "0")
      const now = Date.now()
      const profileCreatedAt = new Date(profile.updated_at || profile.created_at).getTime()
      const withinFirstWindow = now - profileCreatedAt <= OFFER_WINDOW_MS
      const shouldShow = !lastShown || now - lastShown >= OFFER_REPEAT_MS

      if (!shouldShow) return

      setUserId(user.id)
      setIsFirstOffer(withinFirstWindow || !lastShown)
      setExpiresAt(new Date((withinFirstWindow ? profileCreatedAt : now) + OFFER_WINDOW_MS))
      setOpen(true)
      window.localStorage.setItem(key, String(now))
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
      <DialogContent className="overflow-hidden rounded-[2rem] border-[#d8c79f]/40 bg-[#fffdf8] p-0 shadow-[0_30px_100px_rgba(24,17,13,0.28)] sm:max-w-xl">
        <div className="relative p-6 sm:p-8">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#8f001c]/14 blur-2xl" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[#d8c79f]/30 blur-2xl" />
          <div className="relative space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#8f001c] text-white shadow-[0_18px_45px_rgba(143,0,28,0.25)]">
                <Crown className="h-7 w-7" />
              </div>
              <Badge className="border border-[#8f001c]/20 bg-[#8f001c]/10 px-3 py-1 text-[#8f001c]">
                70% off forever
              </Badge>
            </div>

            <DialogHeader className="text-left">
              <p className="luxe-kicker text-[0.68rem] text-[#8f001c]">profile complete reward</p>
              <DialogTitle className="font-serif text-4xl font-bold leading-[0.95] tracking-[-0.06em] text-[#18110d] sm:text-5xl">
                {isFirstOffer ? "You are lucky. Your 70% discount is live." : "Your 70% Lovesathi offer is back."}
              </DialogTitle>
              <DialogDescription className="text-base leading-7 text-[#685f58]">
                You have {remainingLabel} to avail this private launch discount. If you skip it, we will bring the offer back every 2 weeks until you subscribe.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-3">
              {["Basic", "Essential", "Signature"].map((plan) => (
                <div key={plan} className="rounded-2xl border border-[#d8c79f]/30 bg-white/70 p-3">
                  <Sparkles className="mb-2 h-4 w-4 text-[#8f001c]" />
                  <p className="text-sm font-black text-[#18110d]">{plan}</p>
                  <p className="text-xs leading-5 text-[#685f58]">70% forever pricing</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-[#482b1a]/10 bg-white/68 p-3 text-sm font-bold text-[#18110d]">
              <Clock className="h-4 w-4 text-[#8f001c]" />
              This offer refreshes every 2 weeks until purchase.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="luxe-button h-12 flex-1 rounded-full"
                onClick={() => {
                  setOpen(false)
                  onSubscribe()
                }}
              >
                Claim 70% Discount
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
