"use client"

import type React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function formatTimeDraft(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function normalizeTime(value: string) {
  const digits = value.replace(/\D/g, "").padEnd(4, "0").slice(0, 4)
  const hours = Math.min(Number(digits.slice(0, 2) || "0"), 23)
  const minutes = Math.min(Number(digits.slice(2, 4) || "0"), 59)
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

type TimeInputProps = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value?: string
  onChange: (value: string) => void
}

export function TimeInput({ value = "", onChange, className, onBlur, ...props }: TimeInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      placeholder="HH:MM"
      value={value}
      maxLength={5}
      onChange={(event) => onChange(formatTimeDraft(event.target.value))}
      onBlur={(event) => {
        onChange(normalizeTime(value || "00:00"))
        onBlur?.(event)
      }}
      className={cn(
        "block h-12 w-full max-w-full min-w-0 appearance-none rounded-xl border-black/20 text-base text-[#111] [inline-size:100%] [min-inline-size:0] focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20",
        className,
      )}
    />
  )
}
