"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { isPremiumUser } from "@/lib/planLimits"

export const FREE_VERIFIED_FILTER_MATCH_LIMIT = 3

export function useVerifiedFilterAllowance() {
  const [loading, setLoading] = useState(true)
  const [matchCount, setMatchCount] = useState(0)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadAllowance() {
      try {
        setLoading(true)
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          if (!cancelled) {
            setMatchCount(0)
            setIsPremium(false)
          }
          return
        }

        const [{ count, error }, premium] = await Promise.all([
          supabase
            .from("matrimony_matches")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
          isPremiumUser(user.id),
        ])

        if (error) throw error
        if (!cancelled) {
          setMatchCount(count || 0)
          setIsPremium(premium)
        }
      } catch (error) {
        console.error("[useVerifiedFilterAllowance] Failed to load match count:", error)
        if (!cancelled) {
          setMatchCount(0)
          setIsPremium(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadAllowance()

    return () => {
      cancelled = true
    }
  }, [])

  const remainingFreeUses = Math.max(0, FREE_VERIFIED_FILTER_MATCH_LIMIT - matchCount)

  return {
    loading,
    matchCount,
    isPremium,
    remainingFreeUses,
    canUseVerifiedFilter: isPremium || matchCount < FREE_VERIFIED_FILTER_MATCH_LIMIT,
  }
}
