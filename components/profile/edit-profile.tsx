"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Plus, Save, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabaseClient"
import { uploadAsset, type MatrimonyProfileFull } from "@/lib/matrimonyService"
import { generateSmartBioSuggestions } from "@/lib/matrimonyBio"
import { useToast } from "@/hooks/use-toast"
import { calculateAgeFromDate, formatDateForDisplay } from "@/lib/age"
import { LocationCascadeSelect, LocationPreferencePicker } from "@/components/location/location-cascade-select"
import { formatLocationValue, parseLocationValue, type LocationValue } from "@/lib/location"
import {
  BODY_TYPE_OPTIONS,
  COMMUNITY_PREFERENCE_OPTIONS,
  DIET_OPTIONS,
  EDUCATION_OPTIONS,
  FAMILY_TYPE_OPTIONS,
  FAMILY_VALUES_OPTIONS,
  getCommunityOptionsForReligion,
  getSubCommunityOptions,
  MARITAL_STATUS_OPTIONS,
  MOTHER_TONGUE_OPTIONS,
  normalizeReligionOption,
  PROFESSION_OPTIONS,
  RELIGION_OPTIONS,
} from "@/lib/matrimonyOptions"
import { SearchableMultiSelect, SearchableSelect } from "@/components/ui/searchable-select"

interface EditProfileProps {
  onBack: () => void
  onSave?: () => void
  mode?: "matrimony"
}

type PhotoItem = { url: string; file?: File }

