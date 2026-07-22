-- ============================================================
-- KrishiConnect Nepal — Production Auth Functions
-- Migration 00017: OTP Hashing, Verification, Security Functions
-- ============================================================

-- ============================================
-- CORE: Hash OTP (SHA-256 + pepper)
-- ============================================
CREATE OR REPLACE FUNCTION public.hash_otp(
    p_otp TEXT,
    p_purpose TEXT
) RETURNS TEXT
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_pepper TEXT;
    v_expiry_mins INT;
BEGIN
    -- Get pepper from system settings
    v_pepper := COALESCE(
        (SELECT value::text FROM public.system_settings WHERE key = 'otp_hash_pepper'),
        'kc_fallback_pepper_2025'
    );

    RETURN encode(
        digest(v_pepper || ':' || p_otp || ':' || p_purpose, 'sha256'),
        'hex'
    );
END;
$$;

-- ============================================
-- CORE: Hash a generic token (SHA-256)
-- ============================================
CREATE OR REPLACE FUNCTION public.hash_token(
    p_token TEXT
) RETURNS TEXT
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_pepper TEXT;
BEGIN
    v_pepper := COALESCE(
        (SELECT value::text FROM public.system_settings WHERE key = 'otp_hash_pepper'),
        'kc_fallback_pepper_2025'
    );

    RETURN encode(
        digest(v_pepper || ':token:' || p_token, 'sha256'),
        'hex'
    );
END;
$$;

-- ============================================
-- CORE: Generate OTP (cryptographically secure)
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_otp(
    p_length INT DEFAULT 6
) RETURNS TEXT
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_chars TEXT := '0123456789';
    v_otp   TEXT := '';
    v_byte  BYTEA;
    v_rand  INT;
    i       INT;
BEGIN
    FOR i IN 1..p_length LOOP
        v_byte := gen_random_bytes(1);
        v_rand := (get_byte(v_byte, 0) % 10)::INT;
        v_otp  := v_otp || SUBSTR(v_chars, v_rand + 1, 1);
    END LOOP;

    RETURN v_otp;
END;
$$;

-- ============================================
-- CORE: Mask identifier for logs
-- ============================================
CREATE OR REPLACE FUNCTION public.mask_identifier(
    p_identifier TEXT,
    p_type TEXT
) RETURNS TEXT
    LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
    IF p_type = 'mobile' THEN
        -- +9712345678 → +971***678
        IF LENGTH(p_identifier) > 6 THEN
            RETURN SUBSTR(p_identifier, 1, 3)
                   || '***'
                   || SUBSTR(p_identifier, LENGTH(p_identifier) - 2, 3);
        END IF;
    ELSIF p_type = 'email' THEN
        -- user@example.com → u***@example.com
        IF POSITION('@' IN p_identifier) > 1 THEN
            RETURN SUBSTR(p_identifier, 1, 1)
                   || '***'
                   || SUBSTR(p_identifier, POSITION('@' IN p_identifier));
        END IF;
    END IF;

    RETURN '***';
END;
$$;

-- ============================================
-- CORE: Validate Nepal mobile number
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_nepal_mobile(
    p_mobile TEXT
) RETURNS BOOLEAN
    LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
    -- Nepali mobile: +977 98XXXXXXXX or +977 97XXXXXXXX or 98XXXXXXXX
    IF p_mobile ~ '^\+?977[9][897]\d{8}$' THEN
        RETURN TRUE;
    END IF;

    -- Without country code: 98XXXXXXXX
    IF p_mobile ~ '^[9][897]\d{8}$' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- ============================================
-- CORE: Validate email
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_email(
    p_email TEXT
) RETURNS BOOLEAN
    LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
    IF p_email ~* '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- ============================================
-- CORE: Normalize phone to E.164
-- ============================================
CREATE OR REPLACE FUNCTION public.normalize_phone(
    p_phone TEXT
) RETURNS TEXT
    LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
    -- Already +977...
    IF p_phone ~ '^\+977' THEN
        RETURN p_phone;
    END IF;

    -- Has 977 prefix
    IF p_phone ~ '^977' THEN
        RETURN '+' || p_phone;
    END IF;

    -- Raw local number
    IF p_phone ~ '^[0-9]{10}$' THEN
        RETURN '+977' || p_phone;
    END IF;

    RETURN p_phone;
END;
$$;

