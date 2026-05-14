"use client"

import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { personalPhysicalSchema } from "@/lib/schemas/matrimony"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMatrimonySetupStore } from "@/components/matrimony/store"
import { Check } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { saveStep2 } from "@/lib/matrimonyService"
import { toast } from "sonner"
import { BODY_TYPE_OPTIONS, COMPLEXION_OPTIONS, DIET_OPTIONS, MARITAL_STATUS_OPTIONS } from "@/lib/matrimonyOptions"

type FormValues = z.infer<typeof personalPhysicalSchema>

function toCm(value: { cm?: number; ft?: number; inch?: number }) {
  if (value.cm) return value.cm
  const totalInches = (value.ft || 0) * 12 + (value.inch || 0)
  return Math.round(totalInches * 2.54)
}

function cmToFtIn(cm?: number) {
  const totalInches = Math.round((cm || 170) / 2.54)
  return {
    ft: Math.floor(totalInches / 12),
    inch: totalInches % 12,
  }
}

export function Step2PersonalPhysical({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { personal, setPartial } = useMatrimonySetupStore()
  const [unit, setUnit] = useState<"cm" | "ftin">(personal.heightUnit || "cm")
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(personalPhysicalSchema),
    defaultValues: {
      heightCm: personal.heightCm ?? 170,
      complexion: (personal.complexion as any) ?? undefined,
      bodyType: (personal.bodyType as any) ?? undefined,
      diet: (personal.diet as any) ?? undefined,
      smoker: personal.smoker ?? false,
      drinker: personal.drinker ?? false,
      maritalStatus: (personal.maritalStatus as any) ?? "Never Married",
    },
    mode: "onChange",
  })

  useEffect(() => {
    const sub = form.watch((values) => {
      setPartial("personal", { ...values, heightUnit: unit })
    })
    return () => sub.unsubscribe()
  }, [form, setPartial, unit])

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true)
    
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        toast.error("Please sign in to continue")
        setIsLoading(false)
        return
      }

      // Save to store
      setPartial("personal", { ...values, heightUnit: unit })

      // Save to database
      const result = await saveStep2(user.id, {
        heightCm: values.heightCm,
        heightUnit: unit,
        complexion: values.complexion,
        bodyType: values.bodyType,
        diet: values.diet,
        smoker: values.smoker,
        drinker: values.drinker,
        maritalStatus: values.maritalStatus,
      })

      if (result.success) {
        toast.success("Step 2 saved successfully!")
        onNext()
      } else {
        throw new Error(result.error || "Failed to save")
      }
    } catch (error: any) {
      console.error("Error saving step 2:", error)
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
            <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A] sm:text-5xl">About You</h1>
            <p className="text-base leading-7 text-[#6F7C8B]">Tell us more about your personal details in a clean, family-ready format.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FormLabel className="text-black">Height unit</FormLabel>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant={unit === "cm" ? "default" : "outline"} 
                  onClick={() => setUnit("cm")}
                  className={unit === "cm" ? "bg-[#E83262] hover:bg-[#C3264E] text-white" : "border-black/20 text-black hover:border-[#E83262]"}
                >
                  cm
                </Button>
                <Button 
                  type="button" 
                  variant={unit === "ftin" ? "default" : "outline"} 
                  onClick={() => setUnit("ftin")}
                  className={unit === "ftin" ? "bg-[#E83262] hover:bg-[#C3264E] text-white" : "border-black/20 text-black hover:border-[#E83262]"}
                >
                  ft/in
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="heightCm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Height</FormLabel>
                  <FormControl>
                    {unit === "cm" ? (
                      <Input 
                        type="number" 
                        min={90} 
                        max={250} 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl"
                      />
                    ) : (
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          placeholder="ft" 
                          min={3}
                          max={8}
                          value={cmToFtIn(field.value).ft}
                          onChange={(e) => {
                            const current = cmToFtIn(field.value)
                            const cm = toCm({ ft: Number(e.target.value), inch: current.inch })
                            field.onChange(cm)
                          }}
                          className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl"
                        />
                        <Input 
                          type="number" 
                          placeholder="in" 
                          min={0}
                          max={11}
                          value={cmToFtIn(field.value).inch}
                          onChange={(e) => {
                            const current = cmToFtIn(field.value)
                            const cm = toCm({ ft: current.ft, inch: Number(e.target.value) })
                            field.onChange(cm)
                          }}
                          className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl"
                        />
                      </div>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="complexion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Complexion / Skin tone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl bg-white">
                        <SelectValue placeholder="Select complexion" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white text-black border border-black/20">
                      {COMPLEXION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option} className="text-black">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bodyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Body Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl bg-white">
                        <SelectValue placeholder="Select body type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white text-black border border-black/20">
                      {BODY_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option} className="text-black">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="diet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Dietary Habits</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl bg-white">
                        <SelectValue placeholder="Select dietary preference" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white text-black border border-black/20">
                      {[
                        ...DIET_OPTIONS,
                      ].map((option) => (
                        <SelectItem key={option} value={option} className="text-black">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="smoker"
                render={({ field }) => (
                  <FormItem>
                  <FormLabel className="text-black">Smoker</FormLabel>
                    <FormControl>
                      <button
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        className={`w-12 h-10 rounded-lg flex items-center justify-center transition-all ${
                          field.value
                            ? "bg-[#E83262] text-white border border-[#E83262]"
                          : "bg-white text-black border border-black/20"
                        }`}
                      >
                        {field.value ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">No</span>}
                      </button>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="drinker"
                render={({ field }) => (
                  <FormItem>
                  <FormLabel className="text-black">Drinker</FormLabel>
                    <FormControl>
                      <button
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        className={`w-12 h-10 rounded-lg flex items-center justify-center transition-all ${
                          field.value
                            ? "bg-[#E83262] text-white border border-[#E83262]"
                            : "bg-white text-black border border-black/20"
                        }`}
                      >
                        {field.value ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">No</span>}
                      </button>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="maritalStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Marital Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl bg-white">
                      <SelectValue placeholder="Select marital status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white text-black border border-black/20">
                    {MARITAL_STATUS_OPTIONS.map(
                      (option) => (
                        <SelectItem key={option} value={option} className="text-black">
                          {option}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
