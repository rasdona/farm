-- ============================================================
-- KrishiConnect Nepal — Farm Work Admin & RLS
-- Migration 00024: Admin views, RLS, permissions
-- ============================================================

-- ============================================
-- VIEW: Admin Work Dashboard
-- ============================================
CREATE OR REPLACE VIEW public.v_admin_work_dashboard AS
SELECT
    wr.id AS request_id,
    wr.title,
    wc.name_en AS category,
    u.full_name AS farmer_name,
    wr.work_date,
    wr.workers_needed,
    wr.workers_assigned,
    wr.payment_type,
    wr.payment_amount,
    wr.status,
    wr.province_id,
    wr.district_id,
    wr.application_count,
    wr.view_count,
    wr.created_at
FROM public.work_requests wr
LEFT JOIN public.work_categories wc ON wc.id = wr.category_id
LEFT JOIN public.users u ON u.id = wr.farmer_id
ORDER BY wr.created_at DESC;

-- ============================================
-- VIEW: Admin Work Stats
-- ============================================
CREATE OR REPLACE VIEW public.v_admin_work_stats AS
SELECT
    DATE(created_at) AS date,
    status,
    payment_type,
    COUNT(*) AS total,
    SUM(workers_needed) AS workers_needed_total,
    SUM(workers_assigned) AS workers_assigned_total,
    AVG(payment_amount) AS avg_payment
FROM public.work_requests
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), status, payment_type
ORDER BY date DESC;

-- ============================================
-- VIEW: Admin Worker Activity
-- ============================================
CREATE OR REPLACE VIEW public.v_admin_worker_activity AS
SELECT
    u.id AS worker_id,
    u.full_name,
    u.mobile_number,
    COUNT(DISTINCT aw.id) AS tasks_completed,
    COUNT(DISTINCT wa.id) AS applications_sent,
    ROUND(AVG(wr_r.overall_rating), 2) AS avg_rating,
    MAX(aw.check_out_time) AS last_task_date
FROM public.users u
LEFT JOIN public.assigned_workers aw ON aw.worker_id = u.id AND aw.status = 'completed'
LEFT JOIN public.work_applications wa ON wa.worker_id = u.id
LEFT JOIN public.work_ratings wr_r ON wr_r.ratee_id = u.id
WHERE u.active_role = 'worker'
GROUP BY u.id, u.full_name, u.mobile_number
ORDER BY tasks_completed DESC;

-- ============================================
-- VIEW: Admin Payment Monitor
-- ============================================
CREATE OR REPLACE VIEW public.v_admin_payment_monitor AS
SELECT
    wp.id,
    wp.amount,
    wp.currency,
    wp.payment_type,
    wp.payment_method,
    wp.status,
    u_f.full_name AS farmer_name,
    u_w.full_name AS worker_name,
    wr.title AS task_title,
    wp.paid_at,
    wp.created_at
FROM public.work_payments wp
LEFT JOIN public.users u_f ON u_f.id = wp.farmer_id
LEFT JOIN public.users u_w ON u_w.id = wp.worker_id
LEFT JOIN public.work_requests wr ON wr.id = wp.work_request_id
ORDER BY wp.created_at DESC;

