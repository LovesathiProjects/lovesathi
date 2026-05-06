"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export const FREE_VERIFIED_FILTER_MATCH_LIMIT = 3

export function useVerifiedFilterAllowance() {
  const [loading, setLoading] = useState(true)
  const [matchCount, setMatchCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadAllowance() {
      try {
        setLoading(true)
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          if (!cancelled) setMatchCount(0)
          return
        }

        const { count, error } = await supabase
          .from("matrimony_matches")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

        if (error) throw error
        if (!cancelled) setMatchCount(count || 0)
      } catch (error) {
        console.error("[useVerifiedFilterAllowance] Failed to load match count:", error)
        if (!cancelled) setMatchCount(0)
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
    remainingFreeUses,
    canUseVerifiedFilter: matchCount < FREE_VERIFIED_FILTER_MATCH_LIMIT,
  }
}
