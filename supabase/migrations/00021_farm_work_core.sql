-- ============================================================
-- KrishiConnect Nepal — Farm Work Request System
-- Migration 00021: Core Tables
-- ============================================================
-- Replaces the traditional job vacancy system with a modern
-- farm work request system for agriculture in Nepal.
-- ============================================================

-- ============================================
-- 1. WORK CATEGORIES (Admin-managed)
-- ============================================
CREATE TABLE IF NOT EXISTS public.work_categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en     TEXT NOT NULL,
    name_ne     TEXT NOT NULL,
    icon        TEXT,
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.work_categories (name_en, name_ne, icon, sort_order) VALUES
('Rice Planting',        'धान रोपाई',        '🌾', 1),
('Rice Harvesting',      'धान कटाई',         '🌾', 2),
('Wheat Harvesting',     'गहुँ कटाई',        '🌾', 3),
('Maize Planting',       'मकै रोपाई',        '🌽', 4),
('Maize Harvesting',     'मकै कटाई',         '🌽', 5),
('Vegetable Farming',    'तरकारी खेती',      '🥬', 6),
('Fruit Harvesting',     'फलफूल कटाई',      '🍎', 7),
('Irrigation',           'सिंचाई',           '💧', 8),
('Weeding',              'घाँस निकाल्ने',     '🌱', 9),
('Fertilizer Application','मल प्रयोग',        '🧪', 10),
('Pesticide Spraying',   'कीटनाशक छर्काइ',   '🧴', 11),
('Greenhouse Work',      'ग्रीनहाउस काम',     '🏠', 12),
('Livestock Care',       'पशुपालन',           '🐄', 13),
('Dairy Farming',        'दूध उत्पादन',       '🥛', 14),
('Fish Farming',         'माछापालन',           '🐟', 15),
('Tractor Driving',      'ट्र्याक्टर चलाउने', '🚜', 16),
('Harvester Operation',  'हार्भेस्टर सञ्चालन','🚜', 17),
('Farm Cleaning',        'खेत सफाई',          '🧹', 18),
('Land Preparation',     'जमिन तयारी',        '🪨', 19),
('Tree Plantation',      'रुख रोपाई',         '🌳', 20),
('Fence Construction',   'बार निर्माण',       '🏗️', 21),
('Other',                'अन्य',              '📋', 99)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. WORK REQUESTS (Core table)
-- ============================================
CREATE TABLE IF NOT EXISTS public.work_requests (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Task details
    title                   TEXT NOT NULL,
    category_id             UUID REFERENCES public.work_categories(id),
    description             TEXT,
    crop_type               TEXT,
    urgency_level           TEXT DEFAULT 'normal'
                            CHECK (urgency_level IN ('low','normal','high','urgent')),

    -- Workers
    workers_needed          INT DEFAULT 1 CHECK (workers_needed > 0),
    workers_assigned        INT DEFAULT 0,
    preferred_gender        TEXT CHECK (preferred_gender IN ('male','female','any')),
    min_experience_years    INT DEFAULT 0,
    skills_required         TEXT[],

    -- Schedule
    work_date               DATE NOT NULL,
    start_time              TIME,
    expected_duration_hours NUMERIC(5,2),
    is_recurring            BOOLEAN DEFAULT FALSE,
    recurring_pattern       TEXT CHECK (recurring_pattern IN ('daily','weekly','biweekly','monthly')),

    -- Payment
    payment_type            TEXT NOT NULL DEFAULT 'paid'
                            CHECK (payment_type IN ('paid','arma_parma','hybrid')),
    payment_method          TEXT DEFAULT 'daily'
                            CHECK (payment_method IN ('daily','hourly','per_task','weekly','monthly')),
    payment_amount          NUMERIC(10,2),
    payment_currency        TEXT DEFAULT 'NPR',
    food_provided           BOOLEAN DEFAULT FALSE,
    accommodation_provided  BOOLEAN DEFAULT FALSE,
    tools_provided          BOOLEAN DEFAULT FALSE,
    equipment_required      TEXT,

    -- Arma Parma
    arma_parma_hours        INT,
    arma_parma_description  TEXT,

    -- Location
    province_id             INT REFERENCES public.provinces(id),
    district_id             INT REFERENCES public.districts(id),
    municipality_id         UUID,
    ward_number             INT,
    exact_address           TEXT,
    gps_lat                 NUMERIC(10,7),
    gps_lng                 NUMERIC(10,7),
    location_notes          TEXT,

    -- Contact
    contact_preference      TEXT DEFAULT 'chat'
                            CHECK (contact_preference IN ('chat','phone','both')),
    farmer_phone            TEXT,

    -- Status
    status                  TEXT DEFAULT 'open'
                            CHECK (status IN (
                                'draft','open','workers_confirmed',
                                'in_progress','completed','cancelled','expired'
                            )),
    cancellation_reason     TEXT,
    completed_at            TIMESTAMPTZ,

    -- Visibility
    visibility              TEXT DEFAULT 'public'
                            CHECK (visibility IN ('public','nearby','invite_only')),
    max_distance_km         INT DEFAULT 50,

    -- Stats
    view_count              INT DEFAULT 0,
    application_count       INT DEFAULT 0,

    -- Timestamps
    expires_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wr_farmer      ON public.work_requests(farmer_id);
CREATE INDEX idx_wr_category    ON public.work_requests(category_id);
CREATE INDEX idx_wr_status      ON public.work_requests(status);
CREATE INDEX idx_wr_work_date   ON public.work_requests(work_date);
CREATE INDEX idx_wr_province    ON public.work_requests(province_id);
CREATE INDEX idx_wr_district    ON public.work_requests(district_id);
CREATE INDEX idx_wr_location    ON public.work_requests(gps_lat, gps_lng);
CREATE INDEX idx_wr_created     ON public.work_requests(created_at DESC);
CREATE INDEX idx_wr_payment     ON public.work_requests(payment_type);
CREATE INDEX idx_wr_urgency     ON public.work_requests(urgency_level);

-- GiST for distance queries (if PostGIS available, otherwise use btree)
-- CREATE INDEX idx_wr_geo ON public.work_requests USING gist (
--     ST_SetSRID(ST_MakePoint(gps_lng, gps_lat), 4326)
-- );

-- ============================================
-- 3. WORK APPLICATIONS (Worker responses)
-- ============================================
CREATE TABLE IF NOT EXISTS public.work_applications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_request_id UUID NOT NULL REFERENCES public.work_requests(id) ON DELETE CASCADE,
    worker_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    status          TEXT DEFAULT 'interested'
                    CHECK (status IN (
                        'interested','pending','accepted','declined',
                        'cancelled','completed','no_show'
                    )),

    message         TEXT,
    proposed_wage   NUMERIC(10,2),
    estimated_hours NUMERIC(5,2),

    -- Response tracking
    farmer_responded_at TIMESTAMPTZ,
    worker_cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(work_request_id, worker_id)
);

