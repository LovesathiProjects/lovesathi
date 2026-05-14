"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type SearchableOption = {
  value: string
  label: string
  description?: string
  keywords?: string[]
  disabled?: boolean
}

type SharedProps = {
  options: SearchableOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  triggerClassName?: string
  contentClassName?: string
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select option",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found.",
  disabled = false,
  triggerClassName,
  contentClassName,
}: SharedProps & {
  value?: string
  onValueChange: (value: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-12 w-full min-w-0 justify-between rounded-xl border-black/20 bg-white px-4 text-left text-base font-normal text-[#111] hover:border-[#E83262]/45 hover:bg-white focus-visible:ring-[#E83262]/20 disabled:opacity-60",
            !selectedOption && "text-[#8f8982]",
            triggerClassName,
          )}
        >
          <span className="min-w-0 truncate">{selectedOption?.label || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("z-50 w-[--radix-popover-trigger-width] max-w-[calc(100vw-2rem)] border-[#E83262]/35 bg-white p-0 text-black shadow-[0_22px_70px_rgba(24,17,13,0.14)]", contentClassName)}
      >
        <Command filter={(optionValue, search, keywords) => {
          const haystack = [optionValue, ...(keywords || [])].join(" ").toLowerCase()
          return haystack.includes(search.toLowerCase()) ? 1 : 0
        }}>
          <CommandInput placeholder={searchPlaceholder} className="h-11 text-base" />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, ...(option.keywords || [])]}
                  disabled={option.disabled}
                  onSelect={(nextValue) => {
                    onValueChange(nextValue)
                    setOpen(false)
                  }}
                  className="cursor-pointer rounded-xl px-3 py-3 text-[#26364A] data-[selected=true]:bg-[#f5f2ec]"
                >
                  <Check className={cn("mr-2 h-4 w-4 text-[#E83262]", value === option.value ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{option.label}</p>
                    {option.description && <p className="truncate text-xs text-[#6F7C8B]">{option.description}</p>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function SearchableMultiSelect({
  values,
  onValuesChange,
  options,
  placeholder = "Select options",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found.",
  disabled = false,
  triggerClassName,
  contentClassName,
}: SharedProps & {
  values: string[]
  onValuesChange: (values: string[]) => void
}) {
  const [open, setOpen] = React.useState(false)
  const selectedOptions = options.filter((option) => values.includes(option.value))

  function toggleValue(nextValue: string) {
    if (nextValue === "Any") {
      onValuesChange(values.includes("Any") ? [] : ["Any"])
      return
    }

    const withoutAny = values.filter((item) => item !== "Any")
    onValuesChange(
      withoutAny.includes(nextValue)
        ? withoutAny.filter((item) => item !== nextValue)
        : [...withoutAny, nextValue],
    )
  }

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-12 w-full min-w-0 justify-between rounded-xl border-black/20 bg-white px-4 text-left text-base font-normal text-[#111] hover:border-[#E83262]/45 hover:bg-white focus-visible:ring-[#E83262]/20 disabled:opacity-60",
              values.length === 0 && "text-[#8f8982]",
              triggerClassName,
            )}
          >
            <span className="min-w-0 truncate">
              {values.length === 0 ? placeholder : `${values.length} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn("z-50 w-[--radix-popover-trigger-width] max-w-[calc(100vw-2rem)] border-[#E83262]/35 bg-white p-0 text-black shadow-[0_22px_70px_rgba(24,17,13,0.14)]", contentClassName)}
        >
          <Command filter={(optionValue, search, keywords) => {
            const haystack = [optionValue, ...(keywords || [])].join(" ").toLowerCase()
            return haystack.includes(search.toLowerCase()) ? 1 : 0
          }}>
            <CommandInput placeholder={searchPlaceholder} className="h-11 text-base" />
            <CommandList className="max-h-72">
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const selected = values.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      keywords={[option.label, ...(option.keywords || [])]}
                      disabled={option.disabled}
                      onSelect={toggleValue}
                      className="cursor-pointer rounded-xl px-3 py-3 text-[#26364A] data-[selected=true]:bg-[#f5f2ec]"
                    >
                      <Check className={cn("mr-2 h-4 w-4 text-[#E83262]", selected ? "opacity-100" : "opacity-0")} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{option.label}</p>
                        {option.description && <p className="truncate text-xs text-[#6F7C8B]">{option.description}</p>}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <Badge
              key={option.value}
              variant="outline"
              className="gap-2 rounded-full border-[#E83262]/40 bg-[#ffffff] px-3 py-1 text-[#26364A]"
            >
              {option.label}
              <button
                type="button"
                aria-label={`Remove ${option.label}`}
                onClick={() => onValuesChange(values.filter((item) => item !== option.value))}
                className="rounded-full text-[#E83262] hover:text-[#5f0012]"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
