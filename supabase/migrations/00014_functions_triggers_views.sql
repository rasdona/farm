-- KrishiConnect Nepal - Production Database
-- Migration 00014: Functions, Triggers, Views, Materialized Views

-- ============================================
-- AUTO-UPDATE TIMESTAMPS TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'updated_at'
        AND table_name NOT LIKE 'pg_%'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
            t.table_name, t.table_name
        );
    END LOOP;
END;
$$;

-- ============================================
-- AUTO-CREATE USER ON SIGNUP (Supabase Auth Hook)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, full_name, mobile_number, email, preferred_language)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.phone_number, COALESCE(NEW.raw_user_meta_data->>'mobile_number', '')),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'preferred_language')::language_preference, 'en')
    )
    ON CONFLICT (id) DO NOTHING;

    -- Assign default role
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT NEW.id, id FROM public.roles WHERE name = 'farmer'
    ON CONFLICT DO NOTHING;

    -- Initialize labor credits
    INSERT INTO public.labor_credits (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Initialize reputation
    INSERT INTO public.user_reputation (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- UPDATE LAST LOGIN
-- ============================================
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users SET last_login = NOW(), last_seen_at = NOW() WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_login
    AFTER INSERT ON public.login_history
    FOR EACH ROW
    WHEN (NEW.is_success = TRUE)
    EXECUTE FUNCTION public.update_last_login();

-- ============================================
-- GENERATE ORDER NUMBER
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number := 'KC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE TRIGGER trigger_generate_order_number
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL)
    EXECUTE FUNCTION generate_order_number();

-- ============================================
-- GENERATE INVOICE NUMBER
-- ============================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE TRIGGER trigger_generate_invoice_number
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    WHEN (NEW.invoice_number IS NULL)
    EXECUTE FUNCTION generate_invoice_number();

-- ============================================
-- UPDATE FARMER RATING
-- ============================================
CREATE OR REPLACE FUNCTION update_farmer_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.farmer_profiles
    SET avg_rating = (
        SELECT COALESCE(AVG(rating), 0) FROM public.farmer_reviews
        WHERE farmer_id = NEW.farmer_id AND status = 'approved'
    ),
    total_ratings = (
        SELECT COUNT(*) FROM public.farmer_reviews
        WHERE farmer_id = NEW.farmer_id AND status = 'approved'
    )
    WHERE id = NEW.farmer_id;

    -- Update reputation
    UPDATE public.user_reputation
    SET overall_score = (
        SELECT COALESCE(AVG(rating), 0) FROM public.farmer_reviews
        WHERE farmer_id = NEW.farmer_id AND status = 'approved'
    ),
    total_reviews = (
        SELECT COUNT(*) FROM public.farmer_reviews
        WHERE farmer_id = NEW.farmer_id AND status = 'approved'
    )
    WHERE user_id = (SELECT user_id FROM public.farmer_profiles WHERE id = NEW.farmer_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_farmer_rating
    AFTER INSERT OR UPDATE ON public.farmer_reviews
    FOR EACH ROW EXECUTE FUNCTION update_farmer_rating();

-- ============================================
-- UPDATE WORKER RATING
-- ============================================
CREATE OR REPLACE FUNCTION update_worker_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.worker_profiles
    SET avg_rating = (
        SELECT COALESCE(AVG(rating), 0) FROM public.worker_reviews
        WHERE worker_id = NEW.worker_id AND status = 'approved'
    ),
    total_ratings = (
        SELECT COUNT(*) FROM public.worker_reviews
        WHERE worker_id = NEW.worker_id AND status = 'approved'
    )
    WHERE id = NEW.worker_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_worker_rating
    AFTER INSERT OR UPDATE ON public.worker_reviews
    FOR EACH ROW EXECUTE FUNCTION update_worker_rating();

-- ============================================
-- UPDATE SELLER RATING
-- ============================================
CREATE OR REPLACE FUNCTION update_seller_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.seller_profiles
    SET avg_rating = (
        SELECT COALESCE(AVG(rating), 0) FROM public.seller_reviews
        WHERE seller_id = NEW.seller_id AND status = 'approved'
    ),
    total_ratings = (
        SELECT COUNT(*) FROM public.seller_reviews
        WHERE seller_id = NEW.seller_id AND status = 'approved'
    )
    WHERE id = NEW.seller_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seller_rating
    AFTER INSERT OR UPDATE ON public.seller_reviews
    FOR EACH ROW EXECUTE FUNCTION update_seller_rating();

-- ============================================
-- UPDATE EQUIPMENT RATING
-- ============================================
CREATE OR REPLACE FUNCTION update_equipment_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.equipment
    SET avg_rating = (
        SELECT COALESCE(AVG(rating), 0) FROM public.equipment_reviews
        WHERE equipment_id = NEW.equipment_id AND status = 'approved'
    ),
    total_ratings = (
        SELECT COUNT(*) FROM public.equipment_reviews
        WHERE equipment_id = NEW.equipment_id AND status = 'approved'
    )
    WHERE id = NEW.equipment_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_equipment_rating
    AFTER INSERT OR UPDATE ON public.equipment_reviews
    FOR EACH ROW EXECUTE FUNCTION update_equipment_rating();

-- ============================================
-- UPDATE EXPERT RATING
-- ============================================
CREATE OR REPLACE FUNCTION update_expert_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.experts
    SET avg_rating = (
        SELECT COALESCE(AVG(rating), 0) FROM public.consultation_reviews
        WHERE expert_id = NEW.expert_id AND status = 'approved'
    ),
    total_ratings = (
        SELECT COUNT(*) FROM public.consultation_reviews
        WHERE expert_id = NEW.expert_id AND status = 'approved'
    )
    WHERE id = NEW.expert_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_expert_rating
    AFTER INSERT OR UPDATE ON public.consultation_reviews
    FOR EACH ROW EXECUTE FUNCTION update_expert_rating();

-- ============================================
-- UPDATE POST LIKE COUNT
-- ============================================
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.post_id IS NOT NULL THEN
        UPDATE public.community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' AND OLD.post_id IS NOT NULL THEN
        UPDATE public.community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_like_count
    AFTER INSERT OR DELETE ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- ============================================
-- UPDATE POST COMMENT COUNT
-- ============================================
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_comment_count
    AFTER INSERT OR DELETE ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- ============================================
-- UPDATE CONVERSATION LAST MESSAGE
-- ============================================
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 200)
    WHERE id = NEW.conversation_id;

    UPDATE public.conversation_participants
    SET unread_count = unread_count + 1
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ============================================
-- CREDIT TRANSACTION HANDLER
-- ============================================
CREATE OR REPLACE FUNCTION handle_credit_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'earned' THEN
        UPDATE public.labor_credits
        SET balance = balance + NEW.amount,
            total_earned = total_earned + NEW.amount,
            last_activity_at = NOW()
        WHERE user_id = NEW.user_id;
    ELSIF NEW.transaction_type = 'spent' THEN
        UPDATE public.labor_credits
        SET balance = balance - NEW.amount,
            total_spent = total_spent + NEW.amount,
            last_activity_at = NOW()
        WHERE user_id = NEW.user_id;
    ELSIF NEW.transaction_type = 'transferred' THEN
        UPDATE public.labor_credits
        SET balance = balance - NEW.amount,
            total_transferred = total_transferred + NEW.amount,
            last_activity_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;

    -- Update balance_after in transaction
    SELECT balance INTO NEW.balance_after FROM public.labor_credits WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_credit_transaction
    BEFORE INSERT ON public.credit_transactions
    FOR EACH ROW EXECUTE FUNCTION handle_credit_transaction();

-- ============================================
-- VIEWS
-- ============================================

-- User Profile Complete View
CREATE OR REPLACE VIEW public.v_user_profiles AS
SELECT
    u.id,
    u.full_name,
    u.mobile_number,
    u.email,
    u.profile_photo,
    u.preferred_language,
    u.account_status,
    u.verification_status,
    u.active_role,
    u.profile_completion_pct,
    u.last_login,
    u.created_at,
    ur.overall_score AS reputation_score,
    ur.badge_level,
    p.name_en AS province_name,
    d.name_en AS district_name
FROM public.users u
LEFT JOIN public.user_reputation ur ON ur.user_id = u.id
LEFT JOIN public.farmer_profiles fp ON fp.user_id = u.id
LEFT JOIN public.provinces p ON p.id = fp.province_id
LEFT JOIN public.districts d ON d.id = fp.district_id
WHERE u.deleted_at IS NULL;

-- Active Products with Seller Info
CREATE OR REPLACE VIEW public.v_active_products AS
SELECT
    p.id,
    p.name,
    p.slug,
    p.description,
    p.price,
    p.original_price,
    p.quantity,
    p.unit,
    p.is_organic,
    p.status,
    p.avg_rating,
    p.total_ratings,
    p.total_sold,
    p.view_count,
    p.created_at,
    s.store_name,
    s.avg_rating AS seller_rating,
    pc.name_en AS category_name,
    pc.slug AS category_slug,
    d.name_en AS district_name,
    pr.name_en AS province_name,
    (SELECT image_url FROM public.product_images pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) AS primary_image
FROM public.products p
JOIN public.seller_profiles s ON s.id = p.seller_id
LEFT JOIN public.product_categories pc ON pc.id = p.category_id
LEFT JOIN public.districts d ON d.id = p.district_id
LEFT JOIN public.provinces pr ON pr.id = p.province_id
WHERE p.status = 'active' AND p.deleted_at IS NULL;

-- Active Jobs View
CREATE OR REPLACE VIEW public.v_active_jobs AS
SELECT
    j.id,
    j.title,
    j.description,
    j.crop_type,
    j.required_workers,
    j.hired_count,
    j.salary_type,
    j.salary_amount,
    j.salary_min,
    j.salary_max,
    j.provides_accommodation,
    j.provides_food,
    j.working_hours_start,
    j.working_hours_end,
    j.start_date,
    j.end_date,
    j.is_urgent,
    j.view_count,
    j.application_count,
    j.status,
    j.created_at,
    u.full_name AS poster_name,
    u.profile_photo AS poster_photo,
    fp.farm_name,
    jc.name_en AS category_name,
    d.name_en AS district_name,
    pr.name_en AS province_name
FROM public.jobs j
JOIN public.users u ON u.id = j.poster_id
LEFT JOIN public.farmer_profiles fp ON fp.id = j.farmer_profile_id
LEFT JOIN public.job_categories jc ON jc.id = j.category_id
LEFT JOIN public.districts d ON d.id = j.district_id
LEFT JOIN public.provinces pr ON pr.id = j.province_id
WHERE j.status = 'open' AND j.deleted_at IS NULL;

-- Available Equipment View
CREATE OR REPLACE VIEW public.v_available_equipment AS
SELECT
    e.id,
    e.name,
    e.description,
    e.brand,
    e.model,
    e.condition,
    e.hourly_rate,
    e.daily_rate,
    e.weekly_rate,
    e.monthly_rate,
    e.security_deposit,
    e.includes_operator,
    e.delivery_available,
    e.status,
    e.avg_rating,
    e.total_ratings,
    e.total_rentals,
    e.view_count,
    e.created_at,
    u.full_name AS owner_name,
    u.profile_photo AS owner_photo,
    ec.name_en AS category_name,
    d.name_en AS district_name,
    (SELECT image_url FROM public.equipment_images ei WHERE ei.equipment_id = e.id AND ei.is_primary = TRUE LIMIT 1) AS primary_image
FROM public.equipment e
JOIN public.users u ON u.id = e.owner_id
LEFT JOIN public.equipment_categories ec ON ec.id = e.category_id
LEFT JOIN public.districts d ON d.id = e.district_id
WHERE e.status IN ('available', 'rented') AND e.deleted_at IS NULL;

-- Nearby Farmers View (for location-based queries)
CREATE OR REPLACE VIEW public.v_nearby_farmers AS
SELECT
    fp.id,
    fp.farm_name,
    fp.farm_type,
    fp.farm_size,
    fp.is_organic,
    fp.avg_rating,
    fp.total_ratings,
    fp.gps_coordinates,
    fp.biography,
    u.full_name,
    u.profile_photo,
    d.name_en AS district_name,
    lb.name_en AS local_body_name
FROM public.farmer_profiles fp
JOIN public.users u ON u.id = fp.user_id
LEFT JOIN public.districts d ON d.id = fp.district_id
LEFT JOIN public.local_bodies lb ON lb.id = fp.local_body_id
WHERE fp.status = 'active' AND fp.deleted_at IS NULL AND fp.gps_coordinates IS NOT NULL;

-- ============================================
-- MATERIALIZED VIEWS (for analytics)
-- ============================================

-- Daily Platform Statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_platform_stats AS
SELECT
    DATE(created_at) AS stat_date,
    COUNT(DISTINCT user_id) AS total_users,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS new_users_today
FROM public.users
WHERE deleted_at IS NULL
GROUP BY DATE(created_at)
ORDER BY stat_date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_platform_stats_date ON mv_daily_platform_stats(stat_date);

-- Top Rated Farmers by District
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_rated_farmers AS
SELECT
    fp.id AS farmer_id,
    fp.farm_name,
    fp.avg_rating,
    fp.total_ratings,
    fp.farm_type,
    fp.is_organic,
    u.full_name,
    u.profile_photo,
    d.id AS district_id,
    d.name_en AS district_name,
    pr.name_en AS province_name
FROM public.farmer_profiles fp
JOIN public.users u ON u.id = fp.user_id
LEFT JOIN public.districts d ON d.id = fp.district_id
LEFT JOIN public.provinces pr ON pr.id = d.province_id
WHERE fp.status = 'active' AND fp.deleted_at IS NULL AND fp.total_ratings >= 3
ORDER BY fp.avg_rating DESC;

CREATE INDEX IF NOT EXISTS idx_mv_top_rated_farmers_district ON mv_top_rated_farmers(district_id);

-- Top Rated Workers by District
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_rated_workers AS
SELECT
    wp.id AS worker_id,
    wp.avg_rating,
    wp.total_ratings,
    wp.skills,
    wp.is_available,
    wp.daily_wage,
    u.full_name,
    u.profile_photo,
    d.id AS district_id,
    d.name_en AS district_name,
    pr.name_en AS province_name
FROM public.worker_profiles wp
JOIN public.users u ON u.id = wp.user_id
LEFT JOIN public.districts d ON d.id = wp.district_id
LEFT JOIN public.provinces pr ON pr.id = d.province_id
WHERE wp.status = 'active' AND wp.deleted_at IS NULL AND wp.total_ratings >= 3
ORDER BY wp.avg_rating DESC;

-- Popular Products by Category
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_products AS
SELECT
    p.id AS product_id,
    p.name,
    p.price,
    p.avg_rating,
    p.total_sold,
    p.total_ratings,
    pc.name_en AS category_name,
    pc.slug AS category_slug,
    s.store_name,
    d.name_en AS district_name,
    (SELECT image_url FROM public.product_images pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) AS primary_image
FROM public.products p
JOIN public.seller_profiles s ON s.id = p.seller_id
LEFT JOIN public.product_categories pc ON pc.id = p.category_id
LEFT JOIN public.districts d ON d.id = p.district_id
WHERE p.status = 'active' AND p.deleted_at IS NULL
ORDER BY p.total_sold DESC, p.avg_rating DESC;

-- District-wise Market Prices
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_district_prices AS
SELECT
    dcp.id,
    dcp.crop_name,
    dcp.current_price,
    dcp.min_price,
    dcp.max_price,
    dcp.unit,
    pc.name_en AS category_name,
    d.id AS district_id,
    d.name_en AS district_name,
    pr.name_en AS province_name,
    dcp.last_updated
FROM public.district_crop_prices dcp
JOIN public.districts d ON d.id = dcp.district_id
JOIN public.provinces pr ON pr.id = d.province_id
JOIN public.crop_price_categories pc ON pc.id = dcp.category_id;

-- ============================================
-- REFRESH MATERIALIZED VIEWS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_platform_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_rated_farmers;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_rated_workers;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_products;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_district_prices;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 NUMERIC, lon1 NUMERIC,
    lat2 NUMERIC, lon2 NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
    ) / 1000;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get nearby farmers
