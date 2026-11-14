-- Run only in the isolated fixture database after the prepared migration.
DO $$ BEGIN
 IF has_function_privilege('anon','public.get_complete_matrimony_profile_full(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Anonymous profile RPC remains callable'; END IF;
 IF has_function_privilege('authenticated','public.get_complete_matrimony_profile_full(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Unsafe profile RPC remains callable'; END IF;
 IF has_function_privilege('anon','public.mark_message_seen(uuid,uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Anonymous receipt RPC remains callable'; END IF;
END $$;
SELECT 'PASS: unsafe routine grants removed';

SET ROLE authenticated;
SET request.jwt.claim.role='authenticated';
SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
DO $$ BEGIN
 IF (SELECT count(*) FROM public.user_profiles) <> 1 THEN RAISE EXCEPTION 'Private profile rows leaked'; END IF;
 IF (SELECT count(*) FROM public.id_verifications) <> 1 THEN RAISE EXCEPTION 'Verification document rows leaked'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.get_lovesathi_verification_statuses(ARRAY['22222222-2222-4222-8222-222222222222'::uuid]) WHERE verification_status='approved') THEN
   RAISE EXCEPTION 'Discovery badge lookup failed'; END IF;
 IF EXISTS(SELECT 1 FROM public.get_user_verification_status('22222222-2222-4222-8222-222222222222')) THEN
   RAISE EXCEPTION 'Existing verification helper bypassed owner RLS'; END IF;
END $$;
SELECT 'PASS: private rows isolated and status-only lookup preserved';

DO $$ BEGIN
 BEGIN
   UPDATE public.id_verifications SET verification_status='approved' WHERE user_id=auth.uid();
   RAISE EXCEPTION 'Member approval succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   INSERT INTO public.id_verifications(user_id,verification_status) VALUES(auth.uid(),'approved');
   RAISE EXCEPTION 'Approved member insert succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
UPDATE public.id_verifications SET verification_status='pending',document_file_url='fixture-replacement' WHERE user_id=auth.uid();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.id_verifications WHERE verified_at IS NOT NULL OR verified_by IS NOT NULL) THEN
   RAISE EXCEPTION 'Resubmission retained admin approval'; END IF;
END $$;
SELECT 'PASS: approval protected and member resubmission preserved';

DO $$ BEGIN
 BEGIN
   UPDATE public.matrimony_profile_full SET admin_review_status='approved' WHERE user_id=auth.uid();
   RAISE EXCEPTION 'Member changed moderation status';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
UPDATE public.matrimony_profile_full SET name='Fixture A edited' WHERE user_id=auth.uid();
SELECT 'PASS: moderation fields protected and ordinary edits preserved';

DO $$ BEGIN
 BEGIN
   UPDATE public.user_profiles SET date_of_birth=CURRENT_DATE-INTERVAL '17 years' WHERE user_id=auth.uid();
   RAISE EXCEPTION 'Underage DOB accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SELECT 'PASS: database enforces minimum age';

DELETE FROM storage.objects WHERE name='22222222-2222-4222-8222-222222222222/photo-b.jpg';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE name='22222222-2222-4222-8222-222222222222/photo-b.jpg') THEN
   RAISE EXCEPTION 'Another member photo deleted'; END IF;
 BEGIN
   INSERT INTO storage.objects(bucket_id,name) VALUES('matrimony-photos','22222222-2222-4222-8222-222222222222/forged.jpg');
   RAISE EXCEPTION 'Cross-member upload accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
INSERT INTO storage.objects(bucket_id,name) VALUES('matrimony-photos','11111111-1111-4111-8111-111111111111/new.jpg');
DELETE FROM storage.objects WHERE name='11111111-1111-4111-8111-111111111111/new.jpg';
SELECT 'PASS: photo writes limited to owner folder';

DO $$ BEGIN
 BEGIN
   UPDATE public.messages SET seen_at=now(),status='seen' WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
   RAISE EXCEPTION 'Sender forged recipient receipt';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   PERFORM public.mark_message_seen('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222');
   RAISE EXCEPTION 'Spoofed receipt RPC accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   INSERT INTO public.messages(match_id,sender_id,receiver_id,content,match_type)
   VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',auth.uid(),'33333333-3333-4333-8333-333333333333','Wrong recipient','matrimony');
   RAISE EXCEPTION 'Invalid recipient accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   INSERT INTO public.messages(match_id,sender_id,receiver_id,content,match_type)
   VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc',auth.uid(),'33333333-3333-4333-8333-333333333333','Inactive match','matrimony');
   RAISE EXCEPTION 'Inactive match accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
UPDATE public.messages SET deleted_by=ARRAY[auth.uid()::text] WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
INSERT INTO public.messages(match_id,sender_id,receiver_id,content,match_type)
VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',auth.uid(),'22222222-2222-4222-8222-222222222222','Valid fixture message','matrimony');
DO $$ BEGIN
 BEGIN
   INSERT INTO public.messages(match_id,sender_id,receiver_id,content,match_type,status,seen_at)
   VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',auth.uid(),'22222222-2222-4222-8222-222222222222','Forged initial receipt','matrimony','seen',now());
   RAISE EXCEPTION 'Forged initial receipt accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   INSERT INTO public.messages(match_id,sender_id,receiver_id,content,match_type,reply_to_message_id)
   VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',auth.uid(),'22222222-2222-4222-8222-222222222222','Invalid reply','matrimony','dddddddd-dddd-4ddd-8ddd-dddddddddddd');
   RAISE EXCEPTION 'Unknown reply accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT 'PASS: message participants, sender receipts and active matches checked';

SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
DO $$ BEGIN
 BEGIN
   UPDATE public.messages SET content='Forged content' WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
   RAISE EXCEPTION 'Recipient changed sender content';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   UPDATE public.messages SET deleted_by=ARRAY[auth.uid()::text] WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
   RAISE EXCEPTION 'Recipient removed other member visibility decision';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT (public.mark_message_seen('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',auth.uid())).id IS NOT NULL AS recipient_receipt_succeeded;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.messages WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND seen_at IS NOT NULL AND status='seen') THEN
   RAISE EXCEPTION 'Recipient acknowledgment failed'; END IF;
END $$;
SELECT 'PASS: content immutable and recipient acknowledgment preserved';

RESET ROLE;
RESET request.jwt.claim.role;
RESET request.jwt.claim.sub;
INSERT INTO public.blocked_users VALUES('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111');
SET ROLE authenticated;
SET request.jwt.claim.role='authenticated';
SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
DO $$ BEGIN
 BEGIN
   INSERT INTO public.messages(match_id,sender_id,receiver_id,content,match_type)
   VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',auth.uid(),'22222222-2222-4222-8222-222222222222','Blocked fixture message','matrimony');
   RAISE EXCEPTION 'Blocked conversation accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT 'PASS: reverse-direction block enforced';

RESET ROLE;
RESET request.jwt.claim.role;
RESET request.jwt.claim.sub;
SET ROLE anon;
DO $$ BEGIN
 BEGIN
   PERFORM public.get_lovesathi_verification_statuses(ARRAY['11111111-1111-4111-8111-111111111111'::uuid]);
   RAISE EXCEPTION 'Anonymous badge lookup accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'PASS: anonymous status lookup denied';
