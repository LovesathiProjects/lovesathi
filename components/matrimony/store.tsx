"use client"

import React from "react"
import { calculateAgeFromDate } from "@/lib/age"
import { supabase } from "@/lib/supabaseClient"

export type Gender = "Male" | "Female" | "Other"
export type CreatedBy = "Self" | "Parent" | "Sibling" | "Other"

export interface WelcomeIdentityState {
  name: string
  age?: number
  gender?: Gender
  createdBy?: CreatedBy
  photoUrl?: string
  photoUrls?: string[]
}

export interface PersonalPhysicalState {
  heightCm?: number
  heightUnit?: "cm" | "ftin"
  complexion?: "Fair" | "Wheatish" | "Dusky" | "Dark"
  bodyType?: "Slim" | "Athletic" | "Average" | "Plus-size"
  diet?: "Vegetarian" | "Non-vegetarian" | "Eggetarian" | "Pescatarian" | "Vegan" | "Jain" | "Other"
  smoker?: boolean
  drinker?: boolean
  maritalStatus?: "Never Married" | "Divorced" | "Widowed" | "Annulled" | "Separated"
}

export interface CareerEducationState {
  highestEducation?: string
  college?: string
  jobTitle?: string
  company?: string
  annualIncome?: string
  workLocation?: { city?: string; state?: string; country?: string }
}

export interface FamilyState {
  familyType?: "Joint" | "Nuclear" | "Extended" | "Single Parent"
  familyValues?: "Traditional" | "Moderate" | "Modern" | "Progressive"
  fatherOccupation?: string
  motherOccupation?: string
  brothers?: number
  sisters?: number
  siblingsMarried?: "None" | "Some" | "All" | "Mostly Married" | "Mostly Single"
  showOnProfile?: boolean
}

export interface CulturalAstroState {
  religion?: string
  motherTongue?: string
  community?: string
  subCaste?: string
  dob?: string
  tob?: string
  pob?: string
  star?: string
  gotra?: string
}

export interface BioState { bio?: string }

export interface PartnerPreferencesState {
  ageRange?: [number, number]
  heightRangeCm?: [number, number]
  dietPrefs?: string[]
  lifestylePrefs?: string[]
  educationPrefs?: string[]
  professionPrefs?: string[]
  locations?: string[]
  communities?: string[]
  familyTypePrefs?: string[]
  maritalStatusPrefs?: string[]
  incomePrefs?: string[]
  manglikPrefs?: string[]
  profileCreatedByPrefs?: string[]
}

export interface VerificationState {
  selfieUrl?: string
  idDocUrl?: string
}

export interface MatrimonySetupState {
  welcome: WelcomeIdentityState
  personal: PersonalPhysicalState
  career: CareerEducationState
  family: FamilyState
  cultural: CulturalAstroState
  bio: BioState
  preferences: PartnerPreferencesState
  verification: VerificationState
  setPartial: (section: keyof Omit<MatrimonySetupState, "setPartial">, data: any) => void
  reset: () => void
}

const initialState: Omit<MatrimonySetupState, "setPartial" | "reset"> = {
  welcome: { name: "" },
  personal: {},
  career: {},
  family: { showOnProfile: false },
  cultural: {},
  bio: {},
  preferences: {},
  verification: {},
}

const MatrimonySetupContext = React.createContext<MatrimonySetupState | null>(null)