-- ============================================
-- FUNCTION: Admin search work requests
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_search_work_requests(
    p_query TEXT,
    p_status TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
) RETURNS TABLE (
    request_id UUID,
    title TEXT,
    farmer_name TEXT,
    category TEXT,
    work_date DATE,
    status TEXT,
    workers_needed INT,
    workers_assigned INT,
    payment_type TEXT,
    created_at TIMESTAMPTZ
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        wr.id,
        wr.title,
        u.full_name,
        COALESCE(wc.name_en, 'Unknown'),
        wr.work_date,
        wr.status,
        wr.workers_needed,
        wr.workers_assigned,
        wr.payment_type,
        wr.created_at
    FROM public.work_requests wr
    LEFT JOIN public.users u ON u.id = wr.farmer_id
    LEFT JOIN public.work_categories wc ON wc.id = wr.category_id
    WHERE (p_query IS NULL OR
           wr.title ILIKE '%' || p_query || '%' OR
           u.full_name ILIKE '%' || p_query || '%')
      AND (p_status IS NULL OR wr.status = p_status)
    ORDER BY wr.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ============================================
-- FUNCTION: Admin manage categories
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_manage_category(
    p_action TEXT,
    p_category_id UUID DEFAULT NULL,
    p_name_en TEXT DEFAULT NULL,
    p_name_ne TEXT DEFAULT NULL,
    p_icon TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    category_id UUID
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF p_action = 'create' THEN
        INSERT INTO public.work_categories (name_en, name_ne, icon)
        VALUES (p_name_en, p_name_ne, p_icon)
        RETURNING id INTO v_id;

        success := TRUE;
        message := 'Category created';
        category_id := v_id;
        RETURN NEXT;
    ELSIF p_action = 'update' THEN
        UPDATE public.work_categories SET
            name_en = COALESCE(p_name_en, name_en),
            name_ne = COALESCE(p_name_ne, name_ne),
            icon = COALESCE(p_icon, icon),
            updated_at = NOW()
        WHERE id = p_category_id;

        success := TRUE;
        message := 'Category updated';
        category_id := p_category_id;
        RETURN NEXT;
    ELSIF p_action = 'deactivate' THEN
        UPDATE public.work_categories SET is_active = FALSE WHERE id = p_category_id;

        success := TRUE;
        message := 'Category deactivated';
        category_id := p_category_id;
        RETURN NEXT;
    ELSE
        success := FALSE;
        message := 'Invalid action';
        RETURN NEXT;
    END IF;
END;
$$;

-- ============================================
-- FUNCTION: Admin remove fake request
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_remove_work_request(
    p_request_id UUID,
    p_admin_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS VOID
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    UPDATE public.work_requests
    SET status = 'cancelled',
        cancellation_reason = 'Removed by admin: ' || COALESCE(p_reason, 'No reason'),
        updated_at = NOW()
    WHERE id = p_request_id;

    INSERT INTO public.task_history (work_request_id, event, actor_id, metadata)
    VALUES (p_request_id, 'work_cancelled', p_admin_id, jsonb_build_object(
        'reason', p_reason,
        'admin_action', TRUE
    ));
END;
$$;

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE public.work_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_applications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assigned_workers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_availability     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_preferences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arma_parma_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_ratings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_locations          ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Work Categories: public read, admin write
DROP POLICY IF EXISTS "wc_public_read" ON public.work_categories;
CREATE POLICY "wc_public_read" ON public.work_categories
    FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "wc_service_all" ON public.work_categories;
CREATE POLICY "wc_service_all" ON public.work_categories
    FOR ALL USING (auth.role() = 'service_role');

-- Work Requests
DROP POLICY IF EXISTS "wr_public_read" ON public.work_requests;
CREATE POLICY "wr_public_read" ON public.work_requests
    FOR SELECT USING (status = 'open' OR visibility = 'public' OR farmer_id = auth.uid());

DROP POLICY IF EXISTS "wr_farmer_insert" ON public.work_requests;
CREATE POLICY "wr_farmer_insert" ON public.work_requests
    FOR INSERT WITH CHECK (farmer_id = auth.uid());

DROP POLICY IF EXISTS "wr_farmer_update" ON public.work_requests;
CREATE POLICY "wr_farmer_update" ON public.work_requests
    FOR UPDATE USING (farmer_id = auth.uid());

DROP POLICY IF EXISTS "wr_service_all" ON public.work_requests;
CREATE POLICY "wr_service_all" ON public.work_requests
    FOR ALL USING (auth.role() = 'service_role');

-- Work Applications
DROP POLICY IF EXISTS "wa_worker_insert" ON public.work_applications;
CREATE POLICY "wa_worker_insert" ON public.work_applications
    FOR INSERT WITH CHECK (worker_id = auth.uid());

DROP POLICY IF EXISTS "wa_own_select" ON public.work_applications;
CREATE POLICY "wa_own_select" ON public.work_applications
    FOR SELECT USING (worker_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.work_requests WHERE id = work_request_id AND farmer_id = auth.uid()));

DROP POLICY IF EXISTS "wa_farmer_update" ON public.work_applications;
CREATE POLICY "wa_farmer_update" ON public.work_applications
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.work_requests WHERE id = work_request_id AND farmer_id = auth.uid())
    );

