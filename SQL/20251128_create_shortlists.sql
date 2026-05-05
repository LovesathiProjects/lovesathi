-- ============================================
-- SHORTLISTS TABLE FOR MATRIMONY
-- Allows matrimony users to bookmark profiles without swiping
-- ============================================

-- Enable UUID extension for primary keys (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE DEFINITION
-- ============================================
CREATE TABLE IF NOT EXISTS shortlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shortlisted_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT shortlists_user_target_unique UNIQUE (user_id, shortlisted_user_id)
);

CREATE INDEX IF NOT EXISTS idx_shortlists_user_id ON shortlists(user_id);
CREATE INDEX IF NOT EXISTS idx_shortlists_shortlisted_user_id ON shortlists(shortlisted_user_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_shortlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shortlists_timestamp
  BEFORE UPDATE ON shortlists
  FOR EACH ROW
  EXECUTE FUNCTION update_shortlists_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE shortlists ENABLE ROW LEVEL SECURITY;

-- Users can view their own shortlist entries
CREATE POLICY "Users can view their shortlist"
  ON shortlists FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert shortlist entries for themselves
CREATE POLICY "Users can insert their shortlist entries"
  ON shortlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete shortlist entries they created
CREATE POLICY "Users can delete their shortlist entries"
  ON shortlists FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- NOTES
-- ============================================
-- * Shortlisting is a matrimony-only feature.
-- * Add API helpers to insert/delete/select from this table via Supabase client.
