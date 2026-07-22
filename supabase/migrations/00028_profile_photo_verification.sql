-- ============================================================
-- KrishiConnect Nepal — Mandatory Profile Photo Verification
-- Migration 00028: Photo tracking, trust badge, storage config
-- ============================================================

-- ============================================
-- 1. PROFILE PHOTO TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profile_photos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    photo_url       TEXT NOT NULL,
    thumbnail_url   TEXT,
    file_name       TEXT NOT NULL,
    file_size_bytes BIGINT,
    file_type       TEXT NOT NULL CHECK (file_type IN ('image/jpeg','image/png','image/webp')),
    width           INT,
    height          INT,

    is_primary      BOOLEAN DEFAULT TRUE,
    is_active       BOOLEAN DEFAULT TRUE,
    upload_source   TEXT DEFAULT 'manual' CHECK (upload_source IN ('manual','registration','admin')),

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pp_user    ON public.profile_photos(user_id);
CREATE INDEX idx_pp_active  ON public.profile_photos(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_pp_primary ON public.profile_photos(user_id, is_primary) WHERE is_primary = TRUE;

-- ============================================
-- 2. ADD PHOTO COLUMNS TO USERS TABLE
-- ============================================
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS profile_photo_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS profile_photo_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS requires_photo_upload BOOLEAN DEFAULT TRUE;

-- ============================================
-- 3. TRUST BADGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.trust_badges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    badge_type      TEXT NOT NULL CHECK (badge_type IN (
                        'photo_verified','identity_verified','phone_verified',
                        'email_verified','profile_completed','trusted_farmer',
                        'trusted_worker','community_member'
                    )),
    badge_name_en   TEXT NOT NULL,
    badge_name_ne   TEXT NOT NULL,
    badge_icon      TEXT,
    badge_color     TEXT DEFAULT '#16a34a',

    earned_at       TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE,
    earned_by       UUID REFERENCES public.users(id),

    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, badge_type)
);

CREATE INDEX idx_tb_user   ON public.trust_badges(user_id);
CREATE INDEX idx_tb_active ON public.trust_badges(user_id, is_active) WHERE is_active = TRUE;