function mapProfileToSetupState(profile: any): Omit<MatrimonySetupState, "setPartial" | "reset"> {
  const cultural = profile?.cultural || {}
  const personal = profile?.personal || {}
  const career = profile?.career || {}
  const family = profile?.family || {}
  const preferences = profile?.partner_preferences || {}
  const dob = cultural.date_of_birth || ""

  return {
    welcome: {
      name: profile?.name || "",
      age: dob ? calculateAgeFromDate(dob) || profile?.age || undefined : profile?.age || undefined,
      gender: profile?.gender || undefined,
      createdBy: profile?.created_by || undefined,
      photoUrls: Array.isArray(profile?.photos) ? profile.photos : [],
    },
    personal: {
      heightCm: personal.height_cm,
      heightUnit: personal.height_unit || "cm",
      complexion: personal.complexion,
      bodyType: personal.body_type,
      diet: personal.diet,
      smoker: personal.smoker,
      drinker: personal.drinker,
      maritalStatus: personal.marital_status,
    },
    career: {
      highestEducation: career.highest_education,
      college: career.college,
      jobTitle: career.job_title,
      company: career.company,
      annualIncome: career.annual_income,
      workLocation: career.work_location || { city: "", state: "", country: "" },
    },
    family: {
      familyType: family.family_type,
      familyValues: family.family_values,
      fatherOccupation: family.father_occupation,
      motherOccupation: family.mother_occupation,
      brothers: family.brothers,
      sisters: family.sisters,
      siblingsMarried: family.siblings_married,
      showOnProfile: family.show_on_profile ?? false,
    },
    cultural: {
      religion: cultural.religion,
      motherTongue: cultural.mother_tongue,
      community: cultural.community,
      subCaste: cultural.sub_caste,
      dob,
      tob: cultural.time_of_birth,
      pob: cultural.place_of_birth,
      star: cultural.star_raashi,
      gotra: cultural.gotra,
    },
    bio: { bio: profile?.bio || "" },
    preferences: {
      ageRange:
        typeof preferences.min_age === "number" && typeof preferences.max_age === "number"
          ? ([preferences.min_age, preferences.max_age] as [number, number])
          : undefined,
      heightRangeCm:
        typeof preferences.min_height_cm === "number" && typeof preferences.max_height_cm === "number"
          ? ([preferences.min_height_cm, preferences.max_height_cm] as [number, number])
          : undefined,
      dietPrefs: preferences.diet_prefs || [],
      lifestylePrefs: preferences.lifestyle_prefs || [],
      educationPrefs: preferences.education_prefs || [],
      professionPrefs: preferences.profession_prefs || [],
      locations: preferences.locations || [],
      communities: preferences.communities || [],
      familyTypePrefs: preferences.family_type_prefs || [],
      maritalStatusPrefs: preferences.marital_status_prefs || [],
      incomePrefs: preferences.income_prefs || [],
      manglikPrefs: preferences.manglik_prefs || [],
      profileCreatedByPrefs: preferences.profile_created_by_prefs || [],
    },
    verification: {},
  }
}

export function MatrimonySetupProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<Omit<MatrimonySetupState, "setPartial" | "reset">>({ ...initialState })
  const [hydrating, setHydrating] = React.useState(true)

  React.useEffect(() => {
    let mounted = true

    async function hydrateSavedProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data, error } = await supabase
          .from("matrimony_profile_full")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (!mounted) return
        if (error) {
          console.warn("[MatrimonySetupProvider] Unable to hydrate saved profile:", error.message)
          return
        }
        if (data) setState(mapProfileToSetupState(data))
      } finally {
        if (mounted) setHydrating(false)
      }
    }

    void hydrateSavedProfile()

    return () => {
      mounted = false
    }
  }, [])

  const setPartial: MatrimonySetupState["setPartial"] = (section, data) => {
    setState((prev) => ({ ...prev, [section]: { ...(prev as any)[section], ...data } }))
  }

  const reset = () => setState({ ...initialState })

  const value: MatrimonySetupState = {
    ...state,
    setPartial,
    reset,
  }

  if (hydrating) {
    return (
      <div className="flex min-h-[26rem] items-center justify-center">
        <div className="rounded-[2rem] border border-[#C2A574]/24 bg-white/80 p-7 text-center shadow-[0_20px_70px_rgba(24,17,13,0.08)]">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#C2A574] border-t-transparent" />
          <p className="mt-4 font-semibold text-[#3A2B24]">Restoring your saved profile details...</p>
        </div>
      </div>
    )
  }

  return <MatrimonySetupContext.Provider value={value}>{children}</MatrimonySetupContext.Provider>
}

export function useMatrimonySetupStore() {
  const ctx = React.useContext(MatrimonySetupContext)
  if (!ctx) throw new Error("useMatrimonySetupStore must be used within MatrimonySetupProvider")
  return ctx
}