DROP POLICY IF EXISTS "wa_service_all" ON public.work_applications;
CREATE POLICY "wa_service_all" ON public.work_applications
    FOR ALL USING (auth.role() = 'service_role');

-- Assigned Workers
DROP POLICY IF EXISTS "aw_own_select" ON public.assigned_workers;
CREATE POLICY "aw_own_select" ON public.assigned_workers
    FOR SELECT USING (worker_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.work_requests WHERE id = work_request_id AND farmer_id = auth.uid()));

DROP POLICY IF EXISTS "aw_service_all" ON public.assigned_workers;
CREATE POLICY "aw_service_all" ON public.assigned_workers
    FOR ALL USING (auth.role() = 'service_role');

-- Worker Availability
DROP POLICY IF EXISTS "wav_own_all" ON public.worker_availability;
CREATE POLICY "wav_own_all" ON public.worker_availability
    FOR ALL USING (worker_id = auth.uid());

DROP POLICY IF EXISTS "wav_service_all" ON public.worker_availability;
CREATE POLICY "wav_service_all" ON public.worker_availability
    FOR ALL USING (auth.role() = 'service_role');

-- Worker Preferences
DROP POLICY IF EXISTS "wp_own_all" ON public.worker_preferences;
CREATE POLICY "wp_own_all" ON public.worker_preferences
    FOR ALL USING (worker_id = auth.uid());

DROP POLICY IF EXISTS "wp_service_all" ON public.worker_preferences;
CREATE POLICY "wp_service_all" ON public.worker_preferences
    FOR ALL USING (auth.role() = 'service_role');

-- Task History
DROP POLICY IF EXISTS "th_service_all" ON public.task_history;
CREATE POLICY "th_service_all" ON public.task_history
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "th_own_select" ON public.task_history;
CREATE POLICY "th_own_select" ON public.task_history
    FOR SELECT USING (
        actor_id = auth.uid() OR worker_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.work_requests WHERE id = work_request_id AND farmer_id = auth.uid())
    );

-- Work Payments
DROP POLICY IF EXISTS "wpay_own_select" ON public.work_payments;
CREATE POLICY "wpay_own_select" ON public.work_payments
    FOR SELECT USING (farmer_id = auth.uid() OR worker_id = auth.uid());

DROP POLICY IF EXISTS "wpay_service_all" ON public.work_payments;
CREATE POLICY "wpay_service_all" ON public.work_payments
    FOR ALL USING (auth.role() = 'service_role');

-- Arma Parma History
DROP POLICY IF EXISTS "aph_own_select" ON public.arma_parma_history;
CREATE POLICY "aph_own_select" ON public.arma_parma_history
    FOR SELECT USING (farmer_id = auth.uid() OR worker_id = auth.uid());

DROP POLICY IF EXISTS "aph_service_all" ON public.arma_parma_history;
CREATE POLICY "aph_service_all" ON public.arma_parma_history
    FOR ALL USING (auth.role() = 'service_role');

-- Work Ratings
DROP POLICY IF EXISTS "wrating_own_select" ON public.work_ratings;
CREATE POLICY "wrating_own_select" ON public.work_ratings
    FOR SELECT USING (rater_id = auth.uid() OR ratee_id = auth.uid());