-- ============================================
-- 4. PHOTO UPLOAD LOG (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS public.photo_upload_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    action          TEXT NOT NULL CHECK (action IN ('upload','replace','delete','crop','admin_remove')),
    photo_url       TEXT,
    file_name       TEXT,
    file_size_bytes BIGINT,
    file_type       TEXT,
    width           INT,
    height          INT,
    reason          TEXT,
    admin_id        UUID REFERENCES public.users(id),

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pul_user ON public.photo_upload_log(user_id);
CREATE INDEX idx_pul_created ON public.photo_upload_log(created_at DESC);

-- ============================================
-- 5. STORAGE BUCKET CONFIG
-- ============================================
-- Run this in Supabase Dashboard > Storage > New Bucket:
-- Bucket: profile-images
-- Public: false
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- Storage folder structure:
-- profile-images/
--   {user_id}/
--     profile.jpg
--     thumb.jpg

-- ============================================
-- 6. SYSTEM SETTINGS
-- ============================================
INSERT INTO public.system_settings (key, value, category, description, is_public)
VALUES
('photo_max_size_bytes',    '5242880',  'upload', 'Max profile photo size in bytes (5MB)',         FALSE),
('photo_min_width',         '300',      'upload', 'Minimum photo width in pixels',                 FALSE),
('photo_min_height',        '300',      'upload', 'Minimum photo height in pixels',                FALSE),
('photo_recommended_width', '600',      'upload', 'Recommended photo width',                       FALSE),
('photo_recommended_height','600',      'upload', 'Recommended photo height',                      FALSE),
('photo_allowed_types',     '["image/jpeg","image/png","image/webp"]', 'upload', 'Allowed image MIME types', FALSE),
('photo_thumb_size',        '200',      'upload', 'Thumbnail size in pixels',                      FALSE),
('photo_compression_quality','85',      'upload', 'JPEG compression quality (1-100)',              FALSE)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================
GRANT ALL ON public.profile_photos TO service_role;
GRANT ALL ON public.trust_badges TO service_role;
GRANT ALL ON public.photo_upload_log TO service_role;

GRANT SELECT ON public.trust_badges TO authenticated;
GRANT SELECT ON public.profile_photos TO authenticated;

-- ============================================
-- 8. RLS POLICIES
-- ============================================
ALTER TABLE public.profile_photos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_badges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_upload_log  ENABLE ROW LEVEL SECURITY;

-- Profile Photos
DROP POLICY IF EXISTS "pp_own_select" ON public.profile_photos;
CREATE POLICY "pp_own_select" ON public.profile_photos
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "pp_own_insert" ON public.profile_photos;
CREATE POLICY "pp_own_insert" ON public.profile_photos
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "pp_own_update" ON public.profile_photos;
CREATE POLICY "pp_own_update" ON public.profile_photos
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "pp_public_select" ON public.profile_photos;
CREATE POLICY "pp_public_select" ON public.profile_photos
    FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "pp_service_all" ON public.profile_photos;
CREATE POLICY "pp_service_all" ON public.profile_photos
    FOR ALL USING (auth.role() = 'service_role');

-- Trust Badges
DROP POLICY IF EXISTS "tb_own_select" ON public.trust_badges;
CREATE POLICY "tb_own_select" ON public.trust_badges
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tb_public_select" ON public.trust_badges;
CREATE POLICY "tb_public_select" ON public.trust_badges
    FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "tb_service_all" ON public.trust_badges;
CREATE POLICY "tb_service_all" ON public.trust_badges
    FOR ALL USING (auth.role() = 'service_role');

-- Photo Upload Log
DROP POLICY IF EXISTS "pul_own_select" ON public.photo_upload_log;
CREATE POLICY "pul_own_select" ON public.photo_upload_log
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "pul_service_all" ON public.photo_upload_log;
CREATE POLICY "pul_service_all" ON public.photo_upload_log
    FOR ALL USING (auth.role() = 'service_role');

-- Storage RLS (profile-images bucket)
-- These policies are created via SQL but may need to be set via Dashboard
-- Run after creating the profile-images bucket

-- ============================================
-- 9. FUNCTION: Check profile completeness
-- ============================================
CREATE OR REPLACE FUNCTION public.check_profile_complete(
    p_user_id UUID
) RETURNS TABLE (
    is_complete BOOLEAN,
    has_photo BOOLEAN,
    has_verified_contact BOOLEAN,
    missing_items TEXT[]
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_has_photo BOOLEAN;
    v_photo_count INT;
BEGIN
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;

    -- Check photo
    SELECT COUNT(*) INTO v_photo_count
    FROM public.profile_photos
    WHERE user_id = p_user_id AND is_active = TRUE;

    v_has_photo := v_photo_count > 0 AND v_user.profile_photo_url IS NOT NULL;

    -- Check contact verification
    has_verified_contact := COALESCE(v_user.mobile_verified, FALSE)
                          OR COALESCE(v_user.email_verified, FALSE);

    -- Build missing items
    missing_items := ARRAY[]::TEXT[];
    IF NOT v_has_photo THEN
        missing_items := array_append(missing_items, 'Profile Photo');
    END IF;
    IF NOT has_verified_contact THEN
        missing_items := array_append(missing_items, 'Verified Mobile or Email');
    END IF;

    has_photo := v_has_photo;
    is_complete := v_has_photo AND has_verified_contact;

    -- Update user if complete
    IF is_complete AND NOT COALESCE(v_user.profile_completed, FALSE) THEN
        UPDATE public.users
        SET profile_completed = TRUE,
            profile_completed_at = NOW(),
            profile_photo_verified = v_has_photo,
            profile_photo_verified_at = CASE WHEN v_has_photo THEN NOW() ELSE NULL END,
            requires_photo_upload = FALSE
        WHERE id = p_user_id;

        -- Award trust badge
        INSERT INTO public.trust_badges (user_id, badge_type, badge_name_en, badge_name_ne, badge_icon)
        VALUES (p_user_id, 'profile_completed', 'Profile Completed', 'प्रोफाइल सम्पन्न', '✅')
        ON CONFLICT (user_id, badge_type) DO UPDATE SET is_active = TRUE;

        INSERT INTO public.trust_badges (user_id, badge_type, badge_name_en, badge_name_ne, badge_icon)
        VALUES (p_user_id, 'photo_verified', 'Photo Verified', 'फोटो प्रमाणित', '📸')
        ON CONFLICT (user_id, badge_type) DO UPDATE SET is_active = TRUE;

        -- Notify
        INSERT INTO public.auth_notifications (user_id, type, title, body)
        VALUES (p_user_id, 'account_activated',
                'Profile Completed!',
                'Your profile is now complete. You have full access to KrishiConnect Nepal.');
    END IF;

    RETURN NEXT;
END;
$$;

-- ============================================
-- 10. FUNCTION: Upload profile photo
-- ============================================
CREATE OR REPLACE FUNCTION public.upload_profile_photo(
    p_user_id UUID,
    p_photo_url TEXT,
    p_file_name TEXT,
    p_file_size_bytes BIGINT,
    p_file_type TEXT,
    p_width INT DEFAULT NULL,
    p_height INT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    photo_url TEXT,
    profile_complete BOOLEAN
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_old_photo_id UUID;
    v_max_size BIGINT;
    v_allowed_types TEXT[];
    v_min_width INT;
    v_min_height INT;
BEGIN
    -- Get config
    v_max_size := COALESCE(
        (SELECT value::BIGINT FROM public.system_settings WHERE key = 'photo_max_size_bytes'),
        5242880
    );
    v_min_width := COALESCE(
        (SELECT value::INT FROM public.system_settings WHERE key = 'photo_min_width'),
        300
    );
    v_min_height := COALESCE(
        (SELECT value::INT FROM public.system_settings WHERE key = 'photo_min_height'),
        300
    );

    -- Validate file size
    IF p_file_size_bytes > v_max_size THEN
        success := FALSE;
        message := 'File too large. Maximum size is 5MB.';
        photo_url := NULL;
        profile_complete := FALSE;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Validate file type
    IF p_file_type NOT IN ('image/jpeg', 'image/png', 'image/webp') THEN
        success := FALSE;
        message := 'Invalid file type. Only JPG, PNG, and WEBP are allowed.';
        photo_url := NULL;
        profile_complete := FALSE;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Validate dimensions
    IF p_width IS NOT NULL AND p_width < v_min_width THEN
        success := FALSE;
        message := 'Image too small. Minimum width is ' || v_min_width || ' pixels.';
        photo_url := NULL;
        profile_complete := FALSE;
        RETURN NEXT;
        RETURN;
    END IF;

    IF p_height IS NOT NULL AND p_height < v_min_height THEN
        success := FALSE;
        message := 'Image too small. Minimum height is ' || v_min_height || ' pixels.';
        photo_url := NULL;
        profile_complete := FALSE;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Deactivate old photos
    UPDATE public.profile_photos
    SET is_active = FALSE, is_primary = FALSE
    WHERE user_id = p_user_id AND is_active = TRUE
    RETURNING id INTO v_old_photo_id;

    -- Insert new photo
    INSERT INTO public.profile_photos (
        user_id, photo_url, file_name, file_size_bytes,
        file_type, width, height, is_primary, is_active
    ) VALUES (
        p_user_id, p_photo_url, p_file_name, p_file_size_bytes,
        p_file_type, p_width, p_height, TRUE, TRUE
    );

    -- Update user
    UPDATE public.users
    SET profile_photo_url = p_photo_url,
        profile_photo_verified = TRUE,
        profile_photo_verified_at = NOW(),
        requires_photo_upload = FALSE,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log
    INSERT INTO public.photo_upload_log (
        user_id, action, photo_url, file_name,
        file_size_bytes, file_type, width, height
    ) VALUES (
        p_user_id, 'upload', p_photo_url, p_file_name,
        p_file_size_bytes, p_file_type, p_width, p_height
    );

    -- Award badge
    INSERT INTO public.trust_badges (user_id, badge_type, badge_name_en, badge_name_ne, badge_icon)
    VALUES (p_user_id, 'photo_verified', 'Photo Verified', 'फोटो प्रमाणित', '📸')
    ON CONFLICT (user_id, badge_type) DO UPDATE SET is_active = TRUE, earned_at = NOW();

    -- Check profile completeness
    PERFORM public.check_profile_complete(p_user_id);

    success := TRUE;
    message := 'Photo uploaded successfully';
    photo_url := p_photo_url;

    SELECT profile_completed INTO profile_complete FROM public.users WHERE id = p_user_id;
    RETURN NEXT;
END;
$$;

-- ============================================
-- 11. FUNCTION: Delete profile photo
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_profile_photo(
    p_user_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    requires_new_upload BOOLEAN
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_photo_count INT;
BEGIN
    -- Deactivate current photo
    UPDATE public.profile_photos
    SET is_active = FALSE
    WHERE user_id = p_user_id AND is_active = TRUE;

    -- Count remaining active photos
    SELECT COUNT(*) INTO v_photo_count
    FROM public.profile_photos
    WHERE user_id = p_user_id AND is_active = TRUE;

    -- Update user
    UPDATE public.users
    SET profile_photo_url = NULL,
        profile_photo_verified = FALSE,
        profile_photo_verified_at = NULL,
        requires_photo_upload = TRUE,
        profile_completed = FALSE,
        profile_completed_at = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Revoke badge
    UPDATE public.trust_badges
    SET is_active = FALSE
    WHERE user_id = p_user_id AND badge_type IN ('photo_verified', 'profile_completed');

    -- Log
    INSERT INTO public.photo_upload_log (user_id, action, reason)
    VALUES (p_user_id, 'delete', 'User removed profile photo');

    success := TRUE;
    message := 'Photo removed. Please upload a new one.';
    requires_new_upload := TRUE;
    RETURN NEXT;
END;
$$;

-- ============================================
-- 12. FUNCTION: Get user trust badges
-- ============================================
CREATE OR REPLACE FUNCTION public.get_trust_badges(
    p_user_id UUID
) RETURNS TABLE (
    badge_type TEXT,
    badge_name TEXT,
    badge_icon TEXT,
    badge_color TEXT,
    earned_at TIMESTAMPTZ,
    is_active BOOLEAN
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    -- Auto-check and award badges
    PERFORM public.check_profile_complete(p_user_id);

    RETURN QUERY
    SELECT
        tb.badge_type,
        CASE WHEN current_setting('request.jwt.claims', TRUE)::jsonb->>'language' = 'ne'
             THEN tb.badge_name_ne ELSE tb.badge_name_en END,
        tb.badge_icon,
        tb.badge_color,
        tb.earned_at,
        tb.is_active
    FROM public.trust_badges tb
    WHERE tb.user_id = p_user_id
    ORDER BY tb.earned_at DESC;
END;
$$;

-- ============================================
-- 13. FUNCTION: Get photo upload history
-- ============================================
CREATE OR REPLACE FUNCTION public.get_photo_history(
    p_user_id UUID
) RETURNS TABLE (
    action TEXT,
    photo_url TEXT,
    file_name TEXT,
    file_size TEXT,
    created_at TIMESTAMPTZ
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pul.action,
        pul.photo_url,
        pul.file_name,
        CASE
            WHEN pul.file_size_bytes > 1048576 THEN
                ROUND((pul.file_size_bytes::NUMERIC / 1048576), 1) || ' MB'
            ELSE
                ROUND((pul.file_size_bytes::NUMERIC / 1024), 1) || ' KB'
        END,
        pul.created_at
    FROM public.photo_upload_log pul
    WHERE pul.user_id = p_user_id
    ORDER BY pul.created_at DESC
    LIMIT 20;
END;
$$;
