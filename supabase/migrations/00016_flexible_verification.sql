-- ============================================================
-- KrishiConnect Nepal — Production Auth & OTP Verification
-- Migration 00016: Complete Authentication Schema
-- ============================================================
-- This migration replaces all previous verification tables.
-- Run 00002 FIRST (users table), then this.
-- ============================================================

-- ============================================
-- 1. USER VERIFICATION COLUMNS
-- ============================================
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mobile_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS preferred_verification TEXT
        CHECK (preferred_verification IN ('mobile','email')),
    ADD COLUMN IF NOT EXISTS previous_mobile TEXT,
    ADD COLUMN IF NOT EXISTS previous_email TEXT,
    ADD COLUMN IF NOT EXISTS mobile_changed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_changed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS failed_otp_attempts INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS otp_locked_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS login_locked_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS captcha_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS registration_method TEXT
        CHECK (registration_method IN ('mobile','email','both'));

-- Allow null mobile (email-only registration)
ALTER TABLE public.users ALTER COLUMN mobile_number DROP NOT NULL;

-- Partial unique: only enforce when mobile is present
DROP INDEX IF EXISTS idx_users_mobile_unique;
CREATE UNIQUE INDEX idx_users_mobile_unique
    ON public.users(mobile_number) WHERE mobile_number IS NOT NULL;

-- ============================================
-- 2. OTP RECORDS  (SHA-256 hashed, never plain text)
-- ============================================
DROP TABLE IF EXISTS public.otp_records CASCADE;

CREATE TABLE public.otp_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
    identifier      TEXT NOT NULL,                          -- mobile or email
    identifier_type TEXT NOT NULL
        CHECK (identifier_type IN ('mobile','email')),
    otp_hash        TEXT NOT NULL,                          -- SHA-256(pepper + code)
    purpose         TEXT NOT NULL CHECK (purpose IN (
                        'registration','login','password_reset',
                        'mobile_verify','email_verify',
                        'mobile_change','email_change')),
    attempts        SMALLINT DEFAULT 0,
    max_attempts    SMALLINT DEFAULT 5,
    is_used         BOOLEAN DEFAULT FALSE,
    is_expired      BOOLEAN DEFAULT FALSE,
    delivery_status TEXT DEFAULT 'pending'
        CHECK (delivery_status IN ('pending','sent','delivered','failed')),
    delivery_error  TEXT,
    delivery_provider TEXT,
    ip_address      INET,
    user_agent      TEXT,
    device_fingerprint TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_identifier    ON public.otp_records(identifier);
CREATE INDEX idx_otp_purpose       ON public.otp_records(purpose, is_used, is_expired);
CREATE INDEX idx_otp_user          ON public.otp_records(user_id);
CREATE INDEX idx_otp_expires       ON public.otp_records(expires_at);
CREATE INDEX idx_otp_created       ON public.otp_records(created_at DESC);
CREATE INDEX idx_otp_delivery      ON public.otp_records(delivery_status);

-- ============================================
-- 3. VERIFICATION LINK TOKENS (email links)
-- ============================================
CREATE TABLE public.verification_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,                       -- SHA-256 of raw token
    purpose     TEXT NOT NULL CHECK (purpose IN (
                    'email_verify','email_change',
                    'mobile_verify','password_reset')),
    identifier  TEXT NOT NULL,
    is_used     BOOLEAN DEFAULT FALSE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vt_token   ON public.verification_tokens(token_hash);
CREATE INDEX idx_vt_purpose ON public.verification_tokens(purpose, is_used);
CREATE INDEX idx_vt_user    ON public.verification_tokens(user_id);

-- ============================================
-- 4. VERIFICATION LOGS (immutable audit trail)
-- ============================================
CREATE TABLE public.verification_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event           TEXT NOT NULL CHECK (event IN (
                        'otp_created','otp_sent','otp_verified',
                        'otp_failed','otp_expired','otp_locked',
                        'otp_rate_limited','otp_resend',
                        'link_sent','link_verified','link_expired',
                        'verification_completed','account_activated',
                        'password_reset_requested','password_reset_completed',
                        'mobile_changed','email_changed',
                        'login_success','login_failed',
                        'account_locked','account_unlocked')),
    identifier_type TEXT CHECK (identifier_type IN ('mobile','email')),
    identifier_masked TEXT,
    purpose         TEXT,
    ip_address      INET,
    user_agent      TEXT,
    device_fingerprint TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vl_user    ON public.verification_logs(user_id);
CREATE INDEX idx_vl_event   ON public.verification_logs(event);
CREATE INDEX idx_vl_created ON public.verification_logs(created_at DESC);
CREATE INDEX idx_vl_purpose ON public.verification_logs(purpose);

-- ============================================
-- 5. RATE LIMITS
-- ============================================
CREATE TABLE public.rate_limits (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope         TEXT NOT NULL,
    identifier    TEXT NOT NULL,
    action        TEXT NOT NULL,
    attempt_count INT DEFAULT 1,
    window_start  TIMESTAMPTZ DEFAULT NOW(),
    locked_until  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scope, identifier, action)
);

CREATE INDEX idx_rl_lookup ON public.rate_limits(scope, identifier, action);

