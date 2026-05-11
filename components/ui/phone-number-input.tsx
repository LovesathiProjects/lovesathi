"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  PHONE_COUNTRY_CODES,
  composeInternationalPhoneNumber,
  getDialCodeDigits,
  getPhoneCountryCodeByIso,
  splitInternationalPhoneNumber,
} from "@/lib/phoneCountryCodes"
import { cn } from "@/lib/utils"

interface PhoneNumberInputProps {
  id: string
  label?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  className?: string
  inputClassName?: string
  helperText?: ReactNode | false
}

export function PhoneNumberInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  required,
  disabled,
  readOnly,
  className,
  inputClassName,
  helperText,
}: PhoneNumberInputProps) {
  const initialParts = useMemo(() => splitInternationalPhoneNumber(value), [value])
  const [selectedIso, setSelectedIso] = useState(initialParts.country.iso2)
  const [nationalNumber, setNationalNumber] = useState(initialParts.nationalNumber)

  useEffect(() => {
    const parts = splitInternationalPhoneNumber(value)
    setSelectedIso(parts.country.iso2)
    setNationalNumber(parts.nationalNumber)
  }, [value])

  const selectedCountry = getPhoneCountryCodeByIso(selectedIso)

  const emitPhone = (nextIso: string, nextNationalNumber: string) => {
    const country = getPhoneCountryCodeByIso(nextIso)
    onChange(composeInternationalPhoneNumber(country, nextNationalNumber))
  }

  const handleCountryChange = (nextIso: string) => {
    setSelectedIso(nextIso)
    emitPhone(nextIso, nationalNumber)
  }

  const handleNumberChange = (rawValue: string) => {
    if (rawValue.trim().startsWith("+")) {
      const pasted = splitInternationalPhoneNumber(rawValue)
      setSelectedIso(pasted.country.iso2)
      setNationalNumber(pasted.nationalNumber)
      onChange(composeInternationalPhoneNumber(pasted.country, pasted.nationalNumber))
      return
    }

    const maxNationalDigits = Math.max(1, 15 - getDialCodeDigits(selectedCountry.dialCode).length)
    const nextNationalNumber = rawValue.replace(/\D/g, "").slice(0, maxNationalDigits)
    setNationalNumber(nextNationalNumber)
    emitPhone(selectedIso, nextNationalNumber)
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div
        className={cn(
          "flex h-12 overflow-hidden rounded-2xl border border-[#482b1a]/20 bg-[#ffffff] shadow-sm transition focus-within:border-[#C2A574]/60 focus-within:ring-2 focus-within:ring-[#C2A574]/18",
          (disabled || readOnly) && "bg-[#F7F3EE] text-[#8B7B70]",
        )}
      >
        <select
          id={`${id}-country-code`}
          aria-label="Country code"
          value={selectedIso}
          onChange={(event) => handleCountryChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled || readOnly}
          className="h-full w-[8.2rem] shrink-0 border-0 border-r border-[#482b1a]/12 bg-[#F7F3EE] px-3 text-sm font-bold text-[#3A2B24] outline-none disabled:cursor-not-allowed disabled:text-[#8B7B70]"
        >
          {PHONE_COUNTRY_CODES.map((option) => (
            <option key={option.iso2} value={option.iso2}>
              {option.iso2} {option.dialCode}
            </option>
          ))}
        </select>
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          value={nationalNumber}
          onChange={(event) => handleNumberChange(event.target.value)}
          onBlur={onBlur}
          placeholder={selectedCountry.example}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete="tel-national"
          className={cn(
            "h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-4 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 read-only:cursor-not-allowed",
            inputClassName,
          )}
        />
      </div>
      {helperText !== false && (
        <p className="text-xs leading-5 text-[#8B7B70]">
          {helperText ?? (
            <>
              We will send OTP to {selectedCountry.dialCode}
              {nationalNumber ? ` ${nationalNumber}` : " your number"}.
            </>
          )}
        </p>
      )}
    </div>
  )
}