DROP POLICY IF EXISTS "wrating_insert" ON public.work_ratings;
CREATE POLICY "wrating_insert" ON public.work_ratings
    FOR INSERT WITH CHECK (rater_id = auth.uid());

DROP POLICY IF EXISTS "wrating_service_all" ON public.work_ratings;
CREATE POLICY "wrating_service_all" ON public.work_ratings
    FOR ALL USING (auth.role() = 'service_role');

-- Work Notifications
DROP POLICY IF EXISTS "wn_own_select" ON public.work_notifications;
CREATE POLICY "wn_own_select" ON public.work_notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wn_own_update" ON public.work_notifications;
CREATE POLICY "wn_own_update" ON public.work_notifications
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wn_service_all" ON public.work_notifications;
CREATE POLICY "wn_service_all" ON public.work_notifications
    FOR ALL USING (auth.role() = 'service_role');

-- Chat Messages
DROP POLICY IF EXISTS "wcm_own_select" ON public.work_chat_messages;
CREATE POLICY "wcm_own_select" ON public.work_chat_messages
    FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "wcm_sender_insert" ON public.work_chat_messages;
CREATE POLICY "wcm_sender_insert" ON public.work_chat_messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "wcm_service_all" ON public.work_chat_messages;
CREATE POLICY "wcm_service_all" ON public.work_chat_messages
    FOR ALL USING (auth.role() = 'service_role');

-- Work Locations
DROP POLICY IF EXISTS "wl_own_all" ON public.work_locations;
CREATE POLICY "wl_own_all" ON public.work_locations
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wl_service_all" ON public.work_locations;
CREATE POLICY "wl_service_all" ON public.work_locations
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Authenticated users
GRANT SELECT ON public.work_categories TO authenticated;
GRANT SELECT, INSERT ON public.work_requests TO authenticated;
GRANT UPDATE ON public.work_requests TO authenticated;
GRANT SELECT, INSERT ON public.work_applications TO authenticated;
GRANT SELECT ON public.work_ratings TO authenticated;
GRANT INSERT ON public.work_ratings TO authenticated;
GRANT SELECT ON public.work_notifications TO authenticated;
GRANT UPDATE ON public.work_notifications TO authenticated;
GRANT SELECT, INSERT ON public.work_chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_locations TO authenticated;
GRANT SELECT ON public.work_payments TO authenticated;
GRANT SELECT ON public.arma_parma_history TO authenticated;
GRANT SELECT ON public.assigned_workers TO authenticated;

-- Admin views: service role only
GRANT SELECT ON public.v_admin_work_dashboard TO service_role;
GRANT SELECT ON public.v_admin_work_stats TO service_role;
GRANT SELECT ON public.v_admin_worker_activity TO service_role;
GRANT SELECT ON public.v_admin_payment_monitor TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_search_work_requests TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_manage_category TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_remove_work_request TO service_role;

-- Core functions: service role
GRANT EXECUTE ON FUNCTION public.create_work_request TO service_role;
GRANT EXECUTE ON FUNCTION public.update_work_request TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_work_request TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_to_work TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_worker TO service_role;
GRANT EXECUTE ON FUNCTION public.decline_worker TO service_role;
GRANT EXECUTE ON FUNCTION public.start_work TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_work TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_work TO service_role;
GRANT EXECUTE ON FUNCTION public.send_work_chat TO service_role;
GRANT EXECUTE ON FUNCTION public.smart_match_workers TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_nearby_workers TO service_role;
GRANT EXECUTE ON FUNCTION public.get_arma_parma_balance TO service_role;
GRANT EXECUTE ON FUNCTION public.get_farmer_work_stats TO service_role;
GRANT EXECUTE ON FUNCTION public.get_worker_work_stats TO service_role;
GRANT EXECUTE ON FUNCTION public.record_work_payment TO service_role;
