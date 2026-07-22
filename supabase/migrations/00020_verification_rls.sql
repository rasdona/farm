-- ============================================================
-- KrishiConnect Nepal — RLS & Permissions
-- Migration 00020: Row Level Security for Auth Tables
-- ============================================================

-- Enable RLS
ALTER TABLE public.otp_records             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_notifications      ENABLE ROW LEVEL SECURITY;

-- ============================================
-- OTP Records: Only service role
-- ============================================
DROP POLICY IF EXISTS "otp_service_all" ON public.otp_records;
CREATE POLICY "otp_service_all" ON public.otp_records
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- Verification Tokens: Only service role
-- ============================================
DROP POLICY IF EXISTS "vt_service_all" ON public.verification_tokens;
CREATE POLICY "vt_service_all" ON public.verification_tokens
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- Verification Logs: Service role + own reads (masked)
-- ============================================
DROP POLICY IF EXISTS "vl_service_all" ON public.verification_logs;
CREATE POLICY "vl_service_all" ON public.verification_logs
    FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "vl_user_select" ON public.verification_logs;
CREATE POLICY "vl_user_select" ON public.verification_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- ============================================
-- Rate Limits: Service role only
-- ============================================
DROP POLICY IF EXISTS "rl_service_all" ON public.rate_limits;
CREATE POLICY "rl_service_all" ON public.rate_limits
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- Contact Change Requests: Service role + own reads
-- ============================================
DROP POLICY IF EXISTS "ccr_service_all" ON public.contact_change_requests;
CREATE POLICY "ccr_service_all" ON public.contact_change_requests
    FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "ccr_user_select" ON public.contact_change_requests;
CREATE POLICY "ccr_user_select" ON public.contact_change_requests
    FOR SELECT
    USING (user_id = auth.uid());

-- ============================================
-- Login History: Service role + own reads
-- ============================================
DROP POLICY IF EXISTS "lh_service_all" ON public.login_history;
CREATE POLICY "lh_service_all" ON public.login_history
    FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "lh_user_select" ON public.login_history;
CREATE POLICY "lh_user_select" ON public.login_history
    FOR SELECT
    USING (user_id = auth.uid());

-- ============================================
-- Failed Login Attempts: Service role only
-- ============================================
DROP POLICY IF EXISTS "fla_service_all" ON public.failed_login_attempts;
CREATE POLICY "fla_service_all" ON public.failed_login_attempts
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- User Sessions: Service role + own reads
-- ============================================
DROP POLICY IF EXISTS "us_service_all" ON public.user_sessions;
CREATE POLICY "us_service_all" ON public.user_sessions
    FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "us_user_select" ON public.user_sessions;
CREATE POLICY "us_user_select" ON public.user_sessions
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "us_user_update" ON public.user_sessions;
CREATE POLICY "us_user_update" ON public.user_sessions
    FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================
-- Trusted Devices: Service role + own CRUD
-- ============================================
DROP POLICY IF EXISTS "td_service_all" ON public.trusted_devices;
CREATE POLICY "td_service_all" ON public.trusted_devices
    FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "td_user_select" ON public.trusted_devices;
CREATE POLICY "td_user_select" ON public.trusted_devices
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "td_user_delete" ON public.trusted_devices;
CREATE POLICY "td_user_delete" ON public.trusted_devices
    FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- Auth Notifications: Service role + own reads
-- ============================================
DROP POLICY IF EXISTS "an_service_all" ON public.auth_notifications;
CREATE POLICY "an_service_all" ON public.auth_notifications
    FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "an_user_select" ON public.auth_notifications;
CREATE POLICY "an_user_select" ON public.auth_notifications
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "an_user_update" ON public.auth_notifications;
CREATE POLICY "an_user_update" ON public.auth_notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================
-- GRANT permissions
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON public.verification_logs  TO authenticated;
GRANT SELECT ON public.login_history      TO authenticated;
GRANT SELECT ON public.auth_notifications TO authenticated;
GRANT SELECT ON public.user_sessions      TO authenticated;
GRANT SELECT ON public.trusted_devices    TO authenticated;
GRANT SELECT ON public.contact_change_requests TO authenticated;
GRANT UPDATE ON public.auth_notifications TO authenticated;
GRANT UPDATE ON public.user_sessions      TO authenticated;
GRANT DELETE ON public.trusted_devices    TO authenticated;

-- ============================================
-- Admin Views: Only service role (Edge Functions)
-- ============================================
REVOKE ALL ON public.v_admin_verification_dashboard FROM authenticated;
REVOKE ALL ON public.v_admin_otp_logs FROM authenticated;
REVOKE ALL ON public.v_admin_verification_audit FROM authenticated;
REVOKE ALL ON public.v_admin_failed_attempts FROM authenticated;
REVOKE ALL ON public.v_admin_verification_stats FROM authenticated;
REVOKE ALL ON public.v_admin_login_history FROM authenticated;

GRANT SELECT ON public.v_admin_verification_dashboard TO service_role;
GRANT SELECT ON public.v_admin_otp_logs TO service_role;
GRANT SELECT ON public.v_admin_verification_audit TO service_role;
GRANT SELECT ON public.v_admin_failed_attempts TO service_role;
GRANT SELECT ON public.v_admin_verification_stats TO service_role;
GRANT SELECT ON public.v_admin_login_history TO service_role;

-- ============================================
-- Admin Functions: Only service role
-- ============================================
GRANT EXECUTE ON FUNCTION public.admin_search_users TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_otp_delivery_stats TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_user_verification_timeline TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_unlock_account TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_resend_verification TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_view_locked_accounts TO service_role;

-- ============================================
-- Auth Functions: Service role only
-- ============================================
GRANT EXECUTE ON FUNCTION public.hash_otp TO service_role;
GRANT EXECUTE ON FUNCTION public.hash_token TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_otp TO service_role;
GRANT EXECUTE ON FUNCTION public.create_otp TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_otp TO service_role;
GRANT EXECUTE ON FUNCTION public.create_verification_token TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_email_token TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_mobile_verification TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_email_verification TO service_role;
GRANT EXECUTE ON FUNCTION public.get_verification_status TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login TO service_role;
GRANT EXECUTE ON FUNCTION public.check_login_lock TO service_role;
GRANT EXECUTE ON FUNCTION public.record_failed_login TO service_role;
GRANT EXECUTE ON FUNCTION public.request_contact_change TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_mobile_change TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_email_change TO service_role;
GRANT EXECUTE ON FUNCTION public.create_password_reset TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_password TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_otps TO service_role;
GRANT EXECUTE ON FUNCTION public.send_auth_notification TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO service_role;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_nepal_mobile TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_email TO service_role;
GRANT EXECUTE ON FUNCTION public.normalize_phone TO service_role;
GRANT EXECUTE ON FUNCTION public.mask_identifier TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit TO service_role;
