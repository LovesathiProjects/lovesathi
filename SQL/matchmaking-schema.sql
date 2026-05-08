-- ============================================
-- LOVESATHI MATRIMONY MATCHMAKING SCHEMA
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS matrimony_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(10) NOT NULL CHECK (action IN ('like', 'pass', 'connect', 'super_like')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  CONSTRAINT unique_matrimony_like UNIQUE (liker_id, liked_id),
  CONSTRAINT no_self_like_matrimony CHECK (liker_id != liked_id)
);

CREATE INDEX IF NOT EXISTS idx_matrimony_likes_liker ON matrimony_likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_matrimony_likes_liked ON matrimony_likes(liked_id);
CREATE INDEX IF NOT EXISTS idx_matrimony_likes_action ON matrimony_likes(action);

CREATE TABLE IF NOT EXISTS matrimony_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT unique_matrimony_match UNIQUE (user1_id, user2_id),
  CONSTRAINT no_self_match_matrimony CHECK (user1_id != user2_id),
  CONSTRAINT ordered_match_matrimony CHECK (user1_id < user2_id)
);

CREATE INDEX IF NOT EXISTS idx_matrimony_matches_user1 ON matrimony_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matrimony_matches_user2 ON matrimony_matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_matrimony_matches_active ON matrimony_matches(is_active);

CREATE OR REPLACE FUNCTION create_matrimony_match()
RETURNS TRIGGER AS $$
DECLARE
  mutual_like_exists BOOLEAN;
BEGIN
  IF NEW.action IN ('like', 'connect', 'super_like') THEN
    SELECT EXISTS(
      SELECT 1
      FROM matrimony_likes
      WHERE liker_id = NEW.liked_id
        AND liked_id = NEW.liker_id
        AND action IN ('like', 'connect', 'super_like')
    ) INTO mutual_like_exists;

    IF mutual_like_exists THEN
      INSERT INTO matrimony_matches (user1_id, user2_id)
      VALUES (
        LEAST(NEW.liker_id, NEW.liked_id),
        GREATEST(NEW.liker_id, NEW.liked_id)
      )
      ON CONFLICT (user1_id, user2_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_matrimony_match ON matrimony_likes;
CREATE TRIGGER trigger_matrimony_match
  AFTER INSERT ON matrimony_likes
  FOR EACH ROW
  EXECUTE FUNCTION create_matrimony_match();

DROP TRIGGER IF EXISTS trigger_matrimony_match_update ON matrimony_likes;
CREATE TRIGGER trigger_matrimony_match_update
  AFTER UPDATE ON matrimony_likes
  FOR EACH ROW
  WHEN (OLD.action != NEW.action AND NEW.action IN ('like', 'connect', 'super_like'))
  EXECUTE FUNCTION create_matrimony_match();

ALTER TABLE matrimony_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrimony_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own likes" ON matrimony_likes;
DROP POLICY IF EXISTS "Users can insert own likes" ON matrimony_likes;
DROP POLICY IF EXISTS "Users can update own likes" ON matrimony_likes;
DROP POLICY IF EXISTS "Users can view own matches" ON matrimony_matches;
DROP POLICY IF EXISTS "Users can insert own matches" ON matrimony_matches;

CREATE POLICY "Users can view own likes"
  ON matrimony_likes FOR SELECT
  USING (auth.uid() = liker_id OR auth.uid() = liked_id);

CREATE POLICY "Users can insert own likes"
  ON matrimony_likes FOR INSERT
  WITH CHECK (auth.uid() = liker_id);

CREATE POLICY "Users can update own likes"
  ON matrimony_likes FOR UPDATE
  USING (auth.uid() = liker_id)
  WITH CHECK (auth.uid() = liker_id);

CREATE POLICY "Users can view own matches"
  ON matrimony_matches FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can insert own matches"
  ON matrimony_matches FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
