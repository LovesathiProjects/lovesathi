"use client"

import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { familySchema } from "@/lib/schemas/matrimony"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMatrimonySetupStore } from "@/components/matrimony/store"
import { saveStep4 } from "@/lib/matrimonyService"
import { Check } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import {
  FAMILY_TYPE_OPTIONS,
  FAMILY_VALUES_OPTIONS,
  PROFESSION_OPTIONS,
  SIBLINGS_MARRIED_OPTIONS,
  withoutOther,
} from "@/lib/matrimonyOptions"

type FormValues = z.infer<typeof familySchema>

export function Step4Family({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { family, setPartial } = useMatrimonySetupStore()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOtherFatherOccupation, setIsOtherFatherOccupation] = React.useState(false)
  const [otherFatherOccupationValue, setOtherFatherOccupationValue] = React.useState("")
  const [isOtherMotherOccupation, setIsOtherMotherOccupation] = React.useState(false)
  const [otherMotherOccupationValue, setOtherMotherOccupationValue] = React.useState("")

  const form = useForm<FormValues>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      familyType: family.familyType,
      familyValues: family.familyValues,
      fatherOccupation: family.fatherOccupation,
      motherOccupation: family.motherOccupation,
      brothers: family.brothers,
      sisters: family.sisters,
      siblingsMarried: family.siblingsMarried,
      showOnProfile: family.showOnProfile ?? false,
    },
    mode: "onChange",
  })

  // Check if the current values are "Other" or not in the predefined list
  useEffect(() => {
    const currentFatherOccupation = family.fatherOccupation || ""
    if (currentFatherOccupation && !withoutOther(PROFESSION_OPTIONS).includes(currentFatherOccupation)) {
      setIsOtherFatherOccupation(true)
      setOtherFatherOccupationValue(currentFatherOccupation)
    } else {
      setIsOtherFatherOccupation(false)
      setOtherFatherOccupationValue("")
    }

    const currentMotherOccupation = family.motherOccupation || ""
    if (currentMotherOccupation && !withoutOther(PROFESSION_OPTIONS).includes(currentMotherOccupation)) {
      setIsOtherMotherOccupation(true)
      setOtherMotherOccupationValue(currentMotherOccupation)
    } else {
      setIsOtherMotherOccupation(false)
      setOtherMotherOccupationValue("")
    }
  }, [])

  useEffect(() => {
    const sub = form.watch((values) => {
      setPartial("family", values)
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

      setPartial("family", values)

      const result = await saveStep4(user.id, values)

      if (result.success) {
        toast.success("Step 4 saved successfully!")
        onNext()
      } else {
        throw new Error(result.error || "Failed to save")
      }
    } catch (error: any) {
      console.error("Error saving step 4:", error)
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
            <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#18110d] sm:text-5xl">Family Information</h1>
            <p className="text-base leading-7 text-[#685f58]">Share family context with the clarity and discretion expected in matrimony.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="familyType" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Family Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white">
                      <SelectValue placeholder="Select family type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper" className="bg-white text-black border border-black/20 z-50">
                    {FAMILY_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option} className="text-black">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="familyValues" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Family Values</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white">
                      <SelectValue placeholder="Select values" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper" className="bg-white text-black border border-black/20 z-50">
                    {FAMILY_VALUES_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option} className="text-black">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="fatherOccupation" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Father's Occupation</FormLabel>
                <FormControl>
                  <Select 
                    onValueChange={(value) => {
                      if (value === "Other") {
                        setIsOtherFatherOccupation(true)
                        setOtherFatherOccupationValue("")
                        field.onChange("")
                      } else {
                        setIsOtherFatherOccupation(false)
                        setOtherFatherOccupationValue("")
                        field.onChange(value)
                      }
                    }} 
                    value={field.value && withoutOther(PROFESSION_OPTIONS).includes(field.value) ? field.value : isOtherFatherOccupation ? "Other" : undefined}
                  >
                    <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white">
                      <SelectValue placeholder="Select occupation" />
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
                {isOtherFatherOccupation && (
                  <Input
                    placeholder="Enter occupation"
                    value={otherFatherOccupationValue}
                    onChange={(e) => {
                      const value = e.target.value
                      setOtherFatherOccupationValue(value)
                      field.onChange(value)
                    }}
                    className="mt-2 h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white"
                  />
                )}
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="motherOccupation" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Mother's Occupation</FormLabel>
                <FormControl>
                  <Select 
                    onValueChange={(value) => {
                      if (value === "Other") {
                        setIsOtherMotherOccupation(true)
                        setOtherMotherOccupationValue("")
                        field.onChange("")
                      } else {
                        setIsOtherMotherOccupation(false)
                        setOtherMotherOccupationValue("")
                        field.onChange(value)
                      }
                    }} 
                    value={field.value && withoutOther(PROFESSION_OPTIONS).includes(field.value) ? field.value : isOtherMotherOccupation ? "Other" : undefined}
                  >
                    <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white">
                      <SelectValue placeholder="Select occupation" />
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
                {isOtherMotherOccupation && (
                  <Input
                    placeholder="Enter occupation"
                    value={otherMotherOccupationValue}
                    onChange={(e) => {
                      const value = e.target.value
                      setOtherMotherOccupationValue(value)
                      field.onChange(value)
                    }}
                    className="mt-2 h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white"
                  />
                )}
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="brothers" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Brothers</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={0} 
                    {...field} 
                    onChange={(e)=>field.onChange(Number(e.target.value))}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="sisters" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Sisters</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={0} 
                    {...field} 
                    onChange={(e)=>field.onChange(Number(e.target.value))}
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="siblingsMarried" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Marital Status of Siblings</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl bg-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper" className="bg-white text-black border border-black/20 z-50">
                    {SIBLINGS_MARRIED_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option} className="text-black">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="showOnProfile" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-black">Show family information on profile</FormLabel>
              <FormControl>
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`w-12 h-10 rounded-lg flex items-center justify-center transition-all ${
                    field.value
                      ? "bg-[#97011A] text-white border border-[#97011A]"
                      : "bg-white text-black border border-black/20"
                  }`}
                >
                  {field.value && <Check className="w-5 h-5" />}
                </button>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

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
