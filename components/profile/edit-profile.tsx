"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Plus, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabaseClient"
import { uploadAsset, type MatrimonyProfileFull } from "@/lib/matrimonyService"
import { useToast } from "@/hooks/use-toast"

interface EditProfileProps {
  onBack: () => void
  onSave?: () => void
  mode?: "matrimony"
}

type PhotoItem = { url: string; file?: File }

export function EditProfile({ onBack, onSave }: EditProfileProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("photos")
  const [profile, setProfile] = useState<MatrimonyProfileFull | null>(null)
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  const [createdBy, setCreatedBy] = useState("")
  const [bio, setBio] = useState("")
  const [personal, setPersonal] = useState<any>({})
  const [career, setCareer] = useState<any>({})
  const [family, setFamily] = useState<any>({})
  const [cultural, setCultural] = useState<any>({})
  const [partnerPreferences, setPartnerPreferences] = useState<any>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    void fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("matrimony_profile_full")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (error) throw error

      if (data) {
        const typed = data as MatrimonyProfileFull
        setProfile(typed)
        setPhotos(((typed.photos as string[]) || []).map((url) => ({ url })))
        setName(typed.name || "")
        setAge(typed.age ? String(typed.age) : "")
        setGender(typed.gender || "")
        setCreatedBy(typed.created_by || "")
        setBio(typed.bio || "")
        setPersonal(typed.personal || {})
        setCareer(typed.career || {})
        setFamily(typed.family || {})
        setCultural(typed.cultural || {})
        setPartnerPreferences(typed.partner_preferences || {})
      }
    } catch (error) {
      console.error("Error loading matrimony profile:", error)
      toast({
        title: "Error",
        description: "Failed to load your profile.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files) return

    const remaining = Math.max(0, 6 - photos.length)
    const next = Array.from(files)
      .slice(0, remaining)
      .map((file) => ({ url: URL.createObjectURL(file), file }))

    setPhotos((prev) => [...prev, ...next])
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  function setNested(section: "personal" | "career" | "family" | "cultural" | "partner", key: string, value: any) {
    const map = {
      personal: setPersonal,
      career: setCareer,
      family: setFamily,
      cultural: setCultural,
      partner: setPartnerPreferences,
    } as const

    const stateMap = {
      personal,
      career,
      family,
      cultural,
      partner: partnerPreferences,
    } as const

    map[section]({ ...stateMap[section], [key]: value })
  }

  function updateWorkLocation(key: string, value: string) {
    setCareer({
      ...career,
      work_location: {
        ...(career.work_location || {}),
        [key]: value,
      },
    })
  }

  async function handleSave() {
    try {
      setSaving(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Please sign in to continue.")
      }

      const uploadedPhotoUrls: string[] = []
      for (const photo of photos) {
        if (photo.file) {
          uploadedPhotoUrls.push(await uploadAsset(photo.file))
        } else {
          uploadedPhotoUrls.push(photo.url)
        }
      }

      const updateData: any = {
        user_id: user.id,
        name,
        age: age ? Number(age) : null,
        gender: gender || null,
        created_by: createdBy || null,
        photos: uploadedPhotoUrls,
        bio,
        personal,
        career,
        family,
        cultural,
        partner_preferences: partnerPreferences,
      }

      if (profile) {
        updateData.step1_completed = profile.step1_completed
        updateData.step2_completed = profile.step2_completed
        updateData.step3_completed = profile.step3_completed
        updateData.step4_completed = profile.step4_completed
        updateData.step5_completed = profile.step5_completed
        updateData.step6_completed = profile.step6_completed
        updateData.step7_completed = profile.step7_completed
        updateData.profile_completed = profile.profile_completed
      }

      const { error } = await supabase
        .from("matrimony_profile_full")
        .upsert(updateData, { onConflict: "user_id" })

      if (error) throw error

      toast({
        title: "Saved",
        description: "Your Lovesathi profile has been updated.",
      })
      onSave?.()
      onBack()
    } catch (error: any) {
      console.error("Error saving matrimony profile:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save profile.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="luxe-light-page flex min-h-screen items-center justify-center">
        <div className="luxe-card rounded-[2rem] p-7 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#8f001c] border-t-transparent" />
          <p className="mt-4 font-bold text-[#18110d]">Preparing your profile atelier...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="luxe-light-page min-h-screen">
      <div className="sticky top-0 z-20 border-b border-[#482b1a]/10 bg-[#fffaf2]/84 shadow-[0_18px_55px_rgba(24,17,13,0.08)] backdrop-blur-xl">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="sm" className="p-2" onClick={onBack}>
            <ArrowLeft className="w-5 h-5 text-black" />
          </Button>
          <div className="text-center">
            <p className="luxe-kicker text-[0.62rem] text-[#8f001c]">profile atelier</p>
            <h1 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#18110d]">Edit Profile</h1>
          </div>
          <Button className="luxe-button rounded-full" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-4 pb-24 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 rounded-[1.5rem] border border-[#d9b978]/24 bg-[#fffaf2]/80 p-1 shadow-[0_14px_45px_rgba(24,17,13,0.08)]">
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="career">Career</TabsTrigger>
            <TabsTrigger value="family">Family</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="mt-4">
            <Card className="luxe-card rounded-[2rem] border-[#d9b978]/24">
              <CardHeader>
                <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#18110d]">Photos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="space-y-2">
                      <div className="aspect-square overflow-hidden rounded-2xl border border-[#d9b978]/24 bg-[#18110d] shadow-sm">
                        <img src={photo.url || "/placeholder.svg"} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                      </div>
                      <Button size="sm" className="luxe-button w-full rounded-full" onClick={() => removePhoto(index)}>
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ))}
                  {photos.length < 6 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#b9904d]/45 bg-[#fffaf2]/68 text-[#6c5a4a] transition hover:border-[#8f001c] hover:text-[#8f001c]"
                    >
                      <Plus className="w-5 h-5 text-[#97011A]" />
                      <span className="text-sm text-[#666666]">Add Photo</span>
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="basic" className="mt-4 space-y-4">
            <Card className="luxe-card rounded-[2rem] border-[#d9b978]/24">
              <CardHeader>
                <CardTitle>Basic Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Profile Created By</Label>
                  <Select value={createdBy} onValueChange={setCreatedBy}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Self">Self</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input
                    type="number"
                    value={personal.height_cm || ""}
                    onChange={(e) => setNested("personal", "height_cm", e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Input
                    value={personal.marital_status || ""}
                    onChange={(e) => setNested("personal", "marital_status", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Diet</Label>
                  <Input value={personal.diet || ""} onChange={(e) => setNested("personal", "diet", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Body Type</Label>
                  <Input value={personal.body_type || ""} onChange={(e) => setNested("personal", "body_type", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card className="luxe-card rounded-[2rem] border-[#d9b978]/24">
              <CardHeader>
                <CardTitle>About Me</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-32" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="career" className="mt-4 space-y-4">
            <Card className="luxe-card rounded-[2rem] border-[#d9b978]/24">
              <CardHeader>
                <CardTitle>Career & Cultural Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Highest Education</Label>
                  <Input value={career.highest_education || ""} onChange={(e) => setNested("career", "highest_education", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>College</Label>
                  <Input value={career.college || ""} onChange={(e) => setNested("career", "college", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input value={career.job_title || ""} onChange={(e) => setNested("career", "job_title", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input value={career.company || ""} onChange={(e) => setNested("career", "company", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Annual Income</Label>
                  <Input value={career.annual_income || ""} onChange={(e) => setNested("career", "annual_income", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={career.work_location?.city || ""} onChange={(e) => updateWorkLocation("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={career.work_location?.state || ""} onChange={(e) => updateWorkLocation("state", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={career.work_location?.country || ""} onChange={(e) => updateWorkLocation("country", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Religion</Label>
                  <Input value={cultural.religion || ""} onChange={(e) => setNested("cultural", "religion", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mother Tongue</Label>
                  <Input value={cultural.mother_tongue || ""} onChange={(e) => setNested("cultural", "mother_tongue", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Community</Label>
                  <Input value={cultural.community || ""} onChange={(e) => setNested("cultural", "community", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Place of Birth</Label>
                  <Input value={cultural.place_of_birth || ""} onChange={(e) => setNested("cultural", "place_of_birth", e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="family" className="mt-4">
            <Card className="luxe-card rounded-[2rem] border-[#d9b978]/24">
              <CardHeader>
                <CardTitle>Family Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Family Type</Label>
                  <Input value={family.family_type || ""} onChange={(e) => setNested("family", "family_type", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Family Values</Label>
                  <Input value={family.family_values || ""} onChange={(e) => setNested("family", "family_values", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Father Occupation</Label>
                  <Input value={family.father_occupation || ""} onChange={(e) => setNested("family", "father_occupation", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mother Occupation</Label>
                  <Input value={family.mother_occupation || ""} onChange={(e) => setNested("family", "mother_occupation", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Brothers</Label>
                  <Input type="number" value={family.brothers || ""} onChange={(e) => setNested("family", "brothers", e.target.value ? Number(e.target.value) : null)} />
                </div>
                <div className="space-y-2">
                  <Label>Sisters</Label>
                  <Input type="number" value={family.sisters || ""} onChange={(e) => setNested("family", "sisters", e.target.value ? Number(e.target.value) : null)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="mt-4">
            <Card className="luxe-card rounded-[2rem] border-[#d9b978]/24">
              <CardHeader>
                <CardTitle>Partner Preferences</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Minimum Age</Label>
                  <Input
                    type="number"
                    value={partnerPreferences.min_age || ""}
                    onChange={(e) => setNested("partner", "min_age", e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Age</Label>
                  <Input
                    type="number"
                    value={partnerPreferences.max_age || ""}
                    onChange={(e) => setNested("partner", "max_age", e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Preferred Locations</Label>
                  <Textarea
                    value={(partnerPreferences.locations || []).join(", ")}
                    onChange={(e) => setNested("partner", "locations", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Preferred Communities</Label>
                  <Textarea
                    value={(partnerPreferences.communities || []).join(", ")}
                    onChange={(e) => setNested("partner", "communities", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