CREATE INDEX idx_wa_work    ON public.work_applications(work_request_id);
CREATE INDEX idx_wa_worker  ON public.work_applications(worker_id);
CREATE INDEX idx_wa_status  ON public.work_applications(status);

-- ============================================
-- 4. ASSIGNED WORKERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.assigned_workers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_request_id UUID NOT NULL REFERENCES public.work_requests(id) ON DELETE CASCADE,
    worker_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    application_id  UUID REFERENCES public.work_applications(id),

    status          TEXT DEFAULT 'confirmed'
                    CHECK (status IN (
                        'confirmed','checked_in','working',
                        'completed','cancelled','no_show'
                    )),

    check_in_time   TIMESTAMPTZ,
    check_out_time  TIMESTAMPTZ,
    actual_hours    NUMERIC(5,2),
    work_notes      TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(work_request_id, worker_id)
);

CREATE INDEX idx_aw_work  ON public.assigned_workers(work_request_id);
CREATE INDEX idx_aw_worker ON public.assigned_workers(worker_id);
CREATE INDEX idx_aw_status ON public.assigned_workers(status);

-- ============================================
-- 5. WORKER AVAILABILITY
-- ============================================
CREATE TABLE IF NOT EXISTS public.worker_availability (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    all_day     BOOLEAN DEFAULT TRUE,
    start_time  TIME,
    end_time    TIME,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(worker_id, date)
);

CREATE INDEX idx_wav_worker ON public.worker_availability(worker_id);
CREATE INDEX idx_wav_date   ON public.worker_availability(date);

-- ============================================
-- 6. WORKER PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS public.worker_preferences (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    preferred_categories    UUID[],
    preferred_crops         TEXT[],
    preferred_payment_type  TEXT,
    preferred_payment_min   NUMERIC(10,2),
    preferred_max_distance  INT DEFAULT 30,
    preferred_gender_work   TEXT,
    willing_to_relocate     BOOLEAN DEFAULT FALSE,
    has_own_tools           BOOLEAN DEFAULT FALSE,
    has_own_transport       BOOLEAN DEFAULT FALSE,
    organic_farm_interest   BOOLEAN DEFAULT FALSE,

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(worker_id)
);

-- ============================================
-- 7. TASK HISTORY (Immutable log)
-- ============================================
CREATE TABLE IF NOT EXISTS public.task_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_request_id UUID NOT NULL REFERENCES public.work_requests(id) ON DELETE CASCADE,
    worker_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event           TEXT NOT NULL CHECK (event IN (
                        'created','updated','published','worker_applied',
                        'worker_accepted','worker_declined','worker_cancelled',
                        'work_started','work_paused','work_resumed',
                        'work_completed','work_cancelled','work_expired',
                        'payment_made','payment_received',
                        'rating_given','dispute_opened','dispute_resolved'
                    )),
    actor_id        UUID REFERENCES public.users(id),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_th_work    ON public.task_history(work_request_id);
CREATE INDEX idx_th_worker  ON public.task_history(worker_id);
CREATE INDEX idx_th_event   ON public.task_history(event);
CREATE INDEX idx_th_created ON public.task_history(created_at DESC);

