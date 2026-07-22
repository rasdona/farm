-- ============================================================
-- KrishiConnect Nepal — Email Verification & Future SMS OTP
-- Migration 00030: Email-First Auth with SMS OTP Reserved Fields
-- ============================================================
-- This migration:
-- 1. Makes email mandatory for all users
-- 2. Adds email verification as primary auth method
-- 3. Keeps mobile_verified reserved for future SMS OTP
-- 4. Adds verification_method to track current verification approach
-- 5. Adds OTP-related fields for future SMS integration
-- ============================================================

-- ============================================
-- 1. USER TABLE UPDATES
-- ============================================

-- Make email NOT NULL (required for all new users)
-- First, update any existing users without email
UPDATE public.users
SET email = CONCAT(mobile_number, '@krishiconnect.placeholder')
WHERE email IS NULL;

-- Now make email NOT NULL
ALTER TABLE public.users
    ALTER COLUMN email SET NOT NULL;

-- Add email as unique (partial index already exists, but ensure uniqueness)
DROP INDEX IF EXISTS idx_users_email_unique;
CREATE UNIQUE INDEX idx_users_email_unique
    ON public.users(email);

-- Add future-ready fields for SMS OTP verification
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'email'
        CHECK (verification_method IN ('email', 'mobile', 'both')),
    ADD COLUMN IF NOT EXISTS mobile_otp_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mobile_otp_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_otp_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS otp_send_count_today INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS otp_send_date DATE DEFAULT CURRENT_DATE;

-- Create index for verification method
CREATE INDEX IF NOT EXISTS idx_users_verification_method
    ON public.users(verification_method);

-- Create index for mobile OTP status
CREATE INDEX IF NOT EXISTS idx_users_mobile_otp
    ON public.users(mobile_otp_enabled, mobile_otp_verified);

-- ============================================
-- 2. EMAIL VERIFICATION TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    purpose TEXT NOT NULL CHECK (purpose IN ('email_verify', 'email_change')),
    email TEXT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evt_user
    ON public.email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_evt_token
    ON public.email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_evt_purpose
    ON public.email_verification_tokens(purpose, is_used);

-- ============================================
-- 3. EMAIL VERIFICATION LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_verification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event TEXT NOT NULL CHECK (event IN (
        'email_otp_sent',
        'email_otp_verified',
        'email_otp_failed',
        'email_otp_expired',
        'email_link_sent',
        'email_link_verified',
        'email_link_expired',
        'email_verification_completed'
    )),
    email TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evl_user
    ON public.email_verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_evl_event
    ON public.email_verification_logs(event);
CREATE INDEX IF NOT EXISTS idx_evl_created
    ON public.email_verification_logs(created_at DESC);

-- ============================================
-- 4. SMS OTP CONFIG TABLE (Reserved for Future)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sms_otp_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default SMS OTP settings (all disabled by default)
INSERT INTO public.sms_otp_config (setting_key, setting_value, description, is_enabled) VALUES
    ('sms_provider', 'twilio', 'SMS provider (twilio, messagebird, etc.)', FALSE),
    ('sms_api_key', '', 'SMS provider API key', FALSE),
    ('sms_api_secret', '', 'SMS provider API secret', FALSE),
    ('sms_sender_id', 'KrishiConnect', 'SMS sender ID', FALSE),
    ('sms_enabled', 'false', 'Enable SMS OTP verification', FALSE),
    ('sms_otp_length', '6', 'Length of SMS OTP code', FALSE),
    ('sms_otp_expiry_minutes', '5', 'SMS OTP expiry in minutes', FALSE),
    ('sms_otp_max_attempts', '5', 'Max SMS OTP verification attempts', FALSE),
    ('sms_rate_limit_per_day', '10', 'Max SMS OTPs per user per day', FALSE),
    ('sms_template_registration', 'Your KrishiConnect verification code is {{code}}. Valid for {{expiry}} minutes.', 'SMS template for registration', FALSE),
    ('sms_template_login', 'Your KrishiConnect login code is {{code}}. Valid for {{expiry}} minutes.', 'SMS template for login', FALSE),
    ('sms_template_password_reset', 'Your KrishiConnect password reset code is {{code}}. Do not share.', 'SMS template for password reset', FALSE)
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- 5. SYSTEM SETTINGS
-- ============================================
INSERT INTO public.system_settings (key, value, category, description, is_public)
VALUES
    ('auth_email_verification_required', 'true', 'auth', 'Require email verification for new accounts', FALSE),
    ('auth_email_otp_length', '6', 'auth', 'Email OTP digit count', FALSE),
    ('auth_email_otp_expiry_minutes', '10', 'auth', 'Email OTP expiry in minutes', FALSE),
    ('auth_email_otp_max_attempts', '5', 'auth', 'Max email OTP verification attempts', FALSE),
    ('auth_sms_verification_enabled', 'false', 'auth', 'Enable SMS OTP verification (future feature)', FALSE),
    ('auth_sms_verification_required', 'false', 'auth', 'Require SMS OTP verification (future feature)', FALSE),
    ('auth_login_requires_email_verified', 'true', 'auth', 'Require verified email to login', FALSE),
    ('auth_registration_method', 'email', 'auth', 'Default registration verification method', FALSE),
    ('auth_password_min_length', '8', 'auth', 'Minimum password length', TRUE),
    ('auth_password_require_uppercase', 'true', 'auth', 'Require uppercase in password', TRUE),
    ('auth_password_require_lowercase', 'true', 'auth', 'Require lowercase in password', TRUE),
    ('auth_password_require_number', 'true', 'auth', 'Require number in password', TRUE),
    ('auth_password_require_special', 'true', 'auth', 'Require special character in password', TRUE)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_otp_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- Email verification tokens: users can only see their own
