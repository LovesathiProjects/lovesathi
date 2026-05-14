"use client"

import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { careerEducationSchema } from "@/lib/schemas/matrimony"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMatrimonySetupStore } from "@/components/matrimony/store"
import { saveStep3 } from "@/lib/matrimonyService"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { EDUCATION_OPTIONS, INCOME_OPTIONS, PROFESSION_OPTIONS, withoutOther } from "@/lib/matrimonyOptions"
import { LocationCascadeSelect } from "@/components/location/location-cascade-select"

type FormValues = z.infer<typeof careerEducationSchema>

export function Step3CareerEducation({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { career, setPartial } = useMatrimonySetupStore()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOtherEducation, setIsOtherEducation] = React.useState(false)
  const [otherEducationValue, setOtherEducationValue] = React.useState("")
  const [isOtherJobTitle, setIsOtherJobTitle] = React.useState(false)
  const [otherJobTitleValue, setOtherJobTitleValue] = React.useState("")

  const form = useForm<FormValues>({
    resolver: zodResolver(careerEducationSchema),
    defaultValues: {
      highestEducation: career.highestEducation || "",
      college: career.college || "",
      jobTitle: career.jobTitle || "",
      company: career.company || "",
      annualIncome: career.annualIncome || "",
      workLocation: career.workLocation || { city: "", state: "", country: "" },
    },
    mode: "onChange",
  })

  // Check if the current value is "Other" or not in the predefined list
  useEffect(() => {
    const currentEducationValue = career.highestEducation || ""
    if (currentEducationValue && !withoutOther(EDUCATION_OPTIONS).includes(currentEducationValue)) {
      setIsOtherEducation(true)
      setOtherEducationValue(currentEducationValue)
    } else {
      setIsOtherEducation(false)
      setOtherEducationValue("")
    }

    const currentJobTitleValue = career.jobTitle || ""
    if (currentJobTitleValue && !withoutOther(PROFESSION_OPTIONS).includes(currentJobTitleValue)) {
      setIsOtherJobTitle(true)
      setOtherJobTitleValue(currentJobTitleValue)
    } else {
      setIsOtherJobTitle(false)
      setOtherJobTitleValue("")
    }
  }, [])

  useEffect(() => {
    const sub = form.watch((values) => {
      setPartial("career", values)
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

      setPartial("career", values)

      const result = await saveStep3(user.id, values)

      if (result.success) {
        toast.success("Step 3 saved successfully!")
        onNext()
      } else {
        throw new Error(result.error || "Failed to save")
      }
    } catch (error: any) {
      console.error("Error saving step 3:", error)
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
            <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A] sm:text-5xl">Your Career & Education</h1>
            <p className="text-base leading-7 text-[#6F7C8B]">Share the professional and educational details families look for while keeping the profile refined.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="highestEducation" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Highest Education</FormLabel>
                <FormControl>
                  <Select 
                    onValueChange={(value) => {
                      if (value === "Other") {
                        setIsOtherEducation(true)
                        setOtherEducationValue("")
                        field.onChange("")
                      } else {
                        setIsOtherEducation(false)
                        setOtherEducationValue("")
                        field.onChange(value)
                      }
                    }} 
                    value={field.value && withoutOther(EDUCATION_OPTIONS).includes(field.value) ? field.value : isOtherEducation ? "Other" : undefined}
                  >
                    <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl bg-white">
                      <SelectValue placeholder="Select highest education" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-white text-black border border-black/20 z-50">
                      {EDUCATION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option} className="text-black">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                {isOtherEducation && (
                  <Input
                    placeholder="Enter your education"
                    value={otherEducationValue}
                    onChange={(e) => {
                      const value = e.target.value
                      setOtherEducationValue(value)
                      field.onChange(value)
                    }}
                    className="mt-2 h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl bg-white"
                  />
                )}
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="college" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">College / University</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Stanford University" 
                    {...field}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="jobTitle" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Current Profession / Job Title</FormLabel>
                <FormControl>
                  <Select 
                    onValueChange={(value) => {
                      if (value === "Other") {
                        setIsOtherJobTitle(true)
                        setOtherJobTitleValue("")
                        field.onChange("")
                      } else {
                        setIsOtherJobTitle(false)
                        setOtherJobTitleValue("")
                        field.onChange(value)
                      }
                    }} 
                    value={field.value && withoutOther(PROFESSION_OPTIONS).includes(field.value) ? field.value : isOtherJobTitle ? "Other" : undefined}
                  >
                    <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl bg-white">
                      <SelectValue placeholder="Select job title" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-white text-black border border-black/20 z-50">
                      {PROFESSION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option} className="text-black">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                {isOtherJobTitle && (
                  <Input
                    placeholder="Enter your job title"
                    value={otherJobTitleValue}
                    onChange={(e) => {
                      const value = e.target.value
                      setOtherJobTitleValue(value)
                      field.onChange(value)
                    }}
                    className="mt-2 h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl bg-white"
                  />
                )}
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="company" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Company Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Google" 
                    {...field}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="annualIncome" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Annual Income</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl bg-white">
                      <SelectValue placeholder="Select annual income" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-white text-black border border-black/20 z-50">
                      {INCOME_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option} className="text-black">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="workLocation" render={({ field }) => (
            <FormItem>
              <LocationCascadeSelect
                value={field.value}
                onChange={(location) => field.onChange(location)}
                countryLabel="Work Country"
                stateLabel="Work State"
                cityLabel="Work City"
              />
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex justify-between pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onBack} 
              disabled={isLoading}
              className="text-black hover:text-[#E83262]"
            >
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-[#E83262] hover:bg-[#C3264E] text-white rounded-full px-6"
            >
              {isLoading ? "Saving..." : "Next"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
