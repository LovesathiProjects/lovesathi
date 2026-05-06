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

type FormValues = z.infer<typeof bioSchema>

export function Step6Bio({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { bio, setPartial } = useMatrimonySetupStore()
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

