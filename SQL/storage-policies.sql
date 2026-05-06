-- ============================================
-- STORAGE BUCKET POLICIES
-- Run these AFTER creating the buckets in Supabase Dashboard
-- ============================================

-- IMPORTANT: First create these buckets in Supabase Dashboard → Storage:
-- 1. Create bucket: "matrimony-photos" (Make it PUBLIC)
-- 2. Create bucket: "verification-documents" (Make it PRIVATE)
-- 3. Create bucket: "face-scans" (Make it PRIVATE)

-- Then run the policies below:

-- ⚠️ NOTE: If you get "policy already exists" errors, that means the policies
-- are already applied. You can safely ignore those errors or DROP the existing
-- policies first and recreate them.

-- ============================================
-- POLICIES FOR: matrimony-photos bucket
-- ============================================

DROP POLICY IF EXISTS "Users can upload own matrimony photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own matrimony photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own matrimony photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read matrimony photos" ON storage.objects;

CREATE POLICY "Users can upload own matrimony photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'matrimony-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own matrimony photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'matrimony-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own matrimony photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'matrimony-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can read matrimony photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'matrimony-photos');

-- ============================================
-- POLICIES FOR: verification-documents bucket
-- ============================================

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

-- Allow users to upload their own documents
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own documents
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update/delete their own documents
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- POLICIES FOR: face-scans bucket
-- ============================================

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Users can upload own face scans" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own face scans" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own face scans" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own face scans" ON storage.objects;

-- Allow users to upload their own face scans
CREATE POLICY "Users can upload own face scans"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'face-scans' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own face scans
CREATE POLICY "Users can read own face scans"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'face-scans' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update/delete their own face scans
CREATE POLICY "Users can update own face scans"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'face-scans' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own face scans"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'face-scans' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- DONE! ✅
-- ============================================
