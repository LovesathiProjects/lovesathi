export interface MatrimonyProfile {
  id: string
  publicProfileId?: string
  name: string
  age: number
  gender?: string
  education?: string
  profession: string
  location: string
  community?: string
  religion?: string
  photos: string[]
  bio?: string
  interests?: string[]
  verified?: boolean
  premium?: boolean
  visibilityLabel?: string
  height?: string
  maritalStatus?: string
  income?: string
  createdBy?: string
  hasRealPhotos?: boolean
  personal?: Record<string, any>
  career?: Record<string, any>
  cultural?: Record<string, any>
  family?: Record<string, any>
  partnerPreferences?: Record<string, any>
  phoneMasked?: string
  phone?: string
  canRevealPhone?: boolean
}

export const MOCK_MATRIMONY_PROFILES: MatrimonyProfile[] = []