-- ============================================
-- CORE: Check rate limit
-- ============================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_scope TEXT,
    p_identifier TEXT,
    p_action TEXT,
    p_max_attempts INT DEFAULT 5,
    p_window_seconds INT DEFAULT 3600
) RETURNS TABLE (
    allowed BOOLEAN,
    remaining INT,
    retry_after TIMESTAMPTZ
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_existing RECORD;
    v_window_start TIMESTAMPTZ;
BEGIN
    -- Check if currently locked
    SELECT locked_until, window_start INTO v_existing
    FROM public.rate_limits
    WHERE scope = p_scope
      AND identifier = p_identifier
      AND action = p_action;

    IF FOUND AND v_existing.locked_until > NOW() THEN
        allowed   := FALSE;
        remaining := 0;
        retry_after := v_existing.locked_until;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Clean expired windows
    DELETE FROM public.rate_limits
    WHERE scope = p_scope
      AND identifier = p_identifier
      AND action = p_action
      AND (NOW() - window_start) > make_interval(secs => p_window_seconds);

    -- Insert or increment
    INSERT INTO public.rate_limits (scope, identifier, action, attempt_count, window_start)
    VALUES (p_scope, p_identifier, p_action, 1, NOW())
    ON CONFLICT (scope, identifier, action)
    DO UPDATE SET attempt_count = public.rate_limits.attempt_count + 1,
                  window_start = CASE
                      WHEN (NOW() - public.rate_limits.window_start) > make_interval(secs => p_window_seconds)
                      THEN NOW()
                      ELSE public.rate_limits.window_start
                  END
    RETURNING attempt_count, window_start INTO v_existing.attempt_count, v_window_start;

    IF v_existing.attempt_count >= p_max_attempts THEN
        -- Lock
        UPDATE public.rate_limits
        SET locked_until = NOW() + make_interval(secs => p_window_seconds)
        WHERE scope = p_scope
          AND identifier = p_identifier
          AND action = p_action;

        allowed   := FALSE;
        remaining := 0;
        retry_after := NOW() + make_interval(secs => p_window_seconds);
        RETURN NEXT;
        RETURN;
    END IF;

    allowed   := TRUE;
    remaining := p_max_attempts - v_existing.attempt_count;
    retry_after := NULL;
    RETURN NEXT;
END;
$$;

-- ============================================
-- CORE: Reset rate limit
-- ============================================
CREATE OR REPLACE FUNCTION public.reset_rate_limit(
    p_scope TEXT,
    p_identifier TEXT,
    p_action TEXT
) RETURNS VOID
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    DELETE FROM public.rate_limits
    WHERE scope = p_scope
      AND identifier = p_identifier
      AND action = p_action;
END;
$$;

-- ============================================
-- OTP: Create OTP record
-- ============================================
CREATE OR REPLACE FUNCTION public.create_otp(
    p_user_id UUID,
    p_identifier TEXT,
    p_identifier_type TEXT,
    p_purpose TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_fingerprint TEXT DEFAULT NULL
) RETURNS TABLE (
    otp_code TEXT,
    otp_id UUID,
    expires_at TIMESTAMPTZ
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_otp        TEXT;
    v_hash       TEXT;
    v_otp_length INT;
    v_expiry_min INT;
    v_max_att    INT;
    v_otp_rec    RECORD;
    v_rate       RECORD;
    v_lock_until TIMESTAMPTZ;
BEGIN
    -- Get config
    v_otp_length := COALESCE(
        (SELECT value::int FROM public.system_settings WHERE key = 'otp_length'), 6);
    v_expiry_min := CASE
        WHEN p_purpose IN ('mobile_verify','email_verify','registration')
            THEN COALESCE((SELECT value::int FROM public.system_settings WHERE key = 'otp_sms_expiry'), 5)
        ELSE COALESCE((SELECT value::int FROM public.system_settings WHERE key = 'otp_email_expiry'), 10)
    END;
    v_max_att := COALESCE(
        (SELECT value::int FROM public.system_settings WHERE key = 'otp_max_attempts'), 5);

    -- Check if user is OTP-locked
    IF p_user_id IS NOT NULL THEN
        SELECT otp_locked_until INTO v_lock_until
        FROM public.users WHERE id = p_user_id;

        IF v_lock_until IS NOT NULL AND v_lock_until > NOW() THEN
            otp_code := NULL;
            otp_id   := NULL;
            expires_at := v_lock_until;
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;

    -- Invalidate any existing OTPs for same identifier + purpose
    UPDATE public.otp_records
    SET is_expired = TRUE
    WHERE identifier = p_identifier
      AND purpose = p_purpose
      AND is_used = FALSE
      AND is_expired = FALSE;

    -- Generate OTP
    v_otp := public.generate_otp(v_otp_length);
    v_hash := public.hash_otp(v_otp, p_purpose);

    -- Insert
    INSERT INTO public.otp_records (
        user_id, identifier, identifier_type, otp_hash, purpose,
        max_attempts, ip_address, user_agent, device_fingerprint,
        expires_at
    ) VALUES (
        p_user_id, p_identifier, p_identifier_type, v_hash, p_purpose,
        v_max_att, p_ip_address, p_user_agent, p_device_fingerprint,
        NOW() + make_interval(mins => v_expiry_min)
    )
    RETURNING id, otp_records.expires_at INTO v_otp_rec;

    -- Log
    INSERT INTO public.verification_logs (
        user_id, event, identifier_type, identifier_masked,
        purpose, ip_address, user_agent, device_fingerprint
    ) VALUES (
        p_user_id, 'otp_created', p_identifier_type,
        public.mask_identifier(p_identifier, p_identifier_type),
        p_purpose, p_ip_address, p_user_agent, p_device_fingerprint
    );

    otp_code    := v_otp;
    otp_id      := v_otp_rec.id;
    expires_at  := v_otp_rec.expires_at;
    RETURN NEXT;
END;
$$;

-- ============================================
-- OTP: Verify OTP
-- ============================================
CREATE OR REPLACE FUNCTION public.verify_otp(
    p_identifier TEXT,
    p_identifier_type TEXT,
    p_otp_code TEXT,
    p_purpose TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_fingerprint TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    user_id UUID,
    message TEXT,
    lock_until TIMESTAMPTZ
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_hash       TEXT;
    v_otp_rec    RECORD;
    v_user_rec   RECORD;
    v_attempts   INT;
BEGIN
    -- Hash provided OTP
    v_hash := public.hash_otp(p_otp_code, p_purpose);

    -- Find matching OTP record
    SELECT * INTO v_otp_rec
    FROM public.otp_records
    WHERE identifier = p_identifier
      AND purpose = p_purpose
      AND is_used = FALSE
      AND is_expired = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        -- Log failed attempt
        INSERT INTO public.verification_logs (
            event, identifier_type, identifier_masked,
            purpose, ip_address, user_agent, metadata
        ) VALUES (
            'otp_failed', p_identifier_type,
            public.mask_identifier(p_identifier, p_identifier_type),
            p_purpose, p_ip_address, p_user_agent,
            jsonb_build_object('reason', 'no_valid_otp')
        );

        success   := FALSE;
        user_id   := NULL;
        message   := 'OTP भेटिएन / No valid OTP found';
        lock_until := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check attempts
    IF v_otp_rec.attempts >= v_otp_rec.max_attempts THEN
        success   := FALSE;
        user_id   := v_otp_rec.user_id;
        message   := 'OTP को प्रयास सीमा सकियो / Max attempts exceeded';
        lock_until := v_otp_rec.expires_at;

        -- Mark OTP as expired
        UPDATE public.otp_records SET is_expired = TRUE WHERE id = v_otp_rec.id;

        -- Lock user
        IF v_otp_rec.user_id IS NOT NULL THEN
            UPDATE public.users SET otp_locked_until = v_otp_rec.expires_at
            WHERE id = v_otp_rec.user_id;

            INSERT INTO public.auth_notifications (
                user_id, type, title, body, metadata
            ) VALUES (
                v_otp_rec.user_id, 'account_locked',
                'Account Temporarily Locked',
                'Too many failed OTP attempts. Please wait 15 minutes.',
                jsonb_build_object('purpose', p_purpose, 'locked_until', v_otp_rec.expires_at)
            );

            INSERT INTO public.verification_logs (
                user_id, event, identifier_type, identifier_masked,
                purpose, ip_address, metadata
            ) VALUES (
                v_otp_rec.user_id, 'otp_locked', p_identifier_type,
                public.mask_identifier(p_identifier, p_identifier_type),
                p_purpose, p_ip_address,
                jsonb_build_object('locked_until', v_otp_rec.expires_at)
            );
        END IF;

        RETURN NEXT;
        RETURN;
    END IF;

    -- Increment attempts
    UPDATE public.otp_records
    SET attempts = attempts + 1
    WHERE id = v_otp_rec.id RETURNING otp_records.attempts INTO v_attempts;

    -- Hash mismatch?
    IF v_otp_rec.otp_hash != v_hash THEN
        INSERT INTO public.verification_logs (
            user_id, event, identifier_type, identifier_masked,
            purpose, ip_address, user_agent, metadata
        ) VALUES (
            v_otp_rec.user_id, 'otp_failed', p_identifier_type,
            public.mask_identifier(p_identifier, p_identifier_type),
            p_purpose, p_ip_address, p_user_agent,
            jsonb_build_object('reason', 'hash_mismatch', 'attempt', v_attempts)
        );

        success   := FALSE;
        user_id   := v_otp_rec.user_id;
        message   := 'गलत OTP / Invalid OTP (' || (v_otp_rec.max_attempts - v_attempts) || ' left)';
        lock_until := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    -- SUCCESS: Mark OTP used
    UPDATE public.otp_records
    SET is_used = TRUE, used_at = NOW()
    WHERE id = v_otp_rec.id;

    -- Reset user's failed OTP counter
    IF v_otp_rec.user_id IS NOT NULL THEN
        UPDATE public.users
        SET failed_otp_attempts = 0,
            otp_locked_until = NULL
        WHERE id = v_otp_rec.user_id;
    END IF;

    -- Log success
    INSERT INTO public.verification_logs (
        user_id, event, identifier_type, identifier_masked,
        purpose, ip_address, user_agent, device_fingerprint
    ) VALUES (
        v_otp_rec.user_id, 'otp_verified', p_identifier_type,
        public.mask_identifier(p_identifier, p_identifier_type),
        p_purpose, p_ip_address, p_user_agent, p_device_fingerprint
    );

    success   := TRUE;
    user_id   := v_otp_rec.user_id;
    message   := 'सफल / Success';
    lock_until := NULL;
    RETURN NEXT;
END;
$$;

-- ============================================
-- OTP: Create verification token (email links)
-- ============================================
CREATE OR REPLACE FUNCTION public.create_verification_token(
    p_user_id UUID,
    p_purpose TEXT,
    p_identifier TEXT
) RETURNS TABLE (
    raw_token TEXT,
    token_id UUID,
    expires_at TIMESTAMPTZ
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_token     TEXT;
    v_token_hash TEXT;
    v_expiry_min INT;
    v_tok_rec   RECORD;
BEGIN
    v_expiry_min := COALESCE(
        (SELECT value::int FROM public.system_settings WHERE key = 'pwd_reset_expiry'), 10);

    -- Generate token: 32 bytes hex
    v_token := encode(gen_random_bytes(32), 'hex');
    v_token_hash := public.hash_token(v_token);

    INSERT INTO public.verification_tokens (
        user_id, token_hash, purpose, identifier, expires_at
    ) VALUES (
        p_user_id, v_token_hash, p_purpose, p_identifier,
        NOW() + make_interval(mins => v_expiry_min)
    ) RETURNING verification_tokens.id, verification_tokens.expires_at INTO v_tok_rec;

    raw_token  := v_token;
    token_id   := v_tok_rec.id;
    expires_at := v_tok_rec.expires_at;
    RETURN NEXT;
END;
$$;

-- ============================================
-- OTP: Verify token (email links)
-- ============================================
CREATE OR REPLACE FUNCTION public.verify_email_token(
    p_token TEXT,
    p_purpose TEXT
) RETURNS TABLE (
    success BOOLEAN,
    user_id UUID,
    message TEXT
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_hash  TEXT;
    v_tok   RECORD;
BEGIN
    v_hash := public.hash_token(p_token);

    SELECT * INTO v_tok
    FROM public.verification_tokens
    WHERE token_hash = v_hash
      AND purpose = p_purpose
      AND is_used = FALSE
      AND expires_at > NOW()
    LIMIT 1;

    IF NOT FOUND THEN
        success := FALSE;
        user_id := NULL;
        message := 'Invalid or expired link';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Mark used
    UPDATE public.verification_tokens SET is_used = TRUE WHERE id = v_tok.id;

    success := TRUE;
    user_id := v_tok.user_id;
    message := 'Verified';
    RETURN NEXT;
END;
$$;

-- ============================================
-- VERIFICATION: Complete mobile verification
-- ============================================
CREATE OR REPLACE FUNCTION public.complete_mobile_verification(
    p_user_id UUID
) RETURNS VOID
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_should_activate BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;

    UPDATE public.users
    SET mobile_verified = TRUE,
        mobile_verified_at = NOW()
    WHERE id = p_user_id;

    -- Check if account should be activated
    IF v_user.account_status = 'pending_verification' THEN
        IF v_user.registration_method = 'mobile' THEN
            v_should_activate := TRUE;
        ELSIF v_user.registration_method = 'both'
              AND v_user.mobile_verified THEN
            v_should_activate := TRUE;
        ELSIF v_user.registration_method = 'email' THEN
            v_should_activate := FALSE;
        END IF;
    END IF;

    IF v_should_activate THEN
        UPDATE public.users
        SET account_status = 'active',
            verification_status = 'verified'
        WHERE id = p_user_id;

        INSERT INTO public.auth_notifications (
            user_id, type, title, body
        ) VALUES (
            p_user_id, 'account_activated',
            'Account Activated',
            'Your mobile number has been verified. Your account is now active.'
        );

        INSERT INTO public.verification_logs (
            user_id, event, identifier_type, purpose, metadata
        ) VALUES (
            p_user_id, 'account_activated', 'mobile',
            'registration', jsonb_build_object('method', 'mobile_otp')
        );
    END IF;

    INSERT INTO public.auth_notifications (
        user_id, type, title, body
    ) VALUES (
        p_user_id, 'otp_verified',
        'Mobile Verified',
        'Your mobile number has been verified successfully.'
    );
END;
$$;

-- ============================================
-- VERIFICATION: Complete email verification
-- ============================================
CREATE OR REPLACE FUNCTION public.complete_email_verification(
    p_user_id UUID
) RETURNS VOID
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_should_activate BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;

    UPDATE public.users
    SET email_verified = TRUE,
        email_verified_at = NOW()
    WHERE id = p_user_id;

    IF v_user.account_status = 'pending_verification' THEN
        IF v_user.registration_method = 'email' THEN
            v_should_activate := TRUE;
        ELSIF v_user.registration_method = 'both'
              AND v_user.email_verified THEN
            v_should_activate := TRUE;
        ELSIF v_user.registration_method = 'mobile' THEN
            v_should_activate := FALSE;
        END IF;
    END IF;

    IF v_should_activate THEN
        UPDATE public.users
        SET account_status = 'active',
            verification_status = 'verified'
        WHERE id = p_user_id;

        INSERT INTO public.auth_notifications (
            user_id, type, title, body
        ) VALUES (
            p_user_id, 'account_activated',
            'Account Activated',
            'Your email has been verified. Your account is now active.'
        );

        INSERT INTO public.verification_logs (
            user_id, event, identifier_type, purpose, metadata
        ) VALUES (
            p_user_id, 'account_activated', 'email',
            'registration', jsonb_build_object('method', 'email_link')
        );
    END IF;

    INSERT INTO public.auth_notifications (
        user_id, type, title, body
    ) VALUES (
        p_user_id, 'otp_verified',
        'Email Verified',
        'Your email address has been verified successfully.'
    );
END;
$$;

-- ============================================
-- VERIFICATION: Get status
-- ============================================
CREATE OR REPLACE FUNCTION public.get_verification_status(
    p_user_id UUID
) RETURNS TABLE (
    mobile_number TEXT,
    mobile_verified BOOLEAN,
    mobile_verified_at TIMESTAMPTZ,
    email TEXT,
    email_verified BOOLEAN,
    email_verified_at TIMESTAMPTZ,
    account_status TEXT,
    verification_status TEXT,
    registration_method TEXT,
    preferred_verification TEXT,
    recent_activity JSONB
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_activity JSONB;
BEGIN
    SELECT
        u.mobile_number, u.mobile_verified, u.mobile_verified_at,
        u.email, u.email_verified, u.email_verified_at,
        u.account_status, u.verification_status,
        u.registration_method, u.preferred_verification
    INTO v_user
    FROM public.users u
    WHERE u.id = p_user_id;

    mobile_number      := v_user.mobile_number;
    mobile_verified    := v_user.mobile_verified;
    mobile_verified_at := v_user.mobile_verified_at;
    email              := v_user.email;
    email_verified     := v_user.email_verified;
    email_verified_at  := v_user.email_verified_at;
    account_status     := v_user.account_status;
    verification_status:= v_user.verification_status;
    registration_method:= v_user.registration_method;
    preferred_verification := v_user.preferred_verification;

    -- Recent verification activity
    SELECT jsonb_agg(jsonb_build_object(
        'event', vl.event,
        'type', vl.identifier_type,
        'masked', vl.identifier_masked,
        'time', vl.created_at
    ) ORDER BY vl.created_at DESC)
    INTO v_activity
    FROM public.verification_logs vl
    WHERE vl.user_id = p_user_id
      AND vl.event IN ('otp_verified','otp_failed','link_verified',
                       'otp_created','otp_sent','account_activated')
    LIMIT 10;

    recent_activity := COALESCE(v_activity, '[]'::JSONB);
    RETURN NEXT;
END;
$$;

-- ============================================
-- LOGIN: Record login attempt
-- ============================================
CREATE OR REPLACE FUNCTION public.record_login(
    p_user_id UUID,
    p_login_method TEXT,
    p_identifier TEXT,
    p_identifier_type TEXT,
    p_is_success BOOLEAN,
    p_failure_reason TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_browser TEXT DEFAULT NULL,
    p_os TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT NULL,
    p_device_name TEXT DEFAULT NULL,
    p_geo_location JSONB DEFAULT NULL
) RETURNS UUID
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.login_history (
        user_id, login_method, identifier_used, identifier_type,
        is_success, failure_reason, ip_address, user_agent,
        browser, os, device_type, device_name, geo_location
    ) VALUES (
        p_user_id, p_login_method, p_identifier, p_identifier_type,
        p_is_success, p_failure_reason, p_ip_address, p_user_agent,
        p_browser, p_os, p_device_type, p_device_name, p_geo_location
    ) RETURNING id INTO v_log_id;

    IF p_is_success THEN
        -- Update user
        UPDATE public.users
        SET last_login = NOW(),
            failed_login_attempts = 0,
            login_locked_until = NULL
        WHERE id = p_user_id;

        -- Check if new device → notification
        IF NOT EXISTS (
            SELECT 1 FROM public.trusted_devices
            WHERE user_id = p_user_id
              AND device_fingerprint = p_device_name
        ) THEN
            INSERT INTO public.auth_notifications (
                user_id, type, title, body, metadata
            ) VALUES (
                p_user_id, 'new_device_login',
                'New Device Login',
                'A new device logged into your account.',
                jsonb_build_object(
                    'browser', p_browser,
                    'os', p_os,
                    'ip', p_ip_address::TEXT,
                    'time', NOW()
                )
            );
        END IF;
    ELSE
        -- Increment failed attempts
        UPDATE public.users
        SET failed_login_attempts = failed_login_attempts + 1
        WHERE id = p_user_id RETURNING failed_login_attempts INTO v_log_id;

        -- Check if should lock (reuse v_log_id as counter)
        IF v_log_id >= 5 THEN
            UPDATE public.users
            SET login_locked_until = NOW() + make_interval(mins => 15),
                captcha_required = TRUE
            WHERE id = p_user_id;

            INSERT INTO public.auth_notifications (
                user_id, type, title, body
            ) VALUES (
                p_user_id, 'account_locked',
                'Account Temporarily Locked',
                'Too many failed login attempts. Account locked for 15 minutes.'
            );
        END IF;
    END IF;

    RETURN v_log_id;
END;
$$;

-- ============================================
-- LOGIN: Check login lock
-- ============================================
CREATE OR REPLACE FUNCTION public.check_login_lock(
    p_identifier TEXT
) RETURNS TABLE (
    is_locked BOOLEAN,
    remaining_seconds INT,
    captcha_required BOOLEAN
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT failed_login_attempts, login_locked_until, captcha_required
    INTO v_user
    FROM public.users
    WHERE mobile_number = p_identifier OR email = p_identifier
    LIMIT 1;

    IF NOT FOUND THEN
        is_locked := FALSE;
        remaining_seconds := 0;
        captcha_required := FALSE;
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_user.login_locked_until IS NOT NULL AND v_user.login_locked_until > NOW() THEN
        is_locked := TRUE;
        remaining_seconds := EXTRACT(EPOCH FROM (v_user.login_locked_until - NOW()))::INT;
        captcha_required := TRUE;
        RETURN NEXT;
        RETURN;
    END IF;

    is_locked := FALSE;
    remaining_seconds := 0;
    captcha_required := v_user.captcha_required;
    RETURN NEXT;
END;
$$;

-- ============================================
-- LOGIN: Record failed login (by identifier)
-- ============================================
CREATE OR REPLACE FUNCTION public.record_failed_login(
    p_identifier TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS INT
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_count INT;
BEGIN
    INSERT INTO public.failed_login_attempts (identifier, ip_address, user_agent)
    VALUES (p_identifier, p_ip_address, p_user_agent)
    ON CONFLICT (identifier)
    DO UPDATE SET attempts = public.failed_login_attempts.attempts + 1
    RETURNING attempts INTO v_count;

    RETURN v_count;
END;
$$;

-- ============================================
-- CONTACT: Request mobile/email change
-- ============================================
CREATE OR REPLACE FUNCTION public.request_contact_change(
    p_user_id UUID,
    p_change_type TEXT,
    p_new_value TEXT,
    p_password_hash TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    otp_id UUID
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_old_value TEXT;
    v_otp_rec RECORD;
BEGIN
    -- Verify password
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;

    IF NOT auth.verify(
        v_user.auth_id,
        p_password_hash
    ) THEN
        success := FALSE;
        message := 'Password is incorrect';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check new value isn't already in use
    IF p_change_type = 'mobile' THEN
        IF EXISTS (SELECT 1 FROM public.users WHERE mobile_number = p_new_value AND id != p_user_id) THEN
            success := FALSE;
            message := 'Mobile number already in use';
            RETURN NEXT;
            RETURN;
        END IF;
        v_old_value := v_user.mobile_number;
    ELSIF p_change_type = 'email' THEN
        IF EXISTS (SELECT 1 FROM public.users WHERE email = p_new_value AND id != p_user_id) THEN
            success := FALSE;
            message := 'Email already in use';
            RETURN NEXT;
            RETURN;
        END IF;
        v_old_value := v_user.email;
    END IF;

    -- Create change request
    INSERT INTO public.contact_change_requests (
        user_id, change_type, old_value, new_value
    ) VALUES (
        p_user_id, p_change_type, v_old_value, p_new_value
    );

    -- Generate OTP for new value
    SELECT * INTO v_otp_rec
    FROM public.create_otp(
        p_user_id, p_new_value, p_change_type,
        p_change_type || '_change'
    );

    success := TRUE;
    message := 'OTP sent to new ' || p_change_type;
    otp_id  := v_otp_rec.otp_id;
    RETURN NEXT;
END;
$$;

-- ============================================
-- CONTACT: Complete mobile change
-- ============================================
CREATE OR REPLACE FUNCTION public.complete_mobile_change(
    p_user_id UUID,
    p_new_mobile TEXT
) RETURNS VOID
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_old TEXT;
BEGIN
    SELECT mobile_number INTO v_old FROM public.users WHERE id = p_user_id;

    UPDATE public.users
    SET previous_mobile = v_old,
        mobile_number = p_new_mobile,
        mobile_verified = TRUE,
        mobile_verified_at = NOW(),
        mobile_changed_at = NOW()
    WHERE id = p_user_id;

    UPDATE public.contact_change_requests
    SET is_verified = TRUE, is_completed = TRUE, completed_at = NOW()
    WHERE user_id = p_user_id
      AND change_type = 'mobile'
      AND new_value = p_new_mobile
      AND is_completed = FALSE;

    INSERT INTO public.auth_notifications (
        user_id, type, title, body
    ) VALUES (
        p_user_id, 'phone_changed',
        'Phone Number Changed',
        'Your phone number has been updated successfully.'
    );

    INSERT INTO public.verification_logs (
        user_id, event, identifier_type, purpose, metadata
    ) VALUES (
        p_user_id, 'mobile_changed', 'mobile', 'mobile_change',
        jsonb_build_object('old', public.mask_identifier(v_old, 'mobile'),
                           'new', public.mask_identifier(p_new_mobile, 'mobile'))
    );
END;
$$;

-- ============================================
-- CONTACT: Complete email change
-- ============================================
CREATE OR REPLACE FUNCTION public.complete_email_change(
    p_user_id UUID,
    p_new_email TEXT
) RETURNS VOID
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_old TEXT;
BEGIN
    SELECT email INTO v_old FROM public.users WHERE id = p_user_id;

    UPDATE public.users
    SET previous_email = v_old,
        email = p_new_email,
        email_verified = TRUE,
        email_verified_at = NOW(),
        email_changed_at = NOW()
    WHERE id = p_user_id;

    UPDATE public.contact_change_requests
    SET is_verified = TRUE, is_completed = TRUE, completed_at = NOW()
    WHERE user_id = p_user_id
      AND change_type = 'email'
      AND new_value = p_new_email
      AND is_completed = FALSE;

    INSERT INTO public.auth_notifications (
        user_id, type, title, body
    ) VALUES (
        p_user_id, 'email_changed',
        'Email Changed',
        'Your email address has been updated successfully.'
    );

    INSERT INTO public.verification_logs (
        user_id, event, identifier_type, purpose, metadata
    ) VALUES (
        p_user_id, 'email_changed', 'email', 'email_change',
        jsonb_build_object('old', public.mask_identifier(v_old, 'email'),
                           'new', public.mask_identifier(p_new_email, 'email'))
    );
END;
$$;

-- ============================================
-- PASSWORD: Create reset token
-- ============================================
CREATE OR REPLACE FUNCTION public.create_password_reset(
    p_identifier TEXT,
    p_ip_address INET DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    method TEXT,
    user_id UUID,
    message TEXT
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_token_rec RECORD;
BEGIN
    -- Find user by mobile or email
    SELECT id, email, mobile_number, email_verified
    INTO v_user
    FROM public.users
    WHERE mobile_number = p_identifier
       OR email = p_identifier
    LIMIT 1;

    IF NOT FOUND THEN
        -- Don't reveal if user exists
        success := TRUE;
        method  := NULL;
        user_id := NULL;
        message := 'If an account exists, you will receive instructions.';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Prefer email if verified
    IF v_user.email_verified AND v_user.email IS NOT NULL THEN
        SELECT * INTO v_token_rec
        FROM public.create_verification_token(v_user.id, 'password_reset', v_user.email);

        INSERT INTO public.verification_logs (
            user_id, event, purpose, metadata
        ) VALUES (
            v_user.id, 'link_sent', 'password_reset',
            jsonb_build_object('method', 'email_link')
        );

        success := TRUE;
        method  := 'email_link';
        user_id := v_user.id;
        message := 'Password reset link sent to email.';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Use mobile OTP
    IF v_user.mobile_number IS NOT NULL THEN
        SELECT * INTO v_token_rec
        FROM public.create_otp(
            v_user.id, v_user.mobile_number, 'mobile',
            'password_reset', p_ip_address
        );

        INSERT INTO public.verification_logs (
            user_id, event, purpose, metadata
        ) VALUES (
            v_user.id, 'otp_created', 'password_reset',
            jsonb_build_object('method', 'sms_otp')
        );

        success := TRUE;
        method  := 'sms_otp';
        user_id := v_user.id;
        message := 'OTP sent to mobile.';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Fallback: email (even if not verified)
    IF v_user.email IS NOT NULL THEN
        SELECT * INTO v_token_rec
        FROM public.create_verification_token(v_user.id, 'password_reset', v_user.email);

        success := TRUE;
        method  := 'email_link';
        user_id := v_user.id;
        message := 'Password reset link sent.';
        RETURN NEXT;
        RETURN;
    END IF;

    success := FALSE;
    method  := NULL;
    user_id := v_user.id;
    message := 'No contact method available.';
    RETURN NEXT;
END;
$$;

-- ============================================
-- PASSWORD: Reset password
-- ============================================
CREATE OR REPLACE FUNCTION public.reset_password(
    p_user_id UUID,
    p_new_password_hash TEXT
) RETURNS VOID
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    UPDATE public.auth.users
    SET encrypted_password = p_new_password_hash,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.auth_notifications (
        user_id, type, title, body
    ) VALUES (
        p_user_id, 'password_changed',
        'Password Changed',
        'Your password has been changed successfully. If you did not make this change, please contact support immediately.'
    );

    INSERT INTO public.verification_logs (
        user_id, event, purpose
    ) VALUES (
        p_user_id, 'password_reset_completed', 'password_reset'
    );
END;
$$;

-- ============================================
-- CLEANUP: Expired OTPs (cron)
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS INT
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_count INT;
BEGIN
    -- Expire old OTPs
    UPDATE public.otp_records
    SET is_expired = TRUE
    WHERE is_used = FALSE
      AND is_expired = FALSE
      AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Delete very old OTPs (7 days)
    DELETE FROM public.otp_records
    WHERE created_at < NOW() - make_interval(days => 7);

    -- Delete old logs (90 days)
    DELETE FROM public.verification_logs
    WHERE created_at < NOW() - make_interval(days => 90);

    -- Delete expired tokens
    DELETE FROM public.verification_tokens
    WHERE expires_at < NOW() - make_interval(days => 1);

    -- Delete old rate limits
    DELETE FROM public.rate_limits
    WHERE created_at < NOW() - make_interval(days => 7);

    -- Delete old login history (180 days)
    DELETE FROM public.login_history
    WHERE created_at < NOW() - make_interval(days => 180);

    RETURN v_count;
END;
$$;

-- ============================================
-- NOTIFICATION: Send auth notification
-- ============================================
CREATE OR REPLACE FUNCTION public.send_auth_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.auth_notifications (
        user_id, type, title, body, metadata
    ) VALUES (
        p_user_id, p_type, p_title, p_body, p_metadata
    ) RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- ============================================
-- NOTIFICATION: Mark as read
-- ============================================
CREATE OR REPLACE FUNCTION public.mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
) RETURNS VOID
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    UPDATE public.auth_notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE id = p_notification_id AND user_id = p_user_id;
END;
$$;

-- ============================================
-- NOTIFICATION: Get unread count
-- ============================================
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(
    p_user_id UUID
) RETURNS INT
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.auth_notifications
    WHERE user_id = p_user_id AND is_read = FALSE;

    RETURN v_count;
END;
$$;
