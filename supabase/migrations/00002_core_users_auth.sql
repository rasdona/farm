-- KrishiConnect Nepal - Production Database
-- Migration 00002: Core Users, Roles, and Authentication

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL UNIQUE,
    email TEXT,
    profile_photo TEXT,
    cover_photo TEXT,
    preferred_language language_preference DEFAULT 'en',
    account_status account_status DEFAULT 'pending_verification',
    verification_status verification_status DEFAULT 'unverified',
    last_login TIMESTAMPTZ,
    active_role active_role DEFAULT 'farmer',
    profile_completion_pct SMALLINT DEFAULT 0 CHECK (profile_completion_pct BETWEEN 0 AND 100),
    is_online BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_mobile ON public.users(mobile_number);
CREATE INDEX idx_users_email ON public.users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_account_status ON public.users(account_status);
CREATE INDEX idx_users_active_role ON public.users(active_role);
CREATE INDEX idx_users_verification ON public.users(verification_status);
CREATE INDEX idx_users_full_name_trgm ON public.users USING gin(full_name gin_trgm_ops);

-- ============================================
-- ROLES TABLE
-- ============================================
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name active_role NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.roles (name, display_name, description) VALUES
    ('farmer', 'Farmer', 'Agricultural producer and farm owner'),
    ('worker', 'Agricultural Worker', 'Farm laborer and agricultural worker'),
    ('buyer', 'Buyer', 'Purchases agricultural products'),
    ('seller', 'Seller', 'Sells agricultural products'),
    ('equipment_owner', 'Equipment Owner', 'Owns and rents agricultural equipment'),
    ('expert', 'Agriculture Expert', 'Provides agricultural consultation'),
    ('cooperative_member', 'Cooperative Member', 'Member of an agricultural cooperative'),
    ('admin', 'Administrator', 'Platform administrator');

-- ============================================
-- USER ROLES (many-to-many)
-- ============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id),
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role_id);

-- ============================================
-- USER SESSIONS
-- ============================================
CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = TRUE;

-- ============================================
-- LOGIN HISTORY
-- ============================================
CREATE TABLE public.login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    location_info JSONB DEFAULT '{}',
    login_method TEXT DEFAULT 'password',
    is_success BOOLEAN DEFAULT TRUE,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_history_user ON public.login_history(user_id);
CREATE INDEX idx_login_history_created ON public.login_history(created_at DESC);

-- ============================================
-- OTP VERIFICATION
-- ============================================
CREATE TABLE public.otp_verification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    mobile_number TEXT NOT NULL,
    email TEXT,
    otp_code TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('registration', 'login', 'password_reset', 'phone_verify', 'email_verify')),
    is_used BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_mobile ON public.otp_verification(mobile_number);
CREATE INDEX idx_otp_purpose ON public.otp_verification(purpose, is_used);

-- ============================================
-- PASSWORD RESET
-- ============================================
CREATE TABLE public.password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BLOCKED USERS
-- ============================================
CREATE TABLE public.blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users(blocked_id);

-- ============================================
-- FAILED LOGIN ATTEMPTS (rate limiting)
-- ============================================
CREATE TABLE public.failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL,
    ip_address INET,
    attempts INT DEFAULT 1,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_failed_login_identifier ON public.failed_login_attempts(identifier);

-- ============================================
-- TRUSTED DEVICES
-- ============================================
CREATE TABLE public.trusted_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    is_trusted BOOLEAN DEFAULT FALSE,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX idx_trusted_devices_user ON public.trusted_devices(user_id);

-- ============================================
-- API REQUEST LOGS
-- ============================================
CREATE TABLE public.api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    method TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    status_code INT,
    request_body JSONB,
    response_time_ms INT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_logs_user ON public.api_logs(user_id);
CREATE INDEX idx_api_logs_created ON public.api_logs(created_at DESC);
CREATE INDEX idx_api_logs_endpoint ON public.api_logs(endpoint);
