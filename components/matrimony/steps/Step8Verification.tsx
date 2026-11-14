"use client"

import React from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { verificationSchema } from "@/lib/schemas/matrimony"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMatrimonySetupStore } from "@/components/matrimony/store"
import { submitProfile } from "@/lib/matrimonyService"
import { uploadFaceScan, uploadIDDocument } from "@/lib/verificationApi"
import type { MatrimonyProfile, MatrimonyPreferences } from "@/lib/types"
import { toast } from "sonner"

type FormValues = z.infer<typeof verificationSchema>

export function Step8Verification({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const { welcome, personal, career, family, cultural, bio, preferences, setPartial } = useMatrimonySetupStore()

  const form = useForm<FormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { selfieUrl: undefined, idDocUrl: undefined },
    mode: "onChange",
  })

  const onSubmit = async (values: FormValues) => {
    try {
      setPartial("verification", values)
      const profile: MatrimonyProfile = {
        name: welcome.name,
        age: welcome.age as number,
        gender: welcome.gender as any,
        createdBy: welcome.createdBy as any,
        photoUrl: welcome.photoUrl,
        personal: { ...personal },
        career: { ...career },
        family: { ...family },
        cultural: { ...cultural },
        bio: bio.bio,
      }
      const prefs: MatrimonyPreferences = { ...preferences }
      await submitProfile({ profile, preferences: prefs, verification: values })
      toast.success("Profile submitted")
      onFinish()
    } catch (e) {
      toast.error("Submission failed")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Verify Your Profile</CardTitle>
            <CardDescription>Your safety and trust are our top priorities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="selfieUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo Verification (selfie)</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" onChange={async (e)=>{
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const result = await uploadFaceScan(file)
                        if (!result.success || !result.data) throw new Error(result.error || "Selfie upload failed")
                        field.onChange(result.data.url)
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Selfie upload failed")
                      }
                    }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="idDocUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>ID Verification (Passport, DL)</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*,application/pdf" onChange={async (e)=>{
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const result = await uploadIDDocument(file)
                        if (!result.success || !result.data) throw new Error(result.error || "ID upload failed")
                        field.onChange(result.data.url)
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "ID upload failed")
                      }
                    }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
              <Button type="submit">Finish</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}


