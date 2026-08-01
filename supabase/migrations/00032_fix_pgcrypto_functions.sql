-- ============================================================
-- KrishiConnect Nepal — Hotfix: remove pgcrypto dependency
-- OTP functions crashed with:
--   "function gen_random_bytes(integer) does not exist"
--   "function digest(text, text) does not exist"
-- pgcrypto was not available in the project schema. Rewrite the
-- four auth functions using core-only PostgreSQL builtins:
--   - sha256(bytea)  (core, PG 10+)
--   - gen_random_uuid() (core, PG 13+)
--   - random()       (core)
-- Also fixes the JSONB value cast in create_verification_token.
-- ============================================================

-- Best-effort: enable pgcrypto if the extension is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CORE: Hash OTP (SHA-256 + pepper) — no pgcrypto
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
BEGIN
    v_pepper := COALESCE(
        (SELECT value::text FROM public.system_settings WHERE key = 'otp_hash_pepper'),
        'kc_fallback_pepper_2025'
    );

    RETURN encode(
        sha256(convert_to(v_pepper || ':' || p_otp || ':' || p_purpose, 'UTF8')),
        'hex'
    );
END;
$$;

-- ============================================
-- CORE: Hash a generic token (SHA-256) — no pgcrypto
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
        sha256(convert_to(v_pepper || ':token:' || p_token, 'UTF8')),
        'hex'
    );
END;
$$;

-- ============================================
-- CORE: Generate OTP (random digits) — no pgcrypto
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_otp(
    p_length INT DEFAULT 6
) RETURNS TEXT
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_otp TEXT := '';
    i     INT;
BEGIN
    FOR i IN 1..p_length LOOP
        v_otp := v_otp || FLOOR(random() * 10)::TEXT;
    END LOOP;

    RETURN v_otp;
END;
$$;

-- ============================================
-- CORE: Create verification token — no pgcrypto
-- 32 random bytes as 64 hex chars (two core UUIDs)
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
        (SELECT value::text::int FROM public.system_settings WHERE key = 'pwd_reset_expiry'),
        10
    );

    -- Generate token: 64 hex chars (32 bytes)
    v_token := REPLACE(gen_random_uuid()::text, '-', '')
            || REPLACE(gen_random_uuid()::text, '-', '');
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

GRANT EXECUTE ON FUNCTION public.hash_otp(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.hash_token(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_otp(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_verification_token(UUID, TEXT, TEXT) TO service_role;
