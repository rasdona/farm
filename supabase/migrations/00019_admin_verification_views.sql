-- ============================================================
-- KrishiConnect Nepal — Admin Views & Functions
-- Migration 00019: Admin Panel Queries
-- ============================================================

-- ============================================
-- VIEW: Admin Verification Dashboard
-- ============================================
CREATE OR REPLACE VIEW public.v_admin_verification_dashboard AS
SELECT
    u.id AS user_id,
    u.full_name,
    u.mobile_number,
    u.mobile_verified,
    u.mobile_verified_at,
    u.email,
    u.email_verified,
    u.email_verified_at,
    u.account_status,
    u.verification_status,
    u.registration_method,
    u.preferred_verification,
    u.failed_otp_attempts,
    u.otp_locked_until,
    u.failed_login_attempts,
    u.login_locked_until,
    u.captcha_required,
    u.last_login,
    u.created_at,
    COALESCE(
        (SELECT COUNT(*)
         FROM public.verification_logs vl
         WHERE vl.user_id = u.id AND vl.event = 'otp_failed'
           AND vl.created_at > NOW() - make_interval(days => 1)),
        0
    ) AS failed_otps_today,
    COALESCE(
        (SELECT COUNT(*)
         FROM public.login_history lh
         WHERE lh.user_id = u.id AND lh.is_success = FALSE
           AND lh.created_at > NOW() - make_interval(days => 1)),
        0
    ) AS failed_logins_today,
    COALESCE(
        (SELECT COUNT(*)
         FROM public.auth_notifications an
         WHERE an.user_id = u.id AND an.is_read = FALSE),
        0
    ) AS unread_notifications
FROM public.users u
ORDER BY u.created_at DESC;

-- ============================================
-- VIEW: Admin OTP Logs (never shows actual OTP)
-- ============================================
CREATE OR REPLACE VIEW public.v_admin_otp_logs AS
SELECT
    o.id AS otp_id,
    o.user_id,
    u.full_name,
    o.identifier_masked,
    o.identifier_type,
    o.purpose,
    o.attempts,
    o.max_attempts,
    o.is_used,
    o.is_expired,
    o.delivery_status,
    o.delivery_error,
    o.delivery_provider,
    o.ip_address,
    o.expires_at,
    o.used_at,
    o.created_at,
    CASE
        WHEN o.is_used THEN 'Verified'
        WHEN o.is_expired AND o.expires_at < NOW() THEN 'Expired'
        WHEN o.attempts >= o.max_attempts THEN 'Locked'
        ELSE 'Pending'
    END AS status
FROM public.otp_records o
LEFT JOIN public.users u ON o.user_id = u.id
ORDER BY o.created_at DESC;

-- ============================================
-- VIEW: Admin Verification Audit
-- ============================================
CREATE OR REPLACE VIEW public.v_admin_verification_audit AS
SELECT
    vl.id AS log_id,
    vl.user_id,
    u.full_name,
    vl.event,
    vl.identifier_type,
    vl.identifier_masked,
    vl.purpose,
    vl.ip_address,
    vl.user_agent,
    vl.metadata,
    vl.created_at
FROM public.verification_logs vl
LEFT JOIN public.users u ON vl.user_id = u.id
ORDER BY vl.created_at DESC;

-- ============================================
-- VIEW: Admin Failed Attempts
-- ============================================
CREATE OR REPLACE VIEW public.v_admin_failed_attempts AS
SELECT
    f.id,
    f.identifier,
    f.ip_address,
    f.user_agent,
    f.attempts,
    f.locked_until,
    f.created_at,
    CASE
        WHEN f.locked_until IS NOT NULL AND f.locked_until > NOW() THEN 'Locked'
        WHEN f.locked_until IS NOT NULL AND f.locked_until <= NOW() THEN 'Expired Lock'
        ELSE 'Active'
    END AS lock_status
FROM public.failed_login_attempts f
WHERE f.attempts >= 3
ORDER BY f.created_at DESC;

