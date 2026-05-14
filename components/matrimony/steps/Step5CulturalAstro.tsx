"use client"

import React, { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { TimeInput } from "@/components/ui/time-input"
import { useMatrimonySetupStore } from "@/components/matrimony/store"
import { culturalAstroSchema } from "@/lib/schemas/matrimony"
import { saveStep5 } from "@/lib/matrimonyService"
import { supabase } from "@/lib/supabaseClient"
import { formatDateForDisplay } from "@/lib/age"
import { LocationCascadeSelect } from "@/components/location/location-cascade-select"
import { formatLocationValue, parseLocationValue } from "@/lib/location"
import {
  getCommunityOptionsForReligion,
  getSubCommunityOptions,
  MOTHER_TONGUE_OPTIONS,
  normalizeReligionOption,
  RELIGION_OPTIONS,
  STAR_RAASHI_OPTIONS,
  withoutOther,
} from "@/lib/matrimonyOptions"
import { toast } from "sonner"

type FormValues = z.infer<typeof culturalAstroSchema>

function isPreset(value: string | undefined, options: readonly string[]) {
  return Boolean(value && withoutOther(options).includes(value))
}

function OtherSelect({
  label,
  value,
  placeholder,
  options,
  otherPlaceholder,
  disabled = false,
  onChange,
}: {
  label: string
  value?: string
  placeholder: string
  options: readonly string[]
  otherPlaceholder: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const [customValue, setCustomValue] = React.useState(isPreset(value, options) ? "" : value || "")
  const [customMode, setCustomMode] = React.useState(Boolean(value && !isPreset(value, options)))
  const optionsKey = React.useMemo(() => options.join("\u0000"), [options])
  const previousOptionsKey = React.useRef(optionsKey)
  const selectValue = customMode ? "Other" : value && isPreset(value, options) ? value : undefined

  useEffect(() => {
    const optionsChanged = previousOptionsKey.current !== optionsKey
    previousOptionsKey.current = optionsKey

    if (optionsChanged && !value) {
      setCustomMode(false)
      setCustomValue("")
      return
    }

    if (value && isPreset(value, options)) {
      setCustomMode(false)
      setCustomValue("")
    } else if (value) {
      setCustomMode(true)
      setCustomValue(value)
    }
  }, [options, optionsKey, value])

  return (
    <FormItem>
      <FormLabel className="text-black">{label}</FormLabel>
      <FormControl>
        <SearchableSelect
          onValueChange={(nextValue) => {
            if (nextValue === "Other") {
              setCustomMode(true)
              setCustomValue("")
              onChange("")
              return
            }
            setCustomMode(false)
            setCustomValue("")
            onChange(nextValue)
          }}
          value={selectValue}
          disabled={disabled}
          options={options.map((option) => ({ value: option, label: option }))}
          placeholder={placeholder}
          searchPlaceholder={`Search ${label.toLowerCase()}...`}
          emptyMessage={`No ${label.toLowerCase()} found.`}
        />
      </FormControl>
      {selectValue === "Other" && (
        <Input
          placeholder={otherPlaceholder}
          value={customValue}
          onChange={(event) => {
            setCustomValue(event.target.value)
            onChange(event.target.value)
          }}
          disabled={disabled}
          className="mt-2 h-12 rounded-xl border-black/20 bg-white text-base text-[#111] focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20"
        />
      )}
      <FormMessage />
    </FormItem>
  )
}

export function Step5CulturalAstro({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { cultural, setPartial } = useMatrimonySetupStore()
  const [isLoading, setIsLoading] = React.useState(false)
  const [verifiedDob, setVerifiedDob] = React.useState<string | null>(cultural.dob || null)

  const form = useForm<FormValues>({
    resolver: zodResolver(culturalAstroSchema),
    defaultValues: {
      religion: normalizeReligionOption(cultural.religion) || "",
      motherTongue: cultural.motherTongue || "",
      community: cultural.community || "",
      subCaste: cultural.subCaste || "",
      dob: cultural.dob || "",
      tob: cultural.tob || "00:00",
      pob: cultural.pob || "",
      star: cultural.star || "",
      gotra: cultural.gotra || "",
    },
    mode: "onChange",
  })

  const selectedReligion = form.watch("religion")
  const selectedCommunity = form.watch("community")
  const communityOptions = React.useMemo(() => getCommunityOptionsForReligion(selectedReligion), [selectedReligion])
  const subCommunityOptions = React.useMemo(
    () => getSubCommunityOptions(selectedReligion, selectedCommunity),
    [selectedReligion, selectedCommunity],
  )

  useEffect(() => {
    let mounted = true

    async function hydrateVerifiedDob() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("user_profiles")
        .select("date_of_birth")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!mounted || !data?.date_of_birth) return

      setVerifiedDob(data.date_of_birth)
      form.setValue("dob", data.date_of_birth, { shouldValidate: true })
      setPartial("cultural", { dob: data.date_of_birth })
    }

    void hydrateVerifiedDob()

    return () => {
      mounted = false
    }
  }, [form, setPartial])

  useEffect(() => {
    const sub = form.watch((values) => {
      setPartial("cultural", values)
    })
    return () => sub.unsubscribe()
  }, [form, setPartial])

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true)

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        toast.error("Please sign in to continue")
        setIsLoading(false)
        return
      }

      setPartial("cultural", values)

      const result = await saveStep5(user.id, {
        religion: values.religion,
        motherTongue: values.motherTongue,
        community: values.community,
        subCaste: values.subCaste,
        dob: values.dob,
        tob: values.tob,
        pob: values.pob,
        star: values.star,
        gotra: values.gotra,
      })

      if (result.success) {
        toast.success("Step 5 saved successfully!")
        onNext()
      } else {
        throw new Error(result.error || "Failed to save")
      }
    } catch (error: any) {
      console.error("Error saving step 5:", error)
      toast.error(error.message || "Failed to save. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-full space-y-6 overflow-hidden">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="space-y-2">
            <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A] sm:text-5xl">
              Cultural & Birth Details
            </h1>
            <p className="text-base leading-7 text-[#6F7C8B]">
              We use your verified date of birth once, then collect the extra cultural details families expect in matrimony.
            </p>
          </div>

          {verifiedDob && (
            <div className="rounded-3xl border border-[#E83262]/24 bg-[#ffffff]/76 p-4">
              <p className="luxe-kicker text-[#E83262]">verified birth date</p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">
                {formatDateForDisplay(verifiedDob)}
              </p>
              <p className="mt-1 text-sm text-[#6F7C8B]">
                This comes from the age verification step, so we will not ask for it again.
              </p>
            </div>
          )}

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="religion"
              render={({ field }) => (
                <OtherSelect
                  label="Religion"
                  value={field.value}
                  placeholder="Select religion"
                  options={RELIGION_OPTIONS}
                  otherPlaceholder="Enter religion"
                  onChange={(value) => {
                    field.onChange(value)
                    form.setValue("community", "", { shouldDirty: true, shouldValidate: true })
                    form.setValue("subCaste", "", { shouldDirty: true, shouldValidate: true })
                  }}
                />
              )}
            />
            <FormField
              control={form.control}
              name="motherTongue"
              render={({ field }) => (
                <OtherSelect
                  label="Mother Tongue"
                  value={field.value}
                  placeholder="Select mother tongue"
                  options={MOTHER_TONGUE_OPTIONS}
                  otherPlaceholder="Enter mother tongue"
                  onChange={field.onChange}
                />
              )}
            />
            <FormField
              control={form.control}
              name="community"
              render={({ field }) => (
                <OtherSelect
                  label="Community / Caste / Denomination"
                  value={field.value}
                  placeholder={selectedReligion ? "Select community" : "Select religion first"}
                  options={communityOptions}
                  otherPlaceholder="Enter community, caste, or denomination"
                  disabled={!selectedReligion}
                  onChange={(value) => {
                    field.onChange(value)
                    form.setValue("subCaste", "", { shouldDirty: true, shouldValidate: true })
                  }}
                />
              )}
            />
            <FormField
              control={form.control}
              name="subCaste"
              render={({ field }) => (
                <OtherSelect
                  label="Sub-caste / sub-community (optional)"
                  value={field.value}
                  placeholder={selectedCommunity ? "Select sub-community" : "Select community first"}
                  options={subCommunityOptions}
                  otherPlaceholder="Enter sub-caste or sub-community"
                  disabled={!selectedCommunity}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            {!verifiedDob && (
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Date of Birth</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="h-12 rounded-xl border-black/20 text-base text-[#111] focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="tob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Time of Birth</FormLabel>
                  <FormControl>
                    <TimeInput value={field.value || "00:00"} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="max-w-full overflow-hidden rounded-3xl border border-[#E83262]/24 bg-white/58 p-3 sm:p-4">
            <FormField
              control={form.control}
              name="pob"
              render={({ field }) => (
                <FormItem>
                  <LocationCascadeSelect
                    value={parseLocationValue(field.value)}
                    onChange={(location) => field.onChange(formatLocationValue(location))}
                    countryLabel="Birth Country"
                    stateLabel="Birth State"
                    cityLabel="Birth City"
                    className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="star"
              render={({ field }) => (
                <OtherSelect
                  label="Star / Raashi (optional)"
                  value={field.value}
                  placeholder="Select star / raashi"
                  options={STAR_RAASHI_OPTIONS}
                  otherPlaceholder="Enter star / raashi"
                  onChange={field.onChange}
                />
              )}
            />
            <FormField
              control={form.control}
              name="gotra"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Gotra (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-12 rounded-xl border-black/20 text-base text-[#111] focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={onBack} disabled={isLoading} className="text-black hover:text-[#E83262]">
              Back
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-[#E83262] hover:bg-[#C3264E] text-white rounded-full px-6">
              {isLoading ? "Saving..." : "Next"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