CREATE POLICY "Users can view own email verification tokens"
    ON public.email_verification_tokens
    FOR SELECT
    USING (auth.uid() = user_id);

-- Email verification logs: users can only see their own
CREATE POLICY "Users can view own email verification logs"
    ON public.email_verification_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- SMS OTP config: admin only
CREATE POLICY "Admins can manage SMS OTP config"
    ON public.sms_otp_config
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND active_role = 'admin'
        )
    );

-- ============================================
-- 8. FUNCTIONS
-- ============================================

-- Function to verify email with OTP
CREATE OR REPLACE FUNCTION public.verify_email_with_otp(
    p_email TEXT,
    p_otp_code TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_otp_record RECORD;
    v_user RECORD;
BEGIN
    -- Find the OTP record
    SELECT * INTO v_otp_record
    FROM public.otp_records
    WHERE identifier = p_email
        AND identifier_type = 'email'
        AND purpose = 'email_verify'
        AND is_used = FALSE
        AND is_expired = FALSE
        AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'OTP has expired or not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Check attempts
    IF v_otp_record.attempts >= v_otp_record.max_attempts THEN
        RETURN QUERY SELECT FALSE, 'Too many failed attempts'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Verify OTP (compare plain text for now, in production use hash)
    IF v_otp_record.otp_hash != p_otp_code THEN
        -- Increment attempts
        UPDATE public.otp_records
        SET attempts = attempts + 1
        WHERE id = v_otp_record.id;

        RETURN QUERY SELECT FALSE, 'Incorrect OTP code'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Mark OTP as used
    UPDATE public.otp_records
    SET is_used = TRUE, used_at = NOW(), attempts = attempts + 1
    WHERE id = v_otp_record.id;

    -- Get user and verify email
    SELECT * INTO v_user
    FROM public.users
    WHERE id = v_otp_record.user_id;

    IF FOUND THEN
        UPDATE public.users
        SET email_verified = TRUE,
            email_verified_at = NOW(),
            account_status = 'active',
            updated_at = NOW()
        WHERE id = v_user.id;

        -- Log verification
        INSERT INTO public.email_verification_logs (
            user_id, event, email, metadata
        ) VALUES (
            v_user.id, 'email_verification_completed', p_email,
            jsonb_build_object('otp_id', v_otp_record.id)
        );

        RETURN QUERY SELECT TRUE, 'Email verified successfully'::TEXT, v_user.id;
    ELSE
        RETURN QUERY SELECT FALSE, 'User not found'::TEXT, NULL::UUID;
    END IF;
END;
$$;

-- Function to get verification status
CREATE OR REPLACE FUNCTION public.get_email_verification_status(
    p_user_id UUID
)
RETURNS TABLE (
    email_verified BOOLEAN,
    email TEXT,
    mobile_verified BOOLEAN,
    verification_method TEXT,
    account_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.email_verified,
        u.email,
        u.mobile_verified,
        u.verification_method,
        u.account_status::TEXT
    FROM public.users u
    WHERE u.id = p_user_id;
END;
$$;

-- Function to check if SMS OTP is enabled (future feature)
CREATE OR REPLACE FUNCTION public.is_sms_otp_enabled()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_enabled TEXT;
BEGIN
    SELECT setting_value INTO v_enabled
    FROM public.sms_otp_config
    WHERE setting_key = 'sms_enabled';

    RETURN COALESCE(v_enabled, 'false') = 'true';
END;
$$;

-- Function to get SMS OTP config (admin only)
CREATE OR REPLACE FUNCTION public.get_sms_otp_config()
RETURNS TABLE (
    setting_key TEXT,
    setting_value TEXT,
    description TEXT,
    is_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND active_role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin only';
    END IF;

    RETURN QUERY
    SELECT
        s.setting_key,
        s.setting_value,
        s.description,
        s.is_enabled
    FROM public.sms_otp_config s
    ORDER BY s.setting_key;
END;
$$;
