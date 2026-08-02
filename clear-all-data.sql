-- ═══════════════════════════════════════════════════════
-- AgriConnect: Clear ALL Supabase user data
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Delete storage files (avatars)
DELETE FROM storage.objects WHERE bucket_id = 'avatars';

-- 2. Delete profile-related tables (if they exist)
DROP TABLE IF EXISTS public.profile_photos CASCADE;
DROP TABLE IF EXISTS public.photo_verifications CASCADE;

-- 3. Delete all data from profiles and users tables
DELETE FROM public.profiles;
DELETE FROM public.users;

-- 4. Verify clean
SELECT 'profiles' as tbl, COUNT(*) as remaining FROM public.profiles
UNION ALL
SELECT 'users', COUNT(*) FROM public.users
UNION ALL
SELECT 'avatars storage', COUNT(*) FROM storage.objects WHERE bucket_id = 'avatars';