-- ============================================
-- VIEW: Admin Verification Stats
-- ============================================
CREATE OR REPLACE VIEW public.v_admin_verification_stats AS
SELECT
    DATE(created_at) AS date,
    event,
    identifier_type,
    COUNT(*) AS total,
    COUNT(CASE WHEN event = 'otp_verified' THEN 1 END) AS verified,
    COUNT(CASE WHEN event = 'otp_failed' THEN 1 END) AS failed,
    COUNT(CASE WHEN event = 'otp_created' THEN 1 END) AS created
FROM public.verification_logs
WHERE created_at > NOW() - make_interval(days => 30)
GROUP BY DATE(created_at), event, identifier_type
ORDER BY date DESC;

-- ============================================
-- VIEW: Admin Login History
-- ============================================
CREATE OR REPLACE VIEW public.v_admin_login_history AS
SELECT
    lh.id,
    lh.user_id,
    u.full_name,
    u.mobile_number,
    u.email,
    lh.login_method,
    lh.identifier_used,
    lh.identifier_type,
    lh.is_success,
    lh.failure_reason,
    lh.ip_address,
    lh.browser,
    lh.os,
    lh.device_type,
    lh.device_name,
    lh.geo_location,
    lh.created_at
FROM public.login_history lh
LEFT JOIN public.users u ON lh.user_id = u.id
ORDER BY lh.created_at DESC;

-- ============================================
-- FUNCTION: Admin search users
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_search_users(
    p_query TEXT,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
) RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    mobile_number TEXT,
    email TEXT,
    account_status TEXT,
    mobile_verified BOOLEAN,
    email_verified BOOLEAN,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.full_name,
        u.mobile_number,
        u.email,
        u.account_status::TEXT,
        u.mobile_verified,
        u.email_verified,
        u.last_login,
        u.created_at
    FROM public.users u
    WHERE
        u.full_name ILIKE '%' || p_query || '%'
        OR u.mobile_number ILIKE '%' || p_query || '%'
        OR u.email ILIKE '%' || p_query || '%'
    ORDER BY u.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ============================================