function SelectField({
  label,
  value,
  placeholder,
  options,
  onValueChange,
}: {
  label: string
  value?: string
  placeholder: string
  options: readonly string[]
  onValueChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function EditProfile({ onBack, onSave }: EditProfileProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("photos")
  const [profile, setProfile] = useState<MatrimonyProfileFull | null>(null)
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [gender, setGender] = useState("")
  const [createdBy, setCreatedBy] = useState("")
  const [bio, setBio] = useState("")
  const [personal, setPersonal] = useState<any>({})
  const [career, setCareer] = useState<any>({})
  const [family, setFamily] = useState<any>({})
  const [cultural, setCultural] = useState<any>({})
  const [partnerPreferences, setPartnerPreferences] = useState<any>({})
  const [customCommunityEntry, setCustomCommunityEntry] = useState(false)
  const [customSubCommunityEntry, setCustomSubCommunityEntry] = useState(false)
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
        const profileDob = typed.cultural?.date_of_birth || ""
        setDateOfBirth(profileDob)
        setAge(profileDob ? String(calculateAgeFromDate(profileDob) || typed.age || "") : typed.age ? String(typed.age) : "")
        setGender(typed.gender || "")
        setCreatedBy(typed.created_by || "")
        setBio(typed.bio || "")
        setPersonal(typed.personal || {})
        setCareer(typed.career || {})
        setFamily(typed.family || {})
        const culturalData = (typed.cultural as any) || {}
        setCultural({
          ...culturalData,
          religion: normalizeReligionOption(culturalData.religion),
        })
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

  function updateWorkLocation(location: LocationValue) {
    setCareer({
      ...career,
      work_location: {
        city: location.city || "",
        state: location.state || "",
        country: location.country || "",
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
        age: dateOfBirth ? calculateAgeFromDate(dateOfBirth) : age ? Number(age) : null,
        gender: gender || null,
        created_by: createdBy || null,
        photos: uploadedPhotoUrls,
        bio,
        personal,
        career,
        family,
        cultural: dateOfBirth ? { ...cultural, date_of_birth: dateOfBirth } : cultural,
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

  const communityOptions = getCommunityOptionsForReligion(cultural.religion)
  const communityValue = cultural.community || ""
  const shouldShowCustomCommunity = customCommunityEntry || Boolean(communityValue && !communityOptions.includes(communityValue))
  const communitySelectValue = shouldShowCustomCommunity ? "Other" : communityValue || undefined
  const subCommunityOptions = getSubCommunityOptions(cultural.religion, cultural.community)
  const subCommunityValue = cultural.sub_caste || ""
  const shouldShowCustomSubCommunity =
    customSubCommunityEntry || Boolean(subCommunityValue && !subCommunityOptions.includes(subCommunityValue))
  const subCommunitySelectValue = shouldShowCustomSubCommunity ? "Other" : subCommunityValue || undefined
  const partnerCommunityOptions = ["Any", ...COMMUNITY_PREFERENCE_OPTIONS]
  const selectedPartnerCommunities = Array.isArray(partnerPreferences.communities) ? partnerPreferences.communities : []
  const bioSuggestions = generateSmartBioSuggestions({ name, career, cultural, family, personal })

  return (
    <div className="luxe-light-page min-h-screen">
      <div className="sticky top-0 z-20 border-b border-[#482b1a]/10 bg-[#ffffff]/84 shadow-[0_18px_55px_rgba(24,17,13,0.08)] backdrop-blur-xl">
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
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-[1.5rem] border border-[#d8c79f]/24 bg-[#ffffff]/80 p-1 shadow-[0_14px_45px_rgba(24,17,13,0.08)]">
            <TabsTrigger value="photos" className="min-w-[6.5rem] rounded-[1.15rem]">Photos</TabsTrigger>
            <TabsTrigger value="basic" className="min-w-[6.5rem] rounded-[1.15rem]">Basic</TabsTrigger>
            <TabsTrigger value="career" className="min-w-[6.5rem] rounded-[1.15rem]">Career</TabsTrigger>
            <TabsTrigger value="family" className="min-w-[6.5rem] rounded-[1.15rem]">Family</TabsTrigger>
            <TabsTrigger value="preferences" className="min-w-[7.5rem] rounded-[1.15rem]">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="mt-4">
            <Card className="luxe-card rounded-[2rem] border-[#d8c79f]/24">
              <CardHeader>
                <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#18110d]">Photos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="space-y-2">
                      <div className="aspect-square overflow-hidden rounded-2xl border border-[#d8c79f]/24 bg-[#18110d] shadow-sm">
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
                      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#b79b62]/45 bg-[#ffffff]/68 text-[#685f58] transition hover:border-[#8f001c] hover:text-[#8f001c]"
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
            <Card className="luxe-card rounded-[2rem] border-[#d8c79f]/24">
              <CardHeader>
                <CardTitle>Basic Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{dateOfBirth ? "Verified Age" : "Age"}</Label>
                  {dateOfBirth ? (
                    <div className="rounded-2xl border border-[#b79b62]/24 bg-[#ffffff]/76 p-3">
                      <p className="font-bold text-[#18110d]">{age || "Not available"} years</p>
                      <p className="text-xs text-[#685f58]">Based on {formatDateForDisplay(dateOfBirth)}</p>
                    </div>
                  ) : (
                    <Input type="number" value={age} min={18} max={80} onChange={(e) => setAge(e.target.value)} />
                  )}
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
                <SelectField
                  label="Marital Status"
                  value={personal.marital_status || ""}
                  placeholder="Select marital status"
                  options={MARITAL_STATUS_OPTIONS}
                  onValueChange={(value) => setNested("personal", "marital_status", value)}
                />
                <SelectField
                  label="Diet"
                  value={personal.diet || ""}
                  placeholder="Select diet"
                  options={DIET_OPTIONS}
                  onValueChange={(value) => setNested("personal", "diet", value)}
                />
                <SelectField
                  label="Body Type"
                  value={personal.body_type || ""}
                  placeholder="Select body type"
                  options={BODY_TYPE_OPTIONS}
                  onValueChange={(value) => setNested("personal", "body_type", value)}
                />
              </CardContent>
            </Card>

            <Card className="luxe-card rounded-[2rem] border-[#d8c79f]/24">
              <CardHeader>
                <CardTitle>About Me</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 300))}
                  className="min-h-40 resize-none"
                  maxLength={300}
                  placeholder="Describe your personality, values, and what you are looking for in a life partner."
                />
                <div className="flex items-center justify-between text-xs text-[#685f58]">
                  <span>{bio.length > 0 && bio.length < 20 ? "At least 20 characters recommended" : "Keep it warm, sincere, and family-ready."}</span>
                  <span>{bio.length}/300</span>
                </div>
                <div className="rounded-[1.75rem] border border-[#d8c79f]/24 bg-[#ffffff]/78 p-4 shadow-[0_16px_45px_rgba(24,17,13,0.06)]">
                  <div className="mb-3 flex items-center gap-2 text-[#8f001c]">
                    <Sparkles className="h-4 w-4" />
                    <p className="luxe-kicker">smart bio from profile details</p>
                  </div>
                  <div className="grid gap-3">
                    {bioSuggestions.map((suggestion, index) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setBio(suggestion)}
                        className="rounded-2xl border border-[#482b1a]/10 bg-white/78 p-3 text-left text-sm leading-6 text-[#685f58] transition hover:border-[#8f001c]/30 hover:text-[#18110d]"
                      >
                        <span className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-[#8f001c]">
                          Option {index + 1}
                        </span>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="career" className="mt-4 space-y-4">
            <Card className="luxe-card rounded-[2rem] border-[#d8c79f]/24">
              <CardHeader>
                <CardTitle>Career & Cultural Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Highest Education"
                  value={career.highest_education || ""}
                  placeholder="Select education"
                  options={EDUCATION_OPTIONS}
                  onValueChange={(value) => setNested("career", "highest_education", value)}
                />
                <div className="space-y-2">
                  <Label>College</Label>
                  <Input value={career.college || ""} onChange={(e) => setNested("career", "college", e.target.value)} />
                </div>
                <SelectField
                  label="Job Title"
                  value={career.job_title || ""}
                  placeholder="Select profession"
                  options={PROFESSION_OPTIONS}
                  onValueChange={(value) => setNested("career", "job_title", value)}
                />
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input value={career.company || ""} onChange={(e) => setNested("career", "company", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Annual Income</Label>
                  <Input value={career.annual_income || ""} onChange={(e) => setNested("career", "annual_income", e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <LocationCascadeSelect
                    value={career.work_location || {}}
                    onChange={updateWorkLocation}
                    countryLabel="Work Country"
                    stateLabel="Work State"
                    cityLabel="Work City"
                  />
                </div>
                <SelectField
                  label="Religion"
                  value={cultural.religion || ""}
                  placeholder="Select religion"
                  options={RELIGION_OPTIONS}
                  onValueChange={(value) => {
                    setCustomCommunityEntry(false)
                    setCultural({
                      ...cultural,
                      religion: value,
                      community: "",
                      sub_caste: "",
                    })
                  }}
                />
                <SelectField
                  label="Mother Tongue"
                  value={cultural.mother_tongue || ""}
                  placeholder="Select mother tongue"
                  options={MOTHER_TONGUE_OPTIONS}
                  onValueChange={(value) => setNested("cultural", "mother_tongue", value)}
                />
                <div className="space-y-2">
                  <Label>Community / Caste / Denomination</Label>
                  <SearchableSelect
                    value={communitySelectValue}
                    onValueChange={(value) => {
                      if (value === "Other") {
                        setCustomCommunityEntry(true)
                        setNested("cultural", "community", "")
                        setNested("cultural", "sub_caste", "")
                        return
                      }

                      setCustomCommunityEntry(false)
                      setNested("cultural", "community", value)
                      setNested("cultural", "sub_caste", "")
                      setCustomSubCommunityEntry(false)
                    }}
                    disabled={!cultural.religion}
                    options={communityOptions.map((option) => ({ value: option, label: option }))}
                    placeholder={cultural.religion ? "Select community" : "Select religion first"}
                    searchPlaceholder="Search community, caste, or denomination..."
                    emptyMessage="No community found."
                  />
                  {shouldShowCustomCommunity && (
                    <Input
                      value={communityValue}
                      onChange={(event) => {
                        setCustomCommunityEntry(true)
                        setNested("cultural", "community", event.target.value)
                      }}
                      placeholder="Enter community, caste, or denomination"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Sub-caste / sub-community</Label>
                  <SearchableSelect
                    value={subCommunitySelectValue}
                    onValueChange={(value) => {
                      if (value === "Other") {
                        setCustomSubCommunityEntry(true)
                        setNested("cultural", "sub_caste", "")
                        return
                      }

                      setCustomSubCommunityEntry(false)
                      setNested("cultural", "sub_caste", value)
                    }}
                    disabled={!cultural.community}
                    options={subCommunityOptions.map((option) => ({ value: option, label: option }))}
                    placeholder={cultural.community ? "Select sub-community" : "Select community first"}
                    searchPlaceholder="Search sub-caste or sub-community..."
                    emptyMessage="No sub-community found."
                  />
                  {shouldShowCustomSubCommunity && (
                    <Input
                      value={subCommunityValue}
                      onChange={(event) => {
                        setCustomSubCommunityEntry(true)
                        setNested("cultural", "sub_caste", event.target.value)
                      }}
                      placeholder="Enter sub-caste or sub-community"
                    />
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <LocationCascadeSelect
                    value={parseLocationValue(cultural.place_of_birth || "")}
                    onChange={(location) => setNested("cultural", "place_of_birth", formatLocationValue(location))}
                    countryLabel="Birth Country"
                    stateLabel="Birth State"
                    cityLabel="Birth City"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="family" className="mt-4">
            <Card className="luxe-card rounded-[2rem] border-[#d8c79f]/24">
              <CardHeader>
                <CardTitle>Family Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Family Type"
                  value={family.family_type || ""}
                  placeholder="Select family type"
                  options={FAMILY_TYPE_OPTIONS}
                  onValueChange={(value) => setNested("family", "family_type", value)}
                />
                <SelectField
                  label="Family Values"
                  value={family.family_values || ""}
                  placeholder="Select family values"
                  options={FAMILY_VALUES_OPTIONS}
                  onValueChange={(value) => setNested("family", "family_values", value)}
                />
                <SelectField
                  label="Father Occupation"
                  value={family.father_occupation || ""}
                  placeholder="Select occupation"
                  options={PROFESSION_OPTIONS}
                  onValueChange={(value) => setNested("family", "father_occupation", value)}
                />
                <SelectField
                  label="Mother Occupation"
                  value={family.mother_occupation || ""}
                  placeholder="Select occupation"
                  options={PROFESSION_OPTIONS}
                  onValueChange={(value) => setNested("family", "mother_occupation", value)}
                />
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
            <Card className="luxe-card rounded-[2rem] border-[#d8c79f]/24">
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
                <div className="sm:col-span-2">
                  <LocationPreferencePicker
                    value={partnerPreferences.locations || []}
                    onChange={(locations) => setNested("partner", "locations", locations)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Preferred Communities</Label>
                  <SearchableMultiSelect
                    values={selectedPartnerCommunities}
                    onValuesChange={(communities) => setNested("partner", "communities", communities)}
                    options={partnerCommunityOptions.map((community) => ({ value: community, label: community }))}
                    placeholder="Select preferred communities"
                    searchPlaceholder="Search community, caste, or denomination..."
                    emptyMessage="No community found."
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
