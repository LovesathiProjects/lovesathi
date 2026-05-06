"use client"

import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { bioSchema } from "@/lib/schemas/matrimony"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useMatrimonySetupStore } from "@/components/matrimony/store"
import { saveStep6 } from "@/lib/matrimonyService"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"

type FormValues = z.infer<typeof bioSchema>

export function Step6Bio({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { bio, career, cultural, family, personal, welcome, setPartial } = useMatrimonySetupStore()
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(bioSchema),
    defaultValues: { bio: bio.bio || "" },
    mode: "onChange",
  })

  useEffect(() => {
    const sub = form.watch((values) => {
      setPartial("bio", values)
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

      setPartial("bio", values)

      const result = await saveStep6(user.id, values.bio)

      if (result.success) {
        onNext()
      } else {
        throw new Error(result.error || "Failed to save")
      }
    } catch (error: any) {
      console.error("Error saving step 6:", error)
      toast.error(error.message || "Failed to save. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const suggestions = React.useMemo(() => {
    const name = welcome.name?.trim()
    const subject = name || "I"
    const verb = name ? "is" : "am"
    const role = career.jobTitle || "a grounded professional"
    const education = career.highestEducation ? ` with a ${career.highestEducation} background` : ""
    const city = career.workLocation?.city ? ` based in ${career.workLocation.city}` : ""
    const faith = cultural.religion ? `${cultural.religion.toLowerCase()} values` : "family values"
    const familyTone = family.familyValues ? `${family.familyValues.toLowerCase()} family values` : "warm family values"
    const lifestyle = personal.diet ? `${personal.diet.toLowerCase()} lifestyle` : "balanced lifestyle"

    return [
      `${subject} ${verb} ${role}${education}${city}, known for a calm, sincere nature and ${familyTone}. Looking for a life partner who values respect, loyalty, and meaningful family bonds.`,
      `I believe marriage is built on trust, patience, and shared growth. My life is guided by ${faith}, a ${lifestyle}, and the hope of building a peaceful home with the right person.`,
      `A thoughtful and family-oriented person, I value honest conversations, emotional maturity, and mutual support. I am looking for someone kind, grounded, and ready for a serious commitment.`,
    ].map((item) => item.slice(0, 300))
  }, [career, cultural, family, personal, welcome])

  function applySuggestion(suggestion: string) {
    form.setValue("bio", suggestion, { shouldDirty: true, shouldValidate: true })
    setPartial("bio", { bio: suggestion })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#18110d] sm:text-5xl">A Few Words About You</h1>
            <p className="text-base leading-7 text-[#6c5a4a]">Write a warm introduction that helps families and serious matches understand your personality.</p>
          </div>
          
          <FormField control={form.control} name="bio" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-black">Bio (20-300 characters)</FormLabel>
              <FormControl>
                <Textarea 
                  rows={12} 
                  maxLength={300} 
                  placeholder="Describe your personality, passions, and what you're looking for in a life partner." 
                  {...field}
                  className="text-base text-[#111] placeholder:text-black/40 resize-none min-h-[250px] border-black/20 focus:border-[#97011A] focus:ring-2 focus:ring-[#97011A]/20 rounded-xl"
                />
              </FormControl>
              <div className="flex justify-between items-center">
                <p className={`text-sm ${
                  (field.value?.length || 0) > 0 && (field.value?.length || 0) < 20
                    ? "text-[#97011A]"
                    : "text-black/60"
                }`}>
                  {(field.value?.length || 0) > 0 && (field.value?.length || 0) < 20
                    ? "At least 20 characters required"
                    : "Tell us about yourself"}
                </p>
                <p className={`text-sm ${
                  (field.value?.length || 0) === 300 
                    ? "text-[#97011A]"
                    : (field.value?.length || 0) < 20 && (field.value?.length || 0) > 0
                    ? "text-[#97011A]"
                    : "text-black/60"
                }`}>
                  {(field.value?.length || 0)}/300
                </p>
              </div>
              <FormMessage />
            </FormItem>
          )} />

          <div className="rounded-[1.75rem] border border-[#d9b978]/24 bg-[#fffaf2]/78 p-4 shadow-[0_16px_45px_rgba(24,17,13,0.06)]">
            <div className="mb-3 flex items-center gap-2 text-[#8f001c]">
              <Sparkles className="h-4 w-4" />
              <p className="luxe-kicker">bio suggestions from your details</p>
            </div>
            <div className="grid gap-3">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  className="rounded-2xl border border-[#482b1a]/10 bg-white/70 p-3 text-left text-sm leading-6 text-[#6c5a4a] transition hover:border-[#8f001c]/30 hover:text-[#18110d]"
                >
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-[#8f001c]">
                    Option {index + 1}
                  </span>
                  {suggestion}
                </button>
              ))}
            </div>
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
