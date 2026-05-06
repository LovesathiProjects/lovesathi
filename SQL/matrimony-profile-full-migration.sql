-- ============================================
-- MATRIMONY PROFILE FULL - CONSOLIDATED TABLE MIGRATION
-- This migration creates a single consolidated table for all matrimony profile data
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE MATRIMONY_PROFILE_FULL TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS matrimony_profile_full (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Step 1: Basic Information
  name VARCHAR(100) NOT NULL,
  age INTEGER CHECK (age >= 18 AND age <= 80),
  gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
  created_by VARCHAR(20) CHECK (created_by IN ('Self', 'Parent', 'Sibling', 'Other')),
  
  -- Photos (JSONB array of photo URLs)
  photos JSONB DEFAULT '[]'::jsonb, -- Array of photo URLs (e.g., ["https://...", "https://..."])
  
  -- Step 2: Personal & Physical Details (JSONB)
  personal JSONB DEFAULT '{}'::jsonb, -- { height_cm, height_unit, complexion, body_type, diet, smoker, drinker, marital_status }
  
  -- Step 3: Career & Education (JSONB)
  career JSONB DEFAULT '{}'::jsonb, -- { highest_education, college, job_title, company, annual_income, work_location: { city, state, country } }
  
  -- Step 4: Family Information (JSONB)
  family JSONB DEFAULT '{}'::jsonb, -- { family_type, family_values, father_occupation, father_company, mother_occupation, mother_company, brothers, sisters, siblings_married, show_on_profile }
  
  -- Step 5: Cultural & Religious Details (JSONB)
  cultural JSONB DEFAULT '{}'::jsonb, -- { religion, mother_tongue, community, sub_caste, date_of_birth, time_of_birth, place_of_birth, star_raashi, gotra }
  
  -- Step 6: Bio
  bio TEXT CHECK (bio IS NULL OR (LENGTH(bio) >= 20 AND LENGTH(bio) <= 300)),
  
  -- Step 7: Partner Preferences (JSONB)
  partner_preferences JSONB DEFAULT '{}'::jsonb, -- { min_age, max_age, min_height_cm, max_height_cm, diet_prefs: [], lifestyle_prefs: [], education_prefs: [], profession_prefs: [], locations: [], communities: [], family_type_prefs: [] }
  
  -- Profile completion tracking
  step1_completed BOOLEAN DEFAULT FALSE,
  step2_completed BOOLEAN DEFAULT FALSE,
  step3_completed BOOLEAN DEFAULT FALSE,
  step4_completed BOOLEAN DEFAULT FALSE,
  step5_completed BOOLEAN DEFAULT FALSE,
  step6_completed BOOLEAN DEFAULT FALSE,
  step7_completed BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Constraints
  CONSTRAINT unique_matrimony_profile_full_user UNIQUE (user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_matrimony_profile_full_user_id ON matrimony_profile_full(user_id);
CREATE INDEX idx_matrimony_profile_full_gender ON matrimony_profile_full(gender);
CREATE INDEX idx_matrimony_profile_full_age ON matrimony_profile_full(age);
CREATE INDEX idx_matrimony_profile_full_completed ON matrimony_profile_full(profile_completed);
CREATE INDEX idx_matrimony_profile_full_photos ON matrimony_profile_full USING GIN (photos);
CREATE INDEX idx_matrimony_profile_full_personal ON matrimony_profile_full USING GIN (personal);
CREATE INDEX idx_matrimony_profile_full_career ON matrimony_profile_full USING GIN (career);
CREATE INDEX idx_matrimony_profile_full_family ON matrimony_profile_full USING GIN (family);
CREATE INDEX idx_matrimony_profile_full_cultural ON matrimony_profile_full USING GIN (cultural);
CREATE INDEX idx_matrimony_profile_full_preferences ON matrimony_profile_full USING GIN (partner_preferences);

-- ============================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_matrimony_profile_full_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_matrimony_profile_full_timestamp
  BEFORE UPDATE ON matrimony_profile_full
  FOR EACH ROW
  EXECUTE FUNCTION update_matrimony_profile_full_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE matrimony_profile_full ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own matrimony profile full"
  ON matrimony_profile_full FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated members can discover completed profiles from other users.
-- The app only selects public-facing profile fields for discovery/profile views.
CREATE POLICY "Authenticated users can view completed matrimony profiles"
  ON matrimony_profile_full FOR SELECT
  TO authenticated
  USING (profile_completed = TRUE);

-- Users can insert their own profile
CREATE POLICY "Users can insert own matrimony profile full"
  ON matrimony_profile_full FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own matrimony profile full"
  ON matrimony_profile_full FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own matrimony profile full"
  ON matrimony_profile_full FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get complete matrimony profile
CREATE OR REPLACE FUNCTION get_complete_matrimony_profile_full(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT row_to_json(mp.*) INTO result
  FROM matrimony_profile_full mp
  WHERE mp.user_id = p_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check profile completion status
CREATE OR REPLACE FUNCTION get_matrimony_profile_completion_full(p_user_id UUID)
RETURNS TABLE(
  has_profile BOOLEAN,
  step1_completed BOOLEAN,
  step2_completed BOOLEAN,
  step3_completed BOOLEAN,
  step4_completed BOOLEAN,
  step5_completed BOOLEAN,
  step6_completed BOOLEAN,
  step7_completed BOOLEAN,
  profile_completed BOOLEAN,
  completion_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXISTS(SELECT 1 FROM matrimony_profile_full WHERE user_id = p_user_id) AS has_profile,
    COALESCE(mp.step1_completed, FALSE) AS step1_completed,
    COALESCE(mp.step2_completed, FALSE) AS step2_completed,
    COALESCE(mp.step3_completed, FALSE) AS step3_completed,
    COALESCE(mp.step4_completed, FALSE) AS step4_completed,
    COALESCE(mp.step5_completed, FALSE) AS step5_completed,
    COALESCE(mp.step6_completed, FALSE) AS step6_completed,
    COALESCE(mp.step7_completed, FALSE) AS step7_completed,
    COALESCE(mp.profile_completed, FALSE) AS profile_completed,
    CASE
      WHEN mp.profile_completed THEN 100
      WHEN mp.step7_completed THEN 95
      WHEN mp.step6_completed THEN 85
      WHEN mp.step5_completed THEN 71
      WHEN mp.step4_completed THEN 57
      WHEN mp.step3_completed THEN 43
      WHEN mp.step2_completed THEN 29
      WHEN mp.step1_completed THEN 14
      ELSE 0
    END AS completion_percentage
  FROM matrimony_profile_full mp
  WHERE mp.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MIGRATION NOTES
-- ============================================
-- After running this migration and verifying everything works:
-- 1. Test all insert/update/select operations
-- 2. Once confirmed working, you can drop the old tables:
--    DROP TABLE IF EXISTS matrimony_preference_details;
--    DROP TABLE IF EXISTS matrimony_partner_preferences;
--    DROP TABLE IF EXISTS matrimony_bio;
--    DROP TABLE IF EXISTS matrimony_cultural_details;
--    DROP TABLE IF EXISTS matrimony_family_info;
--    DROP TABLE IF EXISTS matrimony_career_education;
--    DROP TABLE IF EXISTS matrimony_personal_details;
--    DROP TABLE IF EXISTS matrimony_photos;
--    DROP TABLE IF EXISTS matrimony_profiles;
-- 3. Drop old helper functions if they exist:
--    DROP FUNCTION IF EXISTS get_complete_matrimony_profile(UUID);
--    DROP FUNCTION IF EXISTS get_matrimony_profile_completion(UUID);
