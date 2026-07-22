-- ============================================================
-- KrishiConnect Nepal — Farm Work System Functions
-- Migration 00023: All business logic functions
-- ============================================================

-- ============================================
-- FUNCTION: Create work request
-- ============================================
CREATE OR REPLACE FUNCTION public.create_work_request(
    p_farmer_id UUID,
    p_title TEXT,
    p_category_id UUID,
    p_description TEXT,
    p_crop_type TEXT,
    p_urgency_level TEXT,
    p_workers_needed INT,
    p_preferred_gender TEXT,
    p_min_experience_years INT,
    p_skills_required TEXT[],
    p_work_date DATE,
    p_start_time TIME,
    p_expected_duration_hours NUMERIC,
    p_payment_type TEXT,
    p_payment_method TEXT,
    p_payment_amount NUMERIC,
    p_food_provided BOOLEAN,
    p_accommodation_provided BOOLEAN,
    p_tools_provided BOOLEAN,
    p_equipment_required TEXT,
    p_province_id INT,
    p_district_id INT,
    p_municipality_id UUID,
    p_ward_number INT,
    p_exact_address TEXT,
    p_gps_lat NUMERIC,
    p_gps_lng NUMERIC,
    p_contact_preference TEXT,
    p_visibility TEXT,
    p_max_distance_km INT
) RETURNS TABLE (
    work_request_id UUID,
    message TEXT
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.work_requests (
        farmer_id, title, category_id, description, crop_type,
        urgency_level, workers_needed, preferred_gender,
        min_experience_years, skills_required,
        work_date, start_time, expected_duration_hours,
        payment_type, payment_method, payment_amount,
        food_provided, accommodation_provided, tools_provided,
        equipment_required,
        province_id, district_id, municipality_id, ward_number,
        exact_address, gps_lat, gps_lng,
        contact_preference, visibility, max_distance_km,
        status, expires_at
    ) VALUES (
        p_farmer_id, p_title, p_category_id, p_description, p_crop_type,
        COALESCE(p_urgency_level, 'normal'), COALESCE(p_workers_needed, 1),
        p_preferred_gender, COALESCE(p_min_experience_years, 0),
        p_skills_required,
        p_work_date, p_start_time, p_expected_duration_hours,
        COALESCE(p_payment_type, 'paid'), p_payment_method, p_payment_amount,
        COALESCE(p_food_provided, FALSE), COALESCE(p_accommodation_provided, FALSE),
        COALESCE(p_tools_provided, FALSE), p_equipment_required,
        p_province_id, p_district_id, p_municipality_id, p_ward_number,
        p_exact_address, p_gps_lat, p_gps_lng,
        COALESCE(p_contact_preference, 'chat'),
        COALESCE(p_visibility, 'public'), COALESCE(p_max_distance_km, 50),
        'open',
        p_work_date + INTERVAL '1 day'
    ) RETURNING id INTO v_id;

    -- Log
    INSERT INTO public.task_history (work_request_id, event, actor_id, metadata)
    VALUES (v_id, 'created', p_farmer_id, jsonb_build_object(
        'title', p_title,
        'category', p_category_id,
        'workers_needed', p_workers_needed,
        'payment_type', p_payment_type
    ));

    -- Notify nearby workers
    PERFORM public.notify_nearby_workers(v_id, p_farmer_id, p_province_id, p_district_id, p_category_id);

    work_request_id := v_id;
    message := 'Work request created successfully';
    RETURN NEXT;
END;
$$;

-- ============================================
-- FUNCTION: Update work request
-- ============================================
CREATE OR REPLACE FUNCTION public.update_work_request(
    p_request_id UUID,
    p_farmer_id UUID,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_workers_needed INT DEFAULT NULL,
    p_work_date DATE DEFAULT NULL,
    p_start_time TIME DEFAULT NULL,
    p_payment_amount NUMERIC DEFAULT NULL,
    p_urgency_level TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_request RECORD;
BEGIN
    SELECT * INTO v_request FROM public.work_requests
    WHERE id = p_request_id AND farmer_id = p_farmer_id;

    IF NOT FOUND THEN
        success := FALSE;
        message := 'Request not found or not yours';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_request.status NOT IN ('open','draft') THEN
        success := FALSE;
        message := 'Cannot edit request in current status';
        RETURN NEXT;
        RETURN;
    END IF;

    UPDATE public.work_requests SET
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        workers_needed = COALESCE(p_workers_needed, workers_needed),
        work_date = COALESCE(p_work_date, work_date),
        start_time = COALESCE(p_start_time, start_time),
        payment_amount = COALESCE(p_payment_amount, payment_amount),
        urgency_level = COALESCE(p_urgency_level, urgency_level),
        updated_at = NOW()
    WHERE id = p_request_id;

    INSERT INTO public.task_history (work_request_id, event, actor_id, metadata)
    VALUES (p_request_id, 'updated', p_farmer_id, jsonb_build_object(
        'title', p_title, 'workers_needed', p_workers_needed
    ));

    success := TRUE;
    message := 'Request updated';
    RETURN NEXT;
END;
$$;

-- ============================================
-- FUNCTION: Cancel work request
-- ============================================
CREATE OR REPLACE FUNCTION public.cancel_work_request(
    p_request_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_request RECORD;
BEGIN
    SELECT * INTO v_request FROM public.work_requests
    WHERE id = p_request_id AND farmer_id = p_user_id;

    IF NOT FOUND THEN
        success := FALSE;
        message := 'Request not found';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_request.status IN ('completed','cancelled') THEN
        success := FALSE;
        message := 'Cannot cancel in current status';
        RETURN NEXT;
        RETURN;
    END IF;

    UPDATE public.work_requests
    SET status = 'cancelled',
        cancellation_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_request_id;

    -- Cancel all pending applications
    UPDATE public.work_applications
    SET status = 'cancelled', updated_at = NOW()
    WHERE work_request_id = p_request_id
      AND status IN ('interested','pending');

    -- Notify accepted workers
    INSERT INTO public.work_notifications (user_id, work_request_id, type, title, body)
    SELECT aw.worker_id, p_request_id, 'request_cancelled',
           'Work Task Cancelled',
           'The farm task "' || v_request.title || '" has been cancelled.'
    FROM public.assigned_workers aw
    WHERE aw.work_request_id = p_request_id
      AND aw.status IN ('confirmed','checked_in');

    INSERT INTO public.task_history (work_request_id, event, actor_id, metadata)
    VALUES (p_request_id, 'work_cancelled', p_user_id, jsonb_build_object('reason', p_reason));

    success := TRUE;
    message := 'Request cancelled';
    RETURN NEXT;
END;
$$;

-- ============================================
-- FUNCTION: Apply to work request
-- ============================================
CREATE OR REPLACE FUNCTION public.apply_to_work(
    p_work_request_id UUID,
    p_worker_id UUID,
    p_message TEXT DEFAULT NULL,
    p_proposed_wage NUMERIC DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_existing RECORD;
BEGIN
    SELECT * INTO v_request FROM public.work_requests
    WHERE id = p_work_request_id AND status = 'open';

    IF NOT FOUND THEN
        success := FALSE;
        message := 'Work request not found or not open';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check not already applied
    SELECT * INTO v_existing FROM public.work_applications
    WHERE work_request_id = p_work_request_id AND worker_id = p_worker_id;

    IF FOUND THEN
        success := FALSE;
        message := 'You have already applied to this task';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check not full
    IF v_request.workers_assigned >= v_request.workers_needed THEN
        success := FALSE;
        message := 'All positions are filled';
        RETURN NEXT;
        RETURN;
    END IF;

    INSERT INTO public.work_applications (
        work_request_id, worker_id, message, proposed_wage, status
    ) VALUES (
        p_work_request_id, p_worker_id, p_message, p_proposed_wage, 'pending'
    );

    UPDATE public.work_requests
    SET application_count = application_count + 1
    WHERE id = p_work_request_id;

    -- Notify farmer
    INSERT INTO public.work_notifications (user_id, work_request_id, type, title, body)
    VALUES (
        v_request.farmer_id, p_work_request_id, 'worker_applied',
        'New Worker Application',
        'A worker is interested in your task: ' || v_request.title
    );

    INSERT INTO public.task_history (work_request_id, worker_id, event, actor_id, metadata)
    VALUES (p_work_request_id, p_worker_id, 'worker_applied', p_worker_id, jsonb_build_object('message', p_message));

    success := TRUE;
    message := 'Application submitted';
    RETURN NEXT;
END;
$$;

-- ============================================
-- FUNCTION: Accept worker
-- ============================================
CREATE OR REPLACE FUNCTION public.accept_worker(
    p_work_request_id UUID,
    p_farmer_id UUID,
    p_worker_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_app RECORD;
BEGIN
    SELECT * INTO v_request FROM public.work_requests
    WHERE id = p_work_request_id AND farmer_id = p_farmer_id;

    IF NOT FOUND THEN
        success := FALSE;
        message := 'Request not found or not yours';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT * INTO v_app FROM public.work_applications
    WHERE work_request_id = p_work_request_id AND worker_id = p_worker_id AND status = 'pending';

    IF NOT FOUND THEN
        success := FALSE;
        message := 'Application not found';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Update application
    UPDATE public.work_applications
    SET status = 'accepted', farmer_responded_at = NOW(), updated_at = NOW()
    WHERE id = v_app.id;

    -- Assign worker
    INSERT INTO public.assigned_workers (work_request_id, worker_id, application_id, status)
    VALUES (p_work_request_id, p_worker_id, v_app.id, 'confirmed')
    ON CONFLICT (work_request_id, worker_id) DO NOTHING;

    -- Update count
    UPDATE public.work_requests
    SET workers_assigned = workers_assigned + 1,
        status = CASE
            WHEN workers_assigned + 1 >= workers_needed THEN 'workers_confirmed'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_work_request_id;

    -- Notify worker
    INSERT INTO public.work_notifications (user_id, work_request_id, type, title, body)
    VALUES (
        p_worker_id, p_work_request_id, 'worker_accepted',
        'Task Application Accepted!',
        'You have been accepted for: ' || v_request.title
    );

    INSERT INTO public.task_history (work_request_id, worker_id, event, actor_id)
    VALUES (p_work_request_id, p_worker_id, 'worker_accepted', p_farmer_id);

    success := TRUE;
    message := 'Worker accepted';
    RETURN NEXT;
END;
$$;

-- ============================================
-- FUNCTION: Decline worker
-- ============================================
CREATE OR REPLACE FUNCTION public.decline_worker(
    p_work_request_id UUID,
    p_farmer_id UUID,
    p_worker_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_request RECORD;
BEGIN
    SELECT * INTO v_request FROM public.work_requests
    WHERE id = p_work_request_id AND farmer_id = p_farmer_id;

    IF NOT FOUND THEN
        success := FALSE;
        message := 'Request not found';
        RETURN NEXT;
        RETURN;
    END IF;

    UPDATE public.work_applications
    SET status = 'declined', farmer_responded_at = NOW(), updated_at = NOW()
    WHERE work_request_id = p_work_request_id AND worker_id = p_worker_id AND status = 'pending';

    INSERT INTO public.work_notifications (user_id, work_request_id, type, title, body)
    VALUES (
        p_worker_id, p_work_request_id, 'worker_declined',
        'Application Not Selected',
        'Your application for "' || v_request.title || '" was not selected.'
    );

    INSERT INTO public.task_history (work_request_id, worker_id, event, actor_id)
    VALUES (p_work_request_id, p_worker_id, 'worker_declined', p_farmer_id);

    success := TRUE;
    message := 'Worker declined';
    RETURN NEXT;
END;
$$;

-- ============================================
-- FUNCTION: Start work (check-in)
-- ============================================
CREATE OR REPLACE FUNCTION public.start_work(
    p_work_request_id UUID,
    p_worker_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    UPDATE public.assigned_workers
    SET status = 'working', check_in_time = NOW(), updated_at = NOW()
    WHERE work_request_id = p_work_request_id
      AND worker_id = p_worker_id
      AND status IN ('confirmed','checked_in');

    IF NOT FOUND THEN
        success := FALSE;
        message := 'Assignment not found';
        RETURN NEXT;
        RETURN;
    END IF;

    UPDATE public.work_requests
    SET status = CASE WHEN status = 'workers_confirmed' THEN 'in_progress' ELSE status END,
        updated_at = NOW()
    WHERE id = p_work_request_id;

    INSERT INTO public.task_history (work_request_id, worker_id, event, actor_id)
    VALUES (p_work_request_id, p_worker_id, 'work_started', p_worker_id);

    success := TRUE;
    message := 'Work started';
    RETURN NEXT;
END;
$$;

-- ============================================
-- FUNCTION: Complete work
-- ============================================
CREATE OR REPLACE FUNCTION public.complete_work(
    p_work_request_id UUID,
    p_user_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_all_complete BOOLEAN;
BEGIN
    SELECT * INTO v_request FROM public.work_requests
    WHERE id = p_work_request_id;

    IF NOT FOUND THEN
        success := FALSE;
        message := 'Request not found';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Mark worker complete
    UPDATE public.assigned_workers
    SET status = 'completed', check_out_time = NOW(),
        actual_hours = EXTRACT(EPOCH FROM (NOW() - check_in_time)) / 3600,
        updated_at = NOW()
    WHERE work_request_id = p_work_request_id
      AND worker_id = p_user_id
      AND status = 'working';

    -- Check if all workers complete
    SELECT NOT EXISTS (
        SELECT 1 FROM public.assigned_workers
        WHERE work_request_id = p_work_request_id
          AND status NOT IN ('completed','cancelled','no_show')
    ) INTO v_all_complete;

    IF v_all_complete OR p_user_id = v_request.farmer_id THEN
        UPDATE public.work_requests
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE id = p_work_request_id;

        INSERT INTO public.task_history (work_request_id, event, actor_id, metadata)
        VALUES (p_work_request_id, 'work_completed', p_user_id, jsonb_build_object(
            'all_workers_complete', v_all_complete
        ));

        -- Notify farmer
        INSERT INTO public.work_notifications (user_id, work_request_id, type, title, body)
        VALUES (
            v_request.farmer_id, p_work_request_id, 'task_completed',
            'Task Completed',
            'Farm task "' || v_request.title || '" has been completed.'
        );
    END IF;

    INSERT INTO public.task_history (work_request_id, worker_id, event, actor_id)
    VALUES (p_work_request_id, p_user_id, 'work_completed', p_user_id);

    success := TRUE;
    message := 'Work marked as complete';
    RETURN NEXT;
END;
$$;

-- ============================================
-- FUNCTION: Rate work (farmer or worker)
-- ============================================
CREATE OR REPLACE FUNCTION public.rate_work(
    p_work_request_id UUID,
    p_rater_id UUID,
    p_ratee_id UUID,
    p_rater_type TEXT,
    p_communication SMALLINT,
    p_work_quality SMALLINT,
    p_punctuality SMALLINT,
    p_payment_experience SMALLINT,
    p_overall NUMERIC,
    p_review TEXT DEFAULT NULL,
    p_would_recommend BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    -- Validate rater type matches
    IF p_rater_type = 'farmer' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.work_requests WHERE id = p_work_request_id AND farmer_id = p_rater_id
        ) THEN
            success := FALSE;
            message := 'You are not the farmer for this task';
            RETURN NEXT;
            RETURN;
        END IF;
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM public.assigned_workers
            WHERE work_request_id = p_work_request_id AND worker_id = p_rater_id
        ) THEN
            success := FALSE;
            message := 'You are not assigned to this task';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;

    INSERT INTO public.work_ratings (
        work_request_id, rater_id, ratee_id, rater_type,
        communication, work_quality, punctuality, payment_experience,
        overall_rating, review, would_recommend
    ) VALUES (
        p_work_request_id, p_rater_id, p_ratee_id, p_rater_type,
        p_communication, p_work_quality, p_punctuality, p_payment_experience,
        p_overall, p_review, p_would_recommend
    )
    ON CONFLICT (work_request_id, rater_id) DO UPDATE SET
        communication = EXCLUDED.communication,
        work_quality = EXCLUDED.work_quality,
        punctuality = EXCLUDED.punctuality,
        payment_experience = EXCLUDED.payment_experience,
        overall_rating = EXCLUDED.overall_rating,
        review = EXCLUDED.review,
        would_recommend = EXCLUDED.would_recommend;

    -- Notify
    INSERT INTO public.work_notifications (user_id, work_request_id, type, title, body)
    VALUES (
        p_ratee_id, p_work_request_id, 'rating_received',
        'New Rating Received',
        'You received a ' || p_overall || ' star rating.'
    );

    INSERT INTO public.task_history (work_request_id, worker_id, event, actor_id, metadata)
    VALUES (p_work_request_id, NULL, 'rating_given', p_rater_id, jsonb_build_object(
        'rater_type', p_rater_type, 'overall', p_overall
    ));

    success := TRUE;
    message := 'Rating submitted';
    RETURN NEXT;
END;
$$;

-- ============================================
-- FUNCTION: Send chat message
-- ============================================
CREATE OR REPLACE FUNCTION public.send_work_chat(
    p_work_request_id UUID,
    p_sender_id UUID,
    p_receiver_id UUID,
    p_message_type TEXT,
    p_content TEXT,
    p_media_url TEXT DEFAULT NULL,
    p_latitude NUMERIC DEFAULT NULL,
    p_longitude NUMERIC DEFAULT NULL
) RETURNS UUID
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_id UUID;
    v_request RECORD;
BEGIN
    SELECT title INTO v_request FROM public.work_requests WHERE id = p_work_request_id;

    INSERT INTO public.work_chat_messages (
        work_request_id, sender_id, receiver_id,
        message_type, content, media_url, latitude, longitude
    ) VALUES (
        p_work_request_id, p_sender_id, p_receiver_id,
        p_message_type, p_content, p_media_url, p_latitude, p_longitude
    ) RETURNING id INTO v_id;

    -- Notify
    INSERT INTO public.work_notifications (user_id, work_request_id, type, title, body)
    VALUES (
        p_receiver_id, p_work_request_id, 'chat_message',
        'New Message',
        'New message regarding: ' || COALESCE(v_request.title, 'Work Task')
    );

    RETURN v_id;
END;
$$;

-- ============================================
-- FUNCTION: Smart match workers
-- ============================================
CREATE OR REPLACE FUNCTION public.smart_match_workers(
    p_work_request_id UUID,
    p_limit INT DEFAULT 20
) RETURNS TABLE (
    worker_id UUID,
    full_name TEXT,
    profile_photo TEXT,
    match_score NUMERIC,
    distance_km NUMERIC,
    rating_avg NUMERIC,
    total_tasks INT,
    experience_years INT,
    is_available BOOLEAN,
    matched_reasons TEXT[]
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_lat NUMERIC;
    v_lng NUMERIC;
BEGIN
    SELECT * INTO v_request FROM public.work_requests WHERE id = p_work_request_id;
    v_lat := v_request.gps_lat;
    v_lng := v_request.gps_lng;

    RETURN QUERY
    WITH worker_stats AS (
        SELECT
            u.id AS w_id,
            u.full_name AS w_name,
            u.profile_photo AS w_photo,
            COALESCE(AVG(wr.overall_rating), 0) AS avg_rating,
            COUNT(DISTINCT aw.id) AS tasks_done,
            COALESCE(fp.experience_years, 0) AS exp_years
        FROM public.users u
        LEFT JOIN public.farmer_profiles fp ON fp.user_id = u.id
        LEFT JOIN public.work_ratings wr ON wr.ratee_id = u.id
        LEFT JOIN public.assigned_workers aw ON aw.worker_id = u.id AND aw.status = 'completed'
        WHERE u.account_status = 'active'
          AND u.active_role = 'worker'
        GROUP BY u.id, u.full_name, u.profile_photo, fp.experience_years
    ),
    availability AS (
        SELECT worker_id, is_available
        FROM public.worker_availability
        WHERE date = v_request.work_date
    )
    SELECT
        ws.w_id,
        ws.w_name,
        ws.w_photo,
        ROUND((
            -- Base score from rating
            (ws.avg_rating * 20) +
            -- Experience bonus
            (LEAST(ws.exp_years, 10) * 3) +
            -- Task completion bonus
            (LEAST(ws.tasks_done, 20) * 2) +
            -- Category preference bonus
            CASE WHEN v_request.category_id = ANY(
                SELECT unnest(wp.preferred_categories)
                FROM public.worker_preferences wp WHERE wp.worker_id = ws.w_id
            ) THEN 15 ELSE 0 END +
            -- Availability bonus
            CASE WHEN COALESCE(av.is_available, TRUE) THEN 10 ELSE -20 END
        )::NUMERIC, 2) AS score,
        -- Distance (simplified Haversine)
        ROUND((6371 * acos(
            cos(radians(COALESCE(v_lat, 27.7))) * cos(radians(COALESCE(v_lat, 27.7))) *
            cos(radians(COALESCE(v_lng, 85.3)) - radians(COALESCE(v_lng, 85.3))) +
            sin(radians(COALESCE(v_lat, 27.7))) * sin(radians(COALESCE(v_lat, 27.7)))
        ))::NUMERIC, 1) AS dist,
        ROUND(ws.avg_rating, 2),
        ws.tasks_done,
        ws.exp_years,
        COALESCE(av.is_available, TRUE),
        ARRAY[
            CASE WHEN ws.avg_rating >= 4 THEN 'High Rated' END,
            CASE WHEN ws.tasks_done >= 5 THEN 'Experienced' END,
            CASE WHEN COALESCE(av.is_available, TRUE) THEN 'Available' END,
            CASE WHEN ws.exp_years >= 3 THEN 'Skilled' END
        ] FILTER (WHERE IS NOT NULL)
    FROM worker_stats ws
    LEFT JOIN availability av ON av.worker_id = ws.w_id
    WHERE u.account_status = 'active'
    ORDER BY score DESC
    LIMIT p_limit;
END;
$$;

-- ============================================
-- FUNCTION: Notify nearby workers
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_nearby_workers(
    p_work_request_id UUID,
    p_farmer_id UUID,
    p_province_id INT,
    p_district_id INT,
    p_category_id UUID
) RETURNS INT
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_count INT;
    v_request RECORD;
BEGIN
    SELECT title, work_date INTO v_request FROM public.work_requests WHERE id = p_work_request_id;

    -- Notify workers in same district with matching preferences
    INSERT INTO public.work_notifications (user_id, work_request_id, type, title, body)
    SELECT DISTINCT
        u.id,
        p_work_request_id,
        'new_request_nearby',
        'New Farm Task Nearby!',
        'New ' || COALESCE(vc.name_en, 'farm') || ' task available on ' ||
        TO_CHAR(v_request.work_date, 'Mon DD') || ': ' || v_request.title
    FROM public.users u
    INNER JOIN public.worker_preferences wp ON wp.worker_id = u.id
    LEFT JOIN public.work_categories vc ON vc.id = p_category_id
    WHERE u.account_status = 'active'
      AND u.active_role = 'worker'
      AND u.id != p_farmer_id
      AND (p_category_id = ANY(wp.preferred_categories) OR wp.preferred_categories IS NULL)
      AND (wp.preferred_payment_type IS NULL OR wp.preferred_payment_type = 'any')
    LIMIT 100;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- ============================================
-- FUNCTION: Get worker's arma parma balance
-- ============================================
CREATE OR REPLACE FUNCTION public.get_arma_parma_balance(
    p_user_id UUID
) RETURNS TABLE (
    total_earned NUMERIC,
    total_given NUMERIC,
    net_balance NUMERIC
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN worker_id = p_user_id AND status = 'completed' THEN hours_exchanged ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN farmer_id = p_user_id AND status = 'completed' THEN hours_exchanged ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN worker_id = p_user_id AND status = 'completed' THEN hours_exchanged ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN farmer_id = p_user_id AND status = 'completed' THEN hours_exchanged ELSE 0 END), 0)
    FROM public.arma_parma_history;
END;
$$;

-- ============================================
-- FUNCTION: Get farmer stats
-- ============================================
CREATE OR REPLACE FUNCTION public.get_farmer_work_stats(
    p_farmer_id UUID
) RETURNS TABLE (
    active_requests INT,
    pending_applications INT,
    accepted_workers INT,
    completed_tasks INT,
    total_earned NUMERIC,
    avg_rating NUMERIC
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INT FROM public.work_requests
         WHERE farmer_id = p_farmer_id AND status IN ('open','workers_confirmed','in_progress')),
        (SELECT COUNT(*)::INT FROM public.work_applications wa
         INNER JOIN public.work_requests wr ON wr.id = wa.work_request_id
         WHERE wr.farmer_id = p_farmer_id AND wa.status = 'pending'),
        (SELECT COUNT(*)::INT FROM public.assigned_workers aw
         INNER JOIN public.work_requests wr ON wr.id = aw.work_request_id
         WHERE wr.farmer_id = p_farmer_id AND aw.status IN ('confirmed','working')),
        (SELECT COUNT(*)::INT FROM public.work_requests
         WHERE farmer_id = p_farmer_id AND status = 'completed'),
        COALESCE((SELECT SUM(amount) FROM public.work_payments
         WHERE farmer_id = p_farmer_id AND status = 'paid'), 0),
        (SELECT ROUND(AVG(overall_rating), 2) FROM public.work_ratings
         WHERE ratee_id = p_farmer_id);
END;
$$;

-- ============================================
-- FUNCTION: Get worker stats
-- ============================================
CREATE OR REPLACE FUNCTION public.get_worker_work_stats(
    p_worker_id UUID
) RETURNS TABLE (
    available_tasks INT,
    accepted_tasks INT,
    completed_tasks INT,
    total_earned NUMERIC,
    arma_parma_balance NUMERIC,
    avg_rating NUMERIC
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INT FROM public.work_requests
         WHERE status = 'open' AND work_date >= CURRENT_DATE),
        (SELECT COUNT(*)::INT FROM public.assigned_workers
         WHERE worker_id = p_worker_id AND status IN ('confirmed','working')),
        (SELECT COUNT(*)::INT FROM public.assigned_workers
         WHERE worker_id = p_worker_id AND status = 'completed'),
        COALESCE((SELECT SUM(amount) FROM public.work_payments
         WHERE worker_id = p_worker_id AND status = 'paid'), 0),
        (SELECT net_balance FROM public.get_arma_parma_balance(p_worker_id)),
        (SELECT ROUND(AVG(overall_rating), 2) FROM public.work_ratings
         WHERE ratee_id = p_worker_id);
END;
$$;

-- ============================================
-- FUNCTION: Record work payment
-- ============================================
CREATE OR REPLACE FUNCTION public.record_work_payment(
    p_work_request_id UUID,
    p_farmer_id UUID,
    p_worker_id UUID,
    p_amount NUMERIC,
    p_payment_type TEXT,
    p_payment_method TEXT DEFAULT 'cash',
    p_notes TEXT DEFAULT NULL
) RETURNS UUID
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.work_payments (
        work_request_id, farmer_id, worker_id,
        amount, payment_type, payment_method, status, paid_at, notes
    ) VALUES (
        p_work_request_id, p_farmer_id, p_worker_id,
        p_amount, p_payment_type, p_payment_method, 'paid', NOW(), p_notes
    ) RETURNING id INTO v_id;

    INSERT INTO public.work_notifications (user_id, work_request_id, type, title, body)
    VALUES (
        p_worker_id, p_work_request_id, 'payment_received',
        'Payment Received',
        'You received Rs. ' || p_amount || ' for your work.'
    );

    INSERT INTO public.task_history (work_request_id, worker_id, event, actor_id, metadata)
    VALUES (p_work_request_id, p_worker_id, 'payment_made', p_farmer_id, jsonb_build_object(
        'amount', p_amount, 'method', p_payment_method
    ));

    RETURN v_id;
END;
$$;
