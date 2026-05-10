import { z } from "zod"
export const welcomeIdentitySchema = z.object({
  name: z.string().min(2, "Name is too short"),
  age: z.number({ invalid_type_error: "Enter a valid age" }).int().min(18).max(80),
  gender: z.enum(["Male", "Female", "Other"], { required_error: "Select gender" }),
  createdBy: z.enum(["Self", "Parent", "Sibling", "Other"], { required_error: "Select who created the profile" }),
  photo: z.any().optional(),
  photoUrls: z.array(z.string().url()).min(2).max(6).optional(),
})

export const personalPhysicalSchema = z.object({
  heightCm: z.number().min(90).max(250),
  complexion: z.enum(["Fair", "Wheatish", "Dusky", "Dark"]).optional(),
  bodyType: z.enum(["Slim", "Athletic", "Average", "Plus-size"]).optional(),
  diet: z.enum(["Vegetarian", "Eggetarian", "Non-vegetarian", "Pescatarian", "Vegan", "Jain", "Other"]).optional(),
  smoker: z.boolean().optional(),
  drinker: z.boolean().optional(),
  maritalStatus: z.enum(["Never Married", "Divorced", "Widowed", "Annulled", "Separated"]),
})

export const careerEducationSchema = z.object({
  highestEducation: z.string().min(2),
  college: z.string().optional(),
  jobTitle: z.string().min(2),
  company: z.string().optional(),
  annualIncome: z.string().min(1),
  workLocation: z.object({ city: z.string().optional(), state: z.string().optional(), country: z.string().optional() }),
})

export const familySchema = z.object({
  familyType: z.enum(["Joint", "Nuclear", "Extended", "Single Parent"]).optional(),
  familyValues: z.enum(["Traditional", "Moderate", "Modern", "Progressive"]).optional(),
  fatherOccupation: z.string().optional(),
  motherOccupation: z.string().optional(),
  brothers: z.number().int().min(0).max(10).optional(),
  sisters: z.number().int().min(0).max(10).optional(),
  siblingsMarried: z.enum(["None", "Some", "All", "Mostly Married", "Mostly Single"]).optional(),
  showOnProfile: z.boolean().optional(),
})

export const culturalAstroSchema = z.object({
  religion: z.string().min(1),
  motherTongue: z.string().min(1),
  community: z.string().min(1),
  subCaste: z.string().optional(),
  dob: z.string().min(1),
  tob: z.string().min(1),
  pob: z.string().min(1),
  star: z.string().optional(),
  gotra: z.string().optional(),
})

export const bioSchema = z.object({
  bio: z
    .string()
    .min(20, "Bio must be at least 20 characters")
    .max(300, "Bio can be at most 300 characters"),
})

export const partnerPreferencesSchema = z.object({
  ageRange: z.tuple([z.number().int().min(18), z.number().int().max(80)]),
  heightRangeCm: z.tuple([z.number().min(90), z.number().max(250)]),
  dietPrefs: z.array(z.string()).optional(),
  lifestylePrefs: z.array(z.string()).optional(),
  educationPrefs: z.array(z.string()).optional(),
  professionPrefs: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  communities: z.array(z.string()).optional(),
  familyTypePrefs: z.array(z.string()).optional(),
  maritalStatusPrefs: z.array(z.string()).optional(),
  incomePrefs: z.array(z.string()).optional(),
  manglikPrefs: z.array(z.string()).optional(),
  profileCreatedByPrefs: z.array(z.string()).optional(),
})

export const verificationSchema = z.object({
  selfieUrl: z.string().url().optional(),
  idDocUrl: z.string().url().optional(),
})

export const fullMatrimonySchema = z.object({
  welcome: welcomeIdentitySchema,
  personal: personalPhysicalSchema,
  career: careerEducationSchema,
  family: familySchema,
  cultural: culturalAstroSchema,
  bio: bioSchema,
  preferences: partnerPreferencesSchema,
  verification: verificationSchema,
})