-- ============================================
-- 8. PAYMENT HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS public.work_payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_request_id UUID NOT NULL REFERENCES public.work_requests(id),
    farmer_id       UUID NOT NULL REFERENCES public.users(id),
    worker_id       UUID NOT NULL REFERENCES public.users(id),

    amount          NUMERIC(10,2) NOT NULL,
    currency        TEXT DEFAULT 'NPR',
    payment_type    TEXT NOT NULL CHECK (payment_type IN (
                        'daily','hourly','per_task','weekly','monthly','arma_parma'
                    )),
    payment_method  TEXT DEFAULT 'cash' CHECK (payment_method IN (
                        'cash','bank_transfer','mobile_wallet','arma_parma','hybrid'
                    )),
    status          TEXT DEFAULT 'pending' CHECK (status IN (
                        'pending','paid','received','disputed','refunded'
                    )),

    paid_at         TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wp_work   ON public.work_payments(work_request_id);
CREATE INDEX idx_wp_farmer ON public.work_payments(farmer_id);
CREATE INDEX idx_wp_worker ON public.work_payments(worker_id);
CREATE INDEX idx_wp_status ON public.work_payments(status);

-- ============================================
-- 9. ARMA PARMA HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS public.arma_parma_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id       UUID NOT NULL REFERENCES public.users(id),
    worker_id       UUID NOT NULL REFERENCES public.users(id),
    work_request_id UUID REFERENCES public.work_requests(id),

    hours_exchanged NUMERIC(5,2) NOT NULL,
    task_description TEXT,
    direction       TEXT NOT NULL CHECK (direction IN ('farmer_gave','worker_gave','mutual')),

    status          TEXT DEFAULT 'pending' CHECK (status IN (
                        'pending','confirmed','completed','disputed'
                    )),
    confirmed_at    TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_aph_farmer ON public.arma_parma_history(farmer_id);
CREATE INDEX idx_aph_worker ON public.arma_parma_history(worker_id);
CREATE INDEX idx_aph_status ON public.arma_parma_history(status);

-- ============================================
-- 10. WORK RATINGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.work_ratings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_request_id UUID NOT NULL REFERENCES public.work_requests(id),
    rater_id        UUID NOT NULL REFERENCES public.users(id),
    ratee_id        UUID NOT NULL REFERENCES public.users(id),
    rater_type      TEXT NOT NULL CHECK (rater_type IN ('farmer','worker')),

    -- Individual scores (1-5)
    communication   SMALLINT CHECK (communication BETWEEN 1 AND 5),
    work_quality    SMALLINT CHECK (work_quality BETWEEN 1 AND 5),
    punctuality     SMALLINT CHECK (punctuality BETWEEN 1 AND 5),
    payment_experience SMALLINT CHECK (payment_experience BETWEEN 1 AND 5),
    overall_rating  NUMERIC(3,2) CHECK (overall_rating BETWEEN 1 AND 5),

    review          TEXT,
    would_recommend BOOLEAN DEFAULT TRUE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(work_request_id, rater_id)
);

CREATE INDEX idx_wr_work    ON public.work_ratings(work_request_id);
CREATE INDEX idx_wr_rater   ON public.work_ratings(rater_id);
CREATE INDEX idx_wr_ratee   ON public.work_ratings(ratee_id);

-- ============================================
-- 11. WORK NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.work_notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    work_request_id UUID REFERENCES public.work_requests(id) ON DELETE CASCADE,

    type            TEXT NOT NULL CHECK (type IN (
                        'new_request_nearby','request_updated','request_cancelled',
                        'worker_applied','worker_accepted','worker_declined',
                        'worker_cancelled','task_reminder','task_completed',
                        'payment_received','payment_pending',
                        'rating_received','chat_message',
                        'workers_needed','application_approved'
                    )),
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wn_user ON public.work_notifications(user_id);
CREATE INDEX idx_wn_unread ON public.work_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_wn_work ON public.work_notifications(work_request_id);

-- ============================================
-- 12. CHAT MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.work_chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_request_id UUID NOT NULL REFERENCES public.work_requests(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    message_type    TEXT DEFAULT 'text' CHECK (message_type IN (
                        'text','image','location','voice','system'
                    )),
    content         TEXT NOT NULL,
    media_url       TEXT,
    latitude        NUMERIC(10,7),
    longitude       NUMERIC(10,7),

    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wcm_work    ON public.work_chat_messages(work_request_id);
CREATE INDEX idx_wcm_sender  ON public.work_chat_messages(sender_id);
CREATE INDEX idx_wcm_receiver ON public.work_chat_messages(receiver_id);
CREATE INDEX idx_wcm_created ON public.work_chat_messages(created_at DESC);

-- ============================================
-- 13. WORK LOCATIONS (Saved locations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.work_locations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    label           TEXT NOT NULL,
    province_id     INT REFERENCES public.provinces(id),
    district_id     INT REFERENCES public.districts(id),
    municipality_id UUID,
    ward_number     INT,
    address         TEXT,
    gps_lat         NUMERIC(10,7),
    gps_lng         NUMERIC(10,7),
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wl_user ON public.work_locations(user_id);
