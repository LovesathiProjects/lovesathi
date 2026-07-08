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
import { Camera, CheckCircle2, ShieldCheck, Sparkles, Upload, X } from "lucide-react"
import { useMatrimonySetupStore } from "@/components/matrimony/store"
import { uploadAsset, saveStep1 } from "@/lib/matrimonyService"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { calculateAgeFromDate, formatDateForDisplay } from "@/lib/age"

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
        .select("date_of_birth, gender")
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

    }

    void hydrateVerifiedProfile()

    return () => {
      mounted = false
    }
  }, [form, setPartial, welcome.gender])

  const uploadPhotoFiles = async (files: File[]) => {
    const remainingSlots = 6 - photos.length
    const selectedFiles = files.slice(0, remainingSlots)

    if (remainingSlots <= 0) {
      toast.message("You can upload up to 6 photos.")
      return
    }

    if (!selectedFiles.length) return

    setIsLoading(true)
    try {
      const urls: string[] = []
      for (const file of selectedFiles) {
        const url = await uploadAsset(file)
        urls.push(url)
      }
      const next = [...photos, ...urls].slice(0, 6)
      setPhotos(next)
      setPartial("welcome", { photoUrls: next })
      toast.success(urls.length === 1 ? "Photo uploaded" : `${urls.length} photos uploaded`)
    } catch (uploadError: any) {
      toast.error(uploadError?.message || "Photo upload failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

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

      // Save to store
      setPartial("welcome", {
        name: values.name,
        age: values.age,
        gender: values.gender,
        createdBy: values.createdBy,
        photoUrls: photos,
      })

      // Save to database
      const result = await saveStep1(user.id, {
        name: values.name,
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
          <div className="rounded-[2rem] border border-[#E83262]/16 bg-[linear-gradient(135deg,#FFF7FA,#ffffff_48%,#F7F9FC)] p-5 shadow-[0_18px_55px_rgba(24,17,13,0.06)] sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E83262]/18 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#E83262]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Create your profile
                </div>
                <h1 className="font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A] sm:text-5xl">
                  Start with the essentials.
                </h1>
                <p className="mt-3 text-base leading-7 text-[#6F7C8B]">
                  Add the name, creator, and profile photos we need for a family-ready first impression. Age and gender
                  stay connected to verified account details whenever available.
                </p>
              </div>
              <div className="grid min-w-[14rem] gap-2 text-sm font-semibold text-[#26364A]">
                <div className="flex items-center gap-2 rounded-2xl border border-[#E1E7EF] bg-white/80 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-[#1b6b43]" />
                  Draft saved step by step
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-[#E1E7EF] bg-white/80 px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-[#E83262]" />
                  Contact details stay private
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#482b1a]/10 bg-white/78 p-4 shadow-[0_18px_48px_rgba(24,17,13,0.05)] sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-[#E83262]/24 shadow-[0_12px_32px_rgba(24,17,13,0.12)] sm:h-20 sm:w-20">
                  {photos[0] ? (
                    <AvatarImage src={photos[0]} />
                  ) : (
                    <AvatarFallback className="bg-[#F7F9FC] text-xl font-black text-[#26364A]">
                      {form.watch("name")?.[0]?.toUpperCase() || "L"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">Profile photos</p>
                  <p className="mt-1 text-sm leading-6 text-[#6F7C8B]">
                    Add 2 to 6 clear photos. Use real profile photos, not unknown stock images.
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#E83262]">
                    {photos.length}/6 uploaded
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading || photos.length >= 6}
                className="rounded-full border-[#E83262] bg-[#E83262] px-5 text-white transition-all duration-200 hover:border-[#C3264E] hover:bg-[#C3264E]"
                onClick={() => {
                  const input = document.createElement("input")
                  input.type = "file"
                  input.accept = "image/*"
                  input.multiple = true
                  input.onchange = () => {
                    const files = Array.from(input.files || [])
                    void uploadPhotoFiles(files)
                  }
                  input.click()
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isLoading ? "Uploading..." : photos.length >= 6 ? "Photo limit reached" : "Upload photos"}
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((p, idx) => (
                <div key={p} className="group relative overflow-hidden rounded-2xl border border-[#E1E7EF] bg-[#F7F9FC]">
                  <img src={p} alt={`Profile photo ${idx + 1}`} className="aspect-[4/3] w-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#E83262]">
                      Primary
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    type="button"
                    className="absolute right-2 top-2 h-8 w-8 rounded-full p-0 opacity-95"
                    onClick={() => {
                      const next = photos.filter((_, i) => i !== idx)
                      setPhotos(next)
                      setPartial("welcome", { photoUrls: next })
                    }}
                    aria-label={`Remove photo ${idx + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 2 - photos.length) }).map((_, idx) => (
                <div key={`placeholder-${idx}`} className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-[#E83262]/24 bg-[#FFF7FA]">
                  <div className="text-center">
                    <Camera className="mx-auto h-6 w-6 text-[#E83262]" />
                    <p className="mt-2 text-xs font-bold text-[#8B98A8]">Required photo</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                    className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {verifiedDob ? (
            <div className="rounded-3xl border border-[#E83262]/24 bg-[#ffffff]/76 p-4">
              <p className="luxe-kicker text-[#E83262]">verified age</p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">
                {form.watch("age")} years
              </p>
              <p className="mt-1 text-sm text-[#6F7C8B]">
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
                      className="h-12 text-base text-[#111] border-black/20 focus:border-[#E83262] focus:ring-2 focus:ring-[#E83262]/20 rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {verifiedGender ? (
            <div className="rounded-3xl border border-[#E83262]/24 bg-[#ffffff]/76 p-4">
              <p className="luxe-kicker text-[#E83262]">verified gender</p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">
                {verifiedGender}
              </p>
              <p className="mt-1 text-sm text-[#6F7C8B]">
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
                        <div key={opt} className="flex items-center space-x-2 border-2 border-black/20 rounded-xl p-3 hover:border-[#E83262] transition-colors">
                          <RadioGroupItem value={opt} id={`gender-${opt}`} className="border-black/40 data-[state=checked]:border-[#E83262] data-[state=checked]:bg-[#E83262]" />
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
                      <div key={opt} className="flex items-center space-x-2 border-2 border-black/20 rounded-xl p-3 hover:border-[#E83262] transition-colors">
                        <RadioGroupItem value={opt} id={`created-${opt}`} className="border-black/40 data-[state=checked]:border-[#E83262] data-[state=checked]:bg-[#E83262]" />
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
