-- ============================================================
-- KrishiConnect Nepal — Hotfix: JSONB value casts
-- PostgreSQL has no jsonb -> int/bigint/boolean cast.
-- system_settings.value is JSONB; must go through ::text first.
-- Re-defines create_otp (00017) which crashed with
-- "cannot cast type jsonb to integer" on every invocation.
-- Also allows 'otp_sent' in auth_notifications.type so the
-- send_auth_notification log RPC in send-otp succeeds.
-- ============================================================

-- Allow otp_sent notification type
ALTER TABLE public.auth_notifications
    DROP CONSTRAINT IF EXISTS auth_notifications_type_check;

ALTER TABLE public.auth_notifications
    ADD CONSTRAINT auth_notifications_type_check
    CHECK (type IN (
        'new_login','password_changed','phone_changed',
        'email_changed','otp_verified','otp_sent',
        'account_activated','new_device_login',
        'account_locked','account_unlocked'));

-- ============================================
-- Re-define create_otp with fixed settings casts
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
    v_lock_until TIMESTAMPTZ;
BEGIN
    -- Get config
    v_otp_length := COALESCE(
        (SELECT value::text::int FROM public.system_settings WHERE key = 'otp_length'), 6);
    v_expiry_min := CASE
        WHEN p_purpose IN ('mobile_verify','email_verify','registration')
            THEN COALESCE((SELECT value::text::int FROM public.system_settings WHERE key = 'otp_sms_expiry'), 5)
        ELSE COALESCE((SELECT value::text::int FROM public.system_settings WHERE key = 'otp_email_expiry'), 10)
    END;
    v_max_att := COALESCE(
        (SELECT value::text::int FROM public.system_settings WHERE key = 'otp_max_attempts'), 5);

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

GRANT EXECUTE ON FUNCTION public.create_otp(UUID, TEXT, TEXT, TEXT, INET, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_otp(UUID, TEXT, TEXT, TEXT, INET, TEXT, TEXT) TO authenticated;
