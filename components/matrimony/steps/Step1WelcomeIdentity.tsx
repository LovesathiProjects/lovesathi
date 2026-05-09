"use client"

import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { welcomeIdentitySchema } from "@/lib/schemas/matrimony"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Upload, X } from "lucide-react"
import { useMatrimonySetupStore } from "@/components/matrimony/store"
import { uploadAsset, saveStep1 } from "@/lib/matrimonyService"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { calculateAgeFromDate, formatDateForDisplay } from "@/lib/age"
import { getPhoneValidationMessage, normalizePhoneNumber } from "@/lib/phone"

type FormValues = z.infer<typeof welcomeIdentitySchema>

export function Step1WelcomeIdentity({ onNext }: { onNext: () => void }) {
  const { welcome, setPartial } = useMatrimonySetupStore()
  const [photos, setPhotos] = React.useState<string[]>(welcome.photoUrls || (welcome.photoUrl ? [welcome.photoUrl] : []))
  const [isLoading, setIsLoading] = React.useState(false)
  const [verifiedDob, setVerifiedDob] = React.useState<string | null>(null)
  const [verifiedGender, setVerifiedGender] = React.useState<"Male" | "Female" | "Other" | null>(null)
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(welcomeIdentitySchema),
    defaultValues: {
      name: welcome.name || "",
      phone: welcome.phone || "",
      age: welcome.age ?? undefined,
      gender: (welcome.gender as any) ?? undefined,
      createdBy: (welcome.createdBy as any) ?? "Self",
      photo: undefined,
    },
    mode: "onChange",
  })

  useEffect(() => {
    const sub = form.watch((values) => {
      setPartial("welcome", {
        name: values.name,
        phone: values.phone,
        age: values.age,
        gender: values.gender,
        createdBy: values.createdBy,
      })
    })
    return () => sub.unsubscribe()
  }, [form, setPartial])

  useEffect(() => {
    let mounted = true

    async function hydrateVerifiedProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("user_profiles")
        .select("date_of_birth, gender, phone")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!mounted) return

      if (data?.date_of_birth) {
        const age = calculateAgeFromDate(data.date_of_birth)
        setVerifiedDob(data.date_of_birth)
        if (age) {
          form.setValue("age", age, { shouldValidate: true })
          setPartial("welcome", { age })
        }
      }

      if (data?.gender) {
        const nextGender = data.gender === "male" ? "Male" : data.gender === "female" ? "Female" : "Other"
        setVerifiedGender(nextGender)
        form.setValue("gender", nextGender, { shouldValidate: true })
        setPartial("welcome", { gender: nextGender })
      }

      const hydratedPhone = normalizePhoneNumber(data?.phone || user.user_metadata?.phone || user.phone || "")
      if (hydratedPhone) {
        form.setValue("phone", hydratedPhone, { shouldValidate: true })
        setPartial("welcome", { phone: hydratedPhone })
      }
    }

    void hydrateVerifiedProfile()

    return () => {
      mounted = false
    }
  }, [form, setPartial, welcome.gender])

  const onSubmit = async (values: FormValues) => {
    if (photos.length < 2) {
      toast.error("Please upload at least 2 photos")
      return
    }

    setIsLoading(true)
    
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        toast.error("Please sign in to continue")
        setIsLoading(false)
        return
      }

      const normalizedPhone = normalizePhoneNumber(values.phone)
      const phoneError = getPhoneValidationMessage(normalizedPhone)
      if (phoneError) {
        toast.error(phoneError)
        setIsLoading(false)
        return
      }

      // Save to store
      setPartial("welcome", {
        name: values.name,
        phone: normalizedPhone,
        age: values.age,
        gender: values.gender,
        createdBy: values.createdBy,
        photoUrls: photos,
      })

      // Save to database
      const result = await saveStep1(user.id, {
        name: values.name,
        phone: normalizedPhone,
        age: values.age,
        gender: values.gender,
        createdBy: values.createdBy,
        photoUrls: photos,
      })

      if (result.success) {
        toast.success("Step 1 saved successfully!")
        onNext()
      } else {
        throw new Error(result.error || "Failed to save")
      }
    } catch (error: any) {
      console.error("Error saving step 1:", error)
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
            <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#3A2B24] sm:text-5xl">Welcome</h1>
            <p className="text-base leading-7 text-[#8B7B70]">Tell us whose profile we are preparing. Age is derived from your verified birth date.</p>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
              {photos[0] ? (
                <AvatarImage src={photos[0]} />
              ) : (
                <AvatarFallback className="bg-black/10 text-black">{form.watch("name")?.[0]?.toUpperCase() || "U"}</AvatarFallback>
              )}
            </Avatar>
            <Button
              type="button"
              variant="outline"
              className="text-xs sm:text-sm bg-[#C2A574] text-[#3A2B24] border-[#C2A574] rounded-full px-4 hover:bg-[#B9975E] hover:border-[#B9975E] transition-all duration-200"
              onClick={async () => {
                const input = document.createElement("input")
                input.type = "file"
                input.accept = "image/*"
                input.multiple = true
                input.onchange = async () => {
                  const files = Array.from(input.files || [])
                  if (!files.length) return
                  const urls: string[] = []
                  for (const f of files.slice(0, 6 - photos.length)) {
                    const url = await uploadAsset(f)
                    urls.push(url)
                  }
                  const next = [...photos, ...urls].slice(0, 6)
                  setPhotos(next)
                  setPartial("welcome", { photoUrls: next })
                }
                input.click()
              }}
            >
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Upload profile photo
            </Button>
          </div>
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {photos.map((p, idx) => (
                <div key={idx} className="relative">
                  <img src={p} alt={"photo-"+idx} className="w-full h-20 sm:h-24 object-cover rounded-md" />
                  <Button size="sm" variant="destructive" className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 p-0 rounded-full" onClick={() => {
                    const next = photos.filter((_,i)=>i!==idx)
                    setPhotos(next)
                    setPartial("welcome", { photoUrls: next })
                  }}>
                    <X className="w-2 h-2 sm:w-3 sm:h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-black/60">Add minimum 2, maximum 6 photos.</div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Your full name" 
                    {...field} 
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#C2A574] focus:ring-2 focus:ring-[#C2A574]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Phone Number</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={field.value || ""}
                    onChange={field.onChange}
                    onBlur={() => {
                      const normalized = normalizePhoneNumber(field.value || "")
                      field.onChange(normalized)
                      setPartial("welcome", { phone: normalized })
                    }}
                    autoComplete="tel"
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#C2A574] focus:ring-2 focus:ring-[#C2A574]/20 rounded-xl"
                  />
                </FormControl>
                <p className="text-xs leading-5 text-[#8B7B70]">
                  Required. Free users see it masked; paid plans reveal it through Lovesathi contact access.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {verifiedDob ? (
            <div className="rounded-3xl border border-[#C2A574]/24 bg-[#ffffff]/76 p-4">
              <p className="luxe-kicker text-[#C2A574]">verified age</p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-[-0.04em] text-[#3A2B24]">
                {form.watch("age")} years
              </p>
              <p className="mt-1 text-sm text-[#8B7B70]">
                Based on {formatDateForDisplay(verifiedDob)}. You will not need to enter age again.
              </p>
            </div>
          ) : (
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Age</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={18}
                      max={80}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="h-12 text-base text-[#111] border-black/20 focus:border-[#C2A574] focus:ring-2 focus:ring-[#C2A574]/20 rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {verifiedGender ? (
            <div className="rounded-3xl border border-[#C2A574]/24 bg-[#ffffff]/76 p-4">
              <p className="luxe-kicker text-[#C2A574]">verified gender</p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-[-0.04em] text-[#3A2B24]">
                {verifiedGender}
              </p>
              <p className="mt-1 text-sm text-[#8B7B70]">
                This was already captured during verification, so we will not ask again here.
              </p>
            </div>
          ) : (
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Gender</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(["Male", "Female", "Other"] as const).map((opt) => (
                        <div key={opt} className="flex items-center space-x-2 border-2 border-black/20 rounded-xl p-3 hover:border-[#C2A574] transition-colors">
                          <RadioGroupItem value={opt} id={`gender-${opt}`} className="border-black/40 data-[state=checked]:border-[#C2A574] data-[state=checked]:bg-[#C2A574]" />
                          <label htmlFor={`gender-${opt}`} className="text-xs sm:text-sm text-black cursor-pointer">
                            {opt}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="createdBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Profile created by</FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(["Self", "Parent", "Sibling", "Other"] as const).map((opt) => (
                      <div key={opt} className="flex items-center space-x-2 border-2 border-black/20 rounded-xl p-3 hover:border-[#C2A574] transition-colors">
                        <RadioGroupItem value={opt} id={`created-${opt}`} className="border-black/40 data-[state=checked]:border-[#C2A574] data-[state=checked]:bg-[#C2A574]" />
                        <label htmlFor={`created-${opt}`} className="text-xs sm:text-sm text-black cursor-pointer">
                          {opt}
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              disabled={isLoading} 
              onClick={() => {
                // Navigate back to the welcome step.
                try {
                  localStorage.removeItem("onboardingCompleteMode")
                  localStorage.removeItem("onboardingShowComplete")
                  // Set a flag to show path selection immediately
                  localStorage.setItem("showPathSelect", "true")
                } catch {}
                router.push("/")
              }}
              className="text-black hover:text-[#C2A574]"
            >
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-[#C2A574] hover:bg-[#B9975E] text-[#3A2B24] rounded-full px-6"
            >
              {isLoading ? "Saving..." : "Next"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
