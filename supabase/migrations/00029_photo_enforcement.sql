-- Migration: Mandatory Profile Photo Enforcement
-- Ensures all users upload a profile photo before accessing platform features

-- Add enforcement flag to system_settings if not exists
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, category, is_public)
VALUES
  ('photo_enforcement_enabled', 'true', 'boolean', 'Enable mandatory profile photo upload for all users', 'security', true),
  ('photo_enforcement_grace_period_hours', '24', 'number', 'Hours after registration before photo becomes mandatory', 'security', false),
  ('photo_enforcement_exempt_roles', '["admin"]', 'json', 'Roles exempt from photo enforcement', 'security', false)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

-- Function to check if a user has a valid profile photo
CREATE OR REPLACE FUNCTION public.user_has_profile_photo(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_photo BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profile_photos
    WHERE user_id = p_user_id AND is_active = TRUE
  ) INTO v_has_photo;

  -- Also check the legacy profile_photo_url column
  IF NOT v_has_photo THEN
    SELECT (profile_photo_url IS NOT NULL AND profile_photo_url != '')
    INTO v_has_photo
    FROM public.users
    WHERE id = p_user_id;
  END IF;

  RETURN v_has_photo;
END;
$$;

-- Function to check if user requires photo enforcement
CREATE OR REPLACE FUNCTION public.requires_photo_enforcement(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enforcement_enabled BOOLEAN;
  v_user_role TEXT;
  v_exempt_roles JSONB;
  v_has_photo BOOLEAN;
BEGIN
  -- Check if enforcement is enabled
  SELECT setting_value::BOOLEAN INTO v_enforcement_enabled
  FROM public.system_settings
  WHERE setting_key = 'photo_enforcement_enabled';

  IF NOT v_enforcement_enabled THEN
    RETURN FALSE;
  END IF;

  -- Check exempt roles
  SELECT setting_value::JSONB INTO v_exempt_roles
  FROM public.system_settings
  WHERE setting_key = 'photo_enforcement_exempt_roles';

  -- Get user's active role
  SELECT active_role::TEXT INTO v_user_role
  FROM public.users
  WHERE id = p_user_id;

  -- Check if role is exempt
  IF v_user_role IS NOT NULL AND v_user_role = ANY(
    SELECT jsonb_array_elements_text(v_exempt_roles)
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check if user has photo
  v_has_photo := public.user_has_profile_photo(p_user_id);

  RETURN NOT v_has_photo;
END;
$$;

-- Function to enforce photo on sensitive actions
-- Called before: posting jobs, applying for jobs, messaging, marketplace actions
CREATE OR REPLACE FUNCTION public.check_photo_before_action(p_user_id UUID)
RETURNS TABLE(
  allowed BOOLEAN,
  message TEXT,
  photo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_requires BOOLEAN;
  v_photo_url TEXT;
BEGIN
  v_requires := public.requires_photo_enforcement(p_user_id);

  IF NOT v_requires THEN
    SELECT u.profile_photo_url INTO v_photo_url
    FROM public.users u WHERE u.id = p_user_id;

    RETURN QUERY SELECT TRUE, 'Photo check passed'::TEXT, v_photo_url;
    RETURN;
  END IF;

  RETURN QUERY SELECT FALSE, 'Profile photo is required. Please upload a clear profile photo before continuing.'::TEXT, NULL::TEXT;
END;
$$;

-- Update RLS on profile_photos to allow authenticated users to manage their own photos
ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile photos" ON public.profile_photos;
CREATE POLICY "Users can view own profile photos"
  ON public.profile_photos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile photos" ON public.profile_photos;
CREATE POLICY "Users can insert own profile photos"
  ON public.profile_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile photos" ON public.profile_photos;
CREATE POLICY "Users can update own profile photos"
  ON public.profile_photos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile photos" ON public.profile_photos;
CREATE POLICY "Users can delete own profile photos"
  ON public.profile_photos FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster photo enforcement checks
CREATE INDEX IF NOT EXISTS idx_profile_photos_user_active
  ON public.profile_photos(user_id, is_active)
  WHERE is_active = TRUE;

-- Comment on functions
COMMENT ON FUNCTION public.user_has_profile_photo(UUID) IS 'Check if user has an active profile photo';
COMMENT ON FUNCTION public.requires_photo_enforcement(UUID) IS 'Check if user must upload a photo before accessing features';
COMMENT ON FUNCTION public.check_photo_before_action(UUID) IS 'Guard function for sensitive actions requiring profile photo';