-- FUNCTION: Admin OTP delivery stats
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_otp_delivery_stats(
    p_days INT DEFAULT 30
) RETURNS TABLE (
    date DATE,
    purpose TEXT,
    identifier_type TEXT,
    total_created BIGINT,
    total_sent BIGINT,
    total_delivered BIGINT,
    total_failed BIGINT,
    total_verified BIGINT,
    avg_attempts NUMERIC
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(o.created_at),
        o.purpose,
        o.identifier_type,
        COUNT(*) AS total_created,
        COUNT(CASE WHEN o.delivery_status IN ('sent','delivered') THEN 1 END) AS total_sent,
        COUNT(CASE WHEN o.delivery_status = 'delivered' THEN 1 END) AS total_delivered,
        COUNT(CASE WHEN o.delivery_status = 'failed' THEN 1 END) AS total_failed,
        COUNT(CASE WHEN o.is_used THEN 1 END) AS total_verified,
        ROUND(AVG(o.attempts), 2) AS avg_attempts
    FROM public.otp_records o
    WHERE o.created_at > NOW() - make_interval(days => p_days)
    GROUP BY DATE(o.created_at), o.purpose, o.identifier_type
    ORDER BY DATE(o.created_at) DESC;
END;
$$;

-- ============================================
-- FUNCTION: Admin user verification timeline
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_user_verification_timeline(
    p_user_id UUID
) RETURNS TABLE (
    event TEXT,
    event_time TIMESTAMPTZ,
    identifier_type TEXT,
    purpose TEXT,
    metadata JSONB
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        vl.event,
        vl.created_at,
        vl.identifier_type,
        vl.purpose,
        vl.metadata
    FROM public.verification_logs vl
    WHERE vl.user_id = p_user_id
    ORDER BY vl.created_at DESC
    LIMIT 50;
END;
$$;

-- ============================================
-- FUNCTION: Admin unlock account
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_unlock_account(
    p_user_id UUID,
    p_admin_id UUID,
    p_reason TEXT DEFAULT 'Admin unlock'
) RETURNS VOID
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    UPDATE public.users
    SET failed_otp_attempts = 0,
        otp_locked_until = NULL,
        failed_login_attempts = 0,
        login_locked_until = NULL,
        captcha_required = FALSE
    WHERE id = p_user_id;

    INSERT INTO public.verification_logs (
        user_id, event, purpose, metadata
    ) VALUES (
        p_user_id, 'account_unlocked', 'admin',
        jsonb_build_object('admin_id', p_admin_id, 'reason', p_reason)
    );

    INSERT INTO public.auth_notifications (
        user_id, type, title, body
    ) VALUES (
        p_user_id, 'account_unlocked',
        'Account Unlocked',
        'Your account has been unlocked by an administrator.'
    );
END;
$$;

-- ============================================
-- FUNCTION: Admin resend verification
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_resend_verification(
    p_user_id UUID,
    p_admin_id UUID,
    p_method TEXT DEFAULT 'mobile'
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    otp_code TEXT
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_otp_rec RECORD;
BEGIN
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;

    IF NOT FOUND THEN
        success := FALSE;
        message := 'User not found';
        RETURN NEXT;
        RETURN;
    END IF;

    IF p_method = 'mobile' AND v_user.mobile_number IS NOT NULL THEN
        SELECT * INTO v_otp_rec
        FROM public.create_otp(
            p_user_id, v_user.mobile_number, 'mobile',
            'mobile_verify', NULL, 'admin_resend'
        );

        INSERT INTO public.verification_logs (
            user_id, event, purpose, metadata
        ) VALUES (
            p_user_id, 'otp_resend', 'mobile_verify',
            jsonb_build_object('admin_id', p_admin_id)
        );

        success := TRUE;
        message := 'OTP sent to mobile';
        otp_code := v_otp_rec.otp_code;
        RETURN NEXT;
        RETURN;
    ELSIF p_method = 'email' AND v_user.email IS NOT NULL THEN
        SELECT * INTO v_otp_rec
        FROM public.create_otp(
            p_user_id, v_user.email, 'email',
            'email_verify', NULL, 'admin_resend'
        );

        INSERT INTO public.verification_logs (
            user_id, event, purpose, metadata
        ) VALUES (
            p_user_id, 'otp_resend', 'email_verify',
            jsonb_build_object('admin_id', p_admin_id)
        );

        success := TRUE;
        message := 'OTP sent to email';
        otp_code := v_otp_rec.otp_code;
        RETURN NEXT;
        RETURN;
    END IF;

    success := FALSE;
    message := 'Method not available for this user';
    RETURN NEXT;
END;
$$;

-- ============================================
-- FUNCTION: Admin view locked accounts
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_view_locked_accounts()
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    mobile_number TEXT,
    email TEXT,
    locked_type TEXT,
    locked_until TIMESTAMPTZ,
    failed_attempts INT,
    locked_since TIMESTAMPTZ
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.full_name,
        u.mobile_number,
        u.email,
        CASE
            WHEN u.otp_locked_until > NOW() THEN 'otp'
            WHEN u.login_locked_until > NOW() THEN 'login'
        END AS locked_type,
        CASE
            WHEN u.otp_locked_until > NOW() THEN u.otp_locked_until
            ELSE u.login_locked_until
        END AS locked_until,
        CASE
            WHEN u.failed_otp_attempts > 0 THEN u.failed_otp_attempts
            ELSE u.failed_login_attempts
        END AS failed_attempts,
        CASE
            WHEN u.otp_locked_until > NOW() THEN u.otp_locked_until - make_interval(mins => 15)
            ELSE u.login_locked_until - make_interval(mins => 15)
        END AS locked_since
    FROM public.users u
    WHERE (u.otp_locked_until IS NOT NULL AND u.otp_locked_until > NOW())
       OR (u.login_locked_until IS NOT NULL AND u.login_locked_until > NOW());
END;
$$;
