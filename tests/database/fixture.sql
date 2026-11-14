-- Synthetic, isolated test schema. Never run against a Supabase project.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.role', true), '');
$$;
GRANT USAGE ON SCHEMA auth, storage, public TO anon, authenticated, service_role;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
INSERT INTO auth.users VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');
CREATE TABLE public.matrimony_matches(id uuid PRIMARY KEY, user1_id uuid, user2_id uuid, is_active boolean DEFAULT true);
INSERT INTO public.matrimony_matches VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',true),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',false);
CREATE TABLE public.blocked_users(blocker_id uuid, blocked_id uuid);
CREATE TABLE public.user_profiles(id uuid DEFAULT gen_random_uuid(), user_id uuid UNIQUE, date_of_birth date, phone text,
 CONSTRAINT valid_age CHECK(date_of_birth <= CURRENT_DATE - INTERVAL '17 years'));
CREATE TABLE public.id_verifications(id uuid DEFAULT gen_random_uuid(), user_id uuid UNIQUE,
 document_file_url text, verification_status varchar DEFAULT 'pending', verification_notes text,
 verified_at timestamptz, verified_by uuid);
CREATE TABLE public.matrimony_profile_full(user_id uuid, name text, family jsonb,
 admin_review_status text DEFAULT 'pending',admin_reviewed_at timestamptz,admin_reviewed_by uuid,
 admin_review_notes text,is_seeded_profile boolean DEFAULT false);
INSERT INTO public.matrimony_profile_full(user_id,name) VALUES('11111111-1111-4111-8111-111111111111','Fixture A');
CREATE FUNCTION public.get_complete_matrimony_profile_full(p_user_id uuid) RETURNS json
LANGUAGE sql SECURITY DEFINER AS $$ SELECT row_to_json(p.*) FROM public.matrimony_profile_full p WHERE user_id=p_user_id; $$;
CREATE FUNCTION public.get_user_verification_status(p_user_id uuid)
RETURNS TABLE(user_id uuid, verification_status varchar) LANGUAGE sql SECURITY DEFINER AS $$
 SELECT v.user_id,v.verification_status FROM public.id_verifications v WHERE v.user_id=p_user_id;
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

\ir ../../SQL/messages-schema.sql
CREATE POLICY "Users can insert own messages" ON public.messages FOR INSERT WITH CHECK(auth.uid()=sender_id);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING(auth.uid()=user_id);
CREATE POLICY "Users can view user profiles for discovery" ON public.user_profiles FOR SELECT USING(auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING(auth.uid()=user_id);
ALTER TABLE public.id_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own verification" ON public.id_verifications FOR SELECT USING(auth.uid()=user_id);
CREATE POLICY "Users can view verification status for discovery" ON public.id_verifications FOR SELECT USING(auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert own verification" ON public.id_verifications FOR INSERT WITH CHECK(auth.uid()=user_id);
CREATE POLICY "Users can update own verification" ON public.id_verifications FOR UPDATE USING(auth.uid()=user_id);

CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(), bucket_id text, name text);
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
 SELECT (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1];
$$;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Delete 1ywduga_0" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='matrimony-photos');
CREATE POLICY "Upload 1ywduga_0" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='matrimony-photos');
CREATE POLICY "View 1ywduga_0" ON storage.objects FOR SELECT USING(bucket_id='matrimony-photos');
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, storage TO anon, authenticated, service_role;

INSERT INTO public.user_profiles(user_id,date_of_birth,phone) VALUES
 ('11111111-1111-4111-8111-111111111111',CURRENT_DATE-INTERVAL '25 years','fixture-phone-a'),
 ('22222222-2222-4222-8222-222222222222',CURRENT_DATE-INTERVAL '25 years','fixture-phone-b'),
 ('33333333-3333-4333-8333-333333333333',CURRENT_DATE-INTERVAL '17 years','fixture-phone-c');
INSERT INTO public.id_verifications(user_id,document_file_url,verification_status,verified_at,verified_by) VALUES
 ('11111111-1111-4111-8111-111111111111','fixture-document-a','approved',now(),'22222222-2222-4222-8222-222222222222'),
 ('22222222-2222-4222-8222-222222222222','fixture-document-b','approved',now(),'22222222-2222-4222-8222-222222222222');
INSERT INTO public.messages(id,match_id,sender_id,receiver_id,content,match_type) VALUES
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Hello fixture member','matrimony');
INSERT INTO storage.objects(bucket_id,name) VALUES
 ('matrimony-photos','11111111-1111-4111-8111-111111111111/photo-a.jpg'),
 ('matrimony-photos','22222222-2222-4222-8222-222222222222/photo-b.jpg');
