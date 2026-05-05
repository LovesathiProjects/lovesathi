"use client"

import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { culturalAstroSchema } from "@/lib/schemas/matrimony"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMatrimonySetupStore } from "@/components/matrimony/store"
import { saveStep5 } from "@/lib/matrimonyService"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"

type FormValues = z.infer<typeof culturalAstroSchema>

const RELIGION_OPTIONS = [
  "Hinduism",
  "Islam",
  "Christianity",
  "Sikhism",
  "Buddhism",
  "Jainism",
  "Judaism",
  "Zoroastrianism",
  "Bahá'í",
  "Atheist",
  "Agnostic",
  "Spiritual",
  "Other"
]

const MOTHER_TONGUE_OPTIONS = [
  "Hindi",
  "English",
  "Bengali",
  "Telugu",
  "Marathi",
  "Tamil",
  "Gujarati",
  "Urdu",
  "Kannada",
  "Odia",
  "Malayalam",
  "Punjabi",
  "Assamese",
  "Sanskrit",
  "Kashmiri",
  "Sindhi",
  "Konkani",
  "Manipuri",
  "Nepali",
  "Bodo",
  "Santhali",
  "Maithili",
  "Dogri",
  "Other"
]

export function Step5CulturalAstro({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { cultural, setPartial } = useMatrimonySetupStore()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOtherReligion, setIsOtherReligion] = React.useState(false)
  const [otherReligionValue, setOtherReligionValue] = React.useState("")
  const [isOtherMotherTongue, setIsOtherMotherTongue] = React.useState(false)
  const [otherMotherTongueValue, setOtherMotherTongueValue] = React.useState("")

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

  // Check if the current values are "Other" or not in the predefined list
  useEffect(() => {
    const currentReligionValue = cultural.religion || ""
    if (currentReligionValue && !RELIGION_OPTIONS.slice(0, -1).includes(currentReligionValue)) {
      setIsOtherReligion(true)
      setOtherReligionValue(currentReligionValue)
    } else {
      setIsOtherReligion(false)
      setOtherReligionValue("")
    }

    const currentMotherTongueValue = cultural.motherTongue || ""
    if (currentMotherTongueValue && !MOTHER_TONGUE_OPTIONS.slice(0, -1).includes(currentMotherTongueValue)) {
      setIsOtherMotherTongue(true)
      setOtherMotherTongueValue(currentMotherTongueValue)
    } else {
      setIsOtherMotherTongue(false)
      setOtherMotherTongueValue("")
    }
  }, [])

  useEffect(() => {
    const sub = form.watch((values) => {
      setPartial("cultural", values)
    })
    return () => sub.unsubscribe()
  }, [form, setPartial])

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true)
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
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
            <h1 className="text-3xl font-bold text-[#111]">Your Cultural Details</h1>
            <p className="text-base text-black/60">Tell us about your cultural and religious background.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="religion" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Religion</FormLabel>
                <FormControl>
                  <Select 
                    onValueChange={(value) => {
                      if (value === "Other") {
                        setIsOtherReligion(true)
                        setOtherReligionValue("")
                        field.onChange("")
                      } else {
                        setIsOtherReligion(false)
                        setOtherReligionValue("")
                        field.onChange(value)
                      }
                    }} 
                    value={field.value && RELIGION_OPTIONS.slice(0, -1).includes(field.value) ? field.value : isOtherReligion ? "Other" : undefined}
                  >
                    <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white">
                      <SelectValue placeholder="Select religion" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-white text-black border border-black/20 z-50">
                      {RELIGION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option} className="text-black">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                {isOtherReligion && (
                  <Input
                    placeholder="Enter religion"
                    value={otherReligionValue}
                    onChange={(e) => {
                      const value = e.target.value
                      setOtherReligionValue(value)
                      field.onChange(value)
                    }}
                    className="mt-2 h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white"
                  />
                )}
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="motherTongue" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Mother Tongue</FormLabel>
                <FormControl>
                  <Select 
                    onValueChange={(value) => {
                      if (value === "Other") {
                        setIsOtherMotherTongue(true)
                        setOtherMotherTongueValue("")
                        field.onChange("")
                      } else {
                        setIsOtherMotherTongue(false)
                        setOtherMotherTongueValue("")
                        field.onChange(value)
                      }
                    }} 
                    value={field.value && MOTHER_TONGUE_OPTIONS.slice(0, -1).includes(field.value) ? field.value : isOtherMotherTongue ? "Other" : undefined}
                  >
                    <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white">
                      <SelectValue placeholder="Select mother tongue" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-white text-black border border-black/20 z-50">
                      {MOTHER_TONGUE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option} className="text-black">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                {isOtherMotherTongue && (
                  <Input
                    placeholder="Enter mother tongue"
                    value={otherMotherTongueValue}
                    onChange={(e) => {
                      const value = e.target.value
                      setOtherMotherTongueValue(value)
                      field.onChange(value)
                    }}
                    className="mt-2 h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white"
                  />
                )}
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="community" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Community / Caste</FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="subCaste" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Sub-caste (optional)</FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="dob" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Date of Birth</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tob" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Time of Birth</FormLabel>
                <FormControl>
                  <Input 
                    type="time" 
                    {...field}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="pob" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Place of Birth</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="City, Country" 
                    {...field}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="star" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Star / Raashi (optional)</FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="gotra" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Gotra (optional)</FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="flex justify-between pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onBack} 
              disabled={isLoading}
              className="text-black hover:text-[#97011A]"
            >
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-[#97011A] hover:bg-[#7A010E] text-white rounded-full px-6"
            >
              {isLoading ? "Saving..." : "Next"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