-- ============================================
-- 6. CONTACT CHANGE REQUESTS
-- ============================================
CREATE TABLE public.contact_change_requests (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL CHECK (change_type IN ('mobile','email')),
    old_value   TEXT NOT NULL,
    new_value   TEXT NOT NULL,
    otp_hash    TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ccr_user    ON public.contact_change_requests(user_id);
CREATE INDEX idx_ccr_pending ON public.contact_change_requests(user_id, change_type, is_completed);

-- ============================================
-- 7. LOGIN HISTORY (enhanced)
-- ============================================
DROP TABLE IF EXISTS public.login_history CASCADE;

CREATE TABLE public.login_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    login_method    TEXT NOT NULL CHECK (login_method IN ('password','otp','magic_link')),
    identifier_used TEXT,
    identifier_type TEXT CHECK (identifier_type IN ('mobile','email')),
    is_success      BOOLEAN DEFAULT TRUE,
    failure_reason  TEXT,
    ip_address      INET,
    user_agent      TEXT,
    browser         TEXT,
    os              TEXT,
    device_type     TEXT,
    device_name     TEXT,
    geo_location    JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lh_user    ON public.login_history(user_id);
CREATE INDEX idx_lh_created ON public.login_history(created_at DESC);
CREATE INDEX idx_lh_success ON public.login_history(is_success);

-- ============================================
-- 8. FAILED LOGIN ATTEMPTS
-- ============================================
DROP TABLE IF EXISTS public.failed_login_attempts CASCADE;

CREATE TABLE public.failed_login_attempts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier  TEXT NOT NULL,
    ip_address  INET,
    user_agent  TEXT,
    attempts    INT DEFAULT 1,
    locked_until TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fla_identifier ON public.failed_login_attempts(identifier);

-- ============================================
-- 9. USER SESSIONS (enhanced)
-- ============================================
DROP TABLE IF EXISTS public.user_sessions CASCADE;

CREATE TABLE public.user_sessions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    supabase_session_id TEXT,
    access_token_hash TEXT,
    ip_address        INET,
    user_agent        TEXT,
    browser           TEXT,
    os                TEXT,
    device_type       TEXT,
    device_name       TEXT,
    is_current        BOOLEAN DEFAULT FALSE,
    is_trusted        BOOLEAN DEFAULT FALSE,
    last_activity     TIMESTAMPTZ DEFAULT NOW(),
    expires_at        TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_us_user    ON public.user_sessions(user_id);
CREATE INDEX idx_us_active  ON public.user_sessions(is_current) WHERE is_current = TRUE;

-- ============================================
-- 10. TRUSTED DEVICES
-- ============================================
DROP TABLE IF EXISTS public.trusted_devices CASCADE;

CREATE TABLE public.trusted_devices (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    device_name       TEXT,
    device_type       TEXT,
    browser           TEXT,
    os                TEXT,
    ip_address        INET,
    is_trusted        BOOLEAN DEFAULT FALSE,
    last_used_at      TIMESTAMPTZ DEFAULT NOW(),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX idx_td_user ON public.trusted_devices(user_id);

-- ============================================
-- 11. USER NOTIFICATIONS (auth-related)
-- ============================================
CREATE TABLE public.auth_notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK (type IN (
                    'new_login','password_changed','phone_changed',
                    'email_changed','otp_verified','account_activated',
                    'new_device_login','account_locked','account_unlocked')),
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',
    is_read     BOOLEAN DEFAULT FALSE,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_an_user ON public.auth_notifications(user_id);
CREATE INDEX idx_an_unread ON public.auth_notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- 12. INDEXES ON USER COLUMNS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_mobile_verified ON public.users(mobile_verified);
CREATE INDEX IF NOT EXISTS idx_users_email_verified  ON public.users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_reg_method      ON public.users(registration_method);
CREATE INDEX IF NOT EXISTS idx_users_failed_otp      ON public.users(failed_otp_attempts);
CREATE INDEX IF NOT EXISTS idx_users_failed_login    ON public.users(failed_login_attempts);

-- ============================================
-- 13. SYSTEM CONFIG
-- ============================================
INSERT INTO public.system_settings (key, value, category, description, is_public)
VALUES
('otp_dev_mode',        'true',   'security', 'Log OTPs to console instead of sending',      FALSE),
('otp_hash_pepper',     '"kc_2025_prod_pepper"', 'security', 'Pepper for OTP SHA-256 hashing', FALSE),
('otp_length',          '6',      'security', 'OTP digit count',                             FALSE),
('otp_sms_expiry',      '5',      'security', 'SMS OTP expiry in minutes',                   FALSE),
('otp_email_expiry',    '10',     'security', 'Email OTP expiry in minutes',                 FALSE),
('otp_max_attempts',    '5',      'security', 'Max OTP verification attempts',               FALSE),
('otp_rate_window',     '60',     'security', 'Rate limit window in minutes',                FALSE),
('otp_rate_max',        '5',      'security', 'Max OTP requests per window',                 FALSE),
('otp_resend_max',      '5',      'security', 'Max resends per hour',                        FALSE),
('login_max_attempts',  '5',      'security', 'Max login attempts before lockout',           FALSE),
('login_lockout_mins',  '15',     'security', 'Login lockout duration in minutes',           FALSE),
('pwd_reset_expiry',    '10',     'security', 'Password reset OTP expiry in minutes',        FALSE),
('session_expiry_days', '7',      'security', 'Session expiry in days',                      FALSE)
ON CONFLICT (key) DO NOTHING;
