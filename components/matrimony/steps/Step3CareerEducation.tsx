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

type FormValues = z.infer<typeof careerEducationSchema>

const EDUCATION_OPTIONS = [
  "High School",
  "Diploma",
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "MBA",
  "PhD",
  "MD",
  "JD",
  "Other"
]

const JOB_TITLE_OPTIONS = [
  "Software Engineer",
  "Data Scientist",
  "Product Manager",
  "Business Analyst",
  "Consultant",
  "Doctor",
  "Engineer",
  "Teacher",
  "Professor",
  "Lawyer",
  "Accountant",
  "Architect",
  "Designer",
  "Marketing Manager",
  "Sales Manager",
  "HR Manager",
  "Operations Manager",
  "Financial Analyst",
  "Investment Banker",
  "Entrepreneur",
  "Business Owner",
  "Nurse",
  "Pharmacist",
  "Dentist",
  "Veterinarian",
  "Scientist",
  "Researcher",
  "Journalist",
  "Writer",
  "Artist",
  "Musician",
  "Chef",
  "Pilot",
  "Civil Servant",
  "Government Employee",
  "Student",
  "Unemployed",
  "Retired",
  "Other"
]

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
    if (currentEducationValue && !EDUCATION_OPTIONS.slice(0, -1).includes(currentEducationValue)) {
      setIsOtherEducation(true)
      setOtherEducationValue(currentEducationValue)
    } else {
      setIsOtherEducation(false)
      setOtherEducationValue("")
    }

    const currentJobTitleValue = career.jobTitle || ""
    if (currentJobTitleValue && !JOB_TITLE_OPTIONS.slice(0, -1).includes(currentJobTitleValue)) {
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
            <h1 className="text-3xl font-bold text-[#111]">Your Career & Education</h1>
            <p className="text-base text-black/60">Share details about your professional and educational background.</p>
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
                    value={field.value && EDUCATION_OPTIONS.slice(0, -1).includes(field.value) ? field.value : isOtherEducation ? "Other" : undefined}
                  >
                    <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white">
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
                    className="mt-2 h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white"
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
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
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
                    value={field.value && JOB_TITLE_OPTIONS.slice(0, -1).includes(field.value) ? field.value : isOtherJobTitle ? "Other" : undefined}
                  >
                    <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white">
                      <SelectValue placeholder="Select job title" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-white text-black border border-black/20 z-50">
                      {JOB_TITLE_OPTIONS.map((option) => (
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
                    className="mt-2 h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white"
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
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="annualIncome" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Annual Income</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., 10–15 LPA / Prefer not to say" 
                    {...field}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="workLocation.city" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">City</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="City" 
                    {...field}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="workLocation.state" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">State</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="State" 
                    {...field}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="workLocation.country" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Country</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Country" 
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

