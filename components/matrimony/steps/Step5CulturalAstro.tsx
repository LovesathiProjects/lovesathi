"use client"

import React, { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMatrimonySetupStore } from "@/components/matrimony/store"
import { culturalAstroSchema } from "@/lib/schemas/matrimony"
import { saveStep5 } from "@/lib/matrimonyService"
import { supabase } from "@/lib/supabaseClient"
import { formatDateForDisplay } from "@/lib/age"
import { LocationCascadeSelect } from "@/components/location/location-cascade-select"
import { formatLocationValue, parseLocationValue } from "@/lib/location"
import {
  COMMUNITY_OPTIONS,
  MOTHER_TONGUE_OPTIONS,
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
  onChange,
}: {
  label: string
  value?: string
  placeholder: string
  options: readonly string[]
  otherPlaceholder: string
  onChange: (value: string) => void
}) {
  const [customValue, setCustomValue] = React.useState(isPreset(value, options) ? "" : value || "")
  const selectValue = value && isPreset(value, options) ? value : value ? "Other" : undefined

  useEffect(() => {
    if (!value || isPreset(value, options)) {
      setCustomValue("")
    } else {
      setCustomValue(value)
    }
  }, [options, value])

  return (
    <FormItem>
      <FormLabel className="text-black">{label}</FormLabel>
      <FormControl>
        <Select
          onValueChange={(nextValue) => {
            if (nextValue === "Other") {
              setCustomValue("")
              onChange("")
              return
            }
            onChange(nextValue)
          }}
          value={selectValue}
        >
          <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent position="popper" className="z-50 border border-black/20 bg-white text-black">
            {options.map((option) => (
              <SelectItem key={option} value={option} className="text-black">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormControl>
      {selectValue === "Other" && (
        <Input
          placeholder={otherPlaceholder}
          value={customValue}
          onChange={(event) => {
            setCustomValue(event.target.value)
            onChange(event.target.value)
          }}
          className="mt-2 h-12 rounded-xl border-black/20 bg-white text-base text-[#111] focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20"
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
      religion: cultural.religion || "",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#18110d] sm:text-5xl">
              Cultural & Birth Details
            </h1>
            <p className="text-base leading-7 text-[#6c5a4a]">
              We use your verified date of birth once, then collect the extra cultural details families expect in matrimony.
            </p>
          </div>

          {verifiedDob && (
            <div className="rounded-3xl border border-[#b9904d]/24 bg-[#fffaf2]/76 p-4">
              <p className="luxe-kicker text-[#8f001c]">verified birth date</p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-[-0.04em] text-[#18110d]">
                {formatDateForDisplay(verifiedDob)}
              </p>
              <p className="mt-1 text-sm text-[#6c5a4a]">
                This comes from the age verification step, so we will not ask for it again.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  onChange={field.onChange}
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
                  label="Community / Caste"
                  value={field.value}
                  placeholder="Select community"
                  options={COMMUNITY_OPTIONS}
                  otherPlaceholder="Enter community"
                  onChange={field.onChange}
                />
              )}
            />
            <FormField
              control={form.control}
              name="subCaste"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Sub-caste (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-12 rounded-xl border-black/20 text-base text-[#111] focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem className={verifiedDob ? "hidden" : ""}>
                  <FormLabel className="text-black">Date of Birth</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="h-12 rounded-xl border-black/20 text-base text-[#111] focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Time of Birth</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      className="h-12 rounded-xl border-black/20 text-base text-[#111] focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pob"
              render={({ field }) => (
                <FormItem className={verifiedDob ? "sm:col-span-2" : ""}>
                  <LocationCascadeSelect
                    value={parseLocationValue(field.value)}
                    onChange={(location) => field.onChange(formatLocationValue(location))}
                    countryLabel="Birth Country"
                    stateLabel="Birth State"
                    cityLabel="Birth City"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      className="h-12 rounded-xl border-black/20 text-base text-[#111] focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={onBack} disabled={isLoading} className="text-black hover:text-[#97011A]">
              Back
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-[#97011A] hover:bg-[#7A010E] text-white rounded-full px-6">
              {isLoading ? "Saving..." : "Next"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