CREATE OR REPLACE FUNCTION get_nearby_farmers(
    user_lat NUMERIC,
    user_lon NUMERIC,
    radius_km NUMERIC DEFAULT 50,
    result_limit INT DEFAULT 20
) RETURNS TABLE (
    farmer_id UUID,
    farm_name TEXT,
    full_name TEXT,
    distance_km NUMERIC,
    avg_rating NUMERIC,
    farm_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fp.id,
        fp.farm_name,
        u.full_name,
        ROUND((ST_Distance(
            fp.gps_coordinates,
            ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
        ) / 1000)::NUMERIC, 2),
        fp.avg_rating,
        fp.farm_type
    FROM public.farmer_profiles fp
    JOIN public.users u ON u.id = fp.user_id
    WHERE fp.status = 'active'
    AND fp.deleted_at IS NULL
    AND fp.gps_coordinates IS NOT NULL
    AND ST_DWithin(
        fp.gps_coordinates,
        ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
        radius_km * 1000
    )
    ORDER BY fp.gps_coordinates <-> ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Search products with full text
CREATE OR REPLACE FUNCTION search_products(
    search_query TEXT,
    category_slug TEXT DEFAULT NULL,
    district_name TEXT DEFAULT NULL,
    min_price NUMERIC DEFAULT NULL,
    max_price NUMERIC DEFAULT NULL,
    is_organic_filter BOOLEAN DEFAULT NULL,
    result_limit INT DEFAULT 20,
    result_offset INT DEFAULT 0
) RETURNS TABLE (
    product_id UUID,
    name TEXT,
    price NUMERIC,
    avg_rating NUMERIC,
    store_name TEXT,
    category_name TEXT,
    district_name TEXT,
    primary_image TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.price,
        p.avg_rating,
        s.store_name,
        pc.name_en,
        d.name_en,
        (SELECT pi.image_url FROM public.product_images pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1),
        ts_rank(
            to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.description, '')),
            plainto_tsquery('english', search_query)
        )
    FROM public.products p
    JOIN public.seller_profiles s ON s.id = p.seller_id
    LEFT JOIN public.product_categories pc ON pc.id = p.category_id
    LEFT JOIN public.districts d ON d.id = p.district_id
    WHERE p.status = 'active'
    AND p.deleted_at IS NULL
    AND (
        to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.description, ''))
        @@ plainto_tsquery('english', search_query)
        OR p.name ILIKE '%' || search_query || '%'
    )
    AND (category_slug IS NULL OR pc.slug = category_slug)
    AND (district_name IS NULL OR d.name_en ILIKE '%' || district_name || '%')
    AND (min_price IS NULL OR p.price >= min_price)
    AND (max_price IS NULL OR p.price <= max_price)
    AND (is_organic_filter IS NULL OR p.is_organic = is_organic_filter)
    ORDER BY ts_rank(
        to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.description, '')),
        plainto_tsquery('english', search_query)
    ) DESC, p.avg_rating DESC
    LIMIT result_limit OFFSET result_offset;
END;
$$ LANGUAGE plpgsql;
