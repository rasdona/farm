-- KrishiConnect Nepal - Production Database
-- Migration 00010: Reviews, Expert Consultation, Crop Management

-- ============================================
-- FARMER REVIEWS
-- ============================================
CREATE TABLE public.farmer_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_id UUID,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    quality_rating SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
    communication_rating SMALLINT CHECK (communication_rating BETWEEN 1 AND 5),
    punctuality_rating SMALLINT CHECK (punctuality_rating BETWEEN 1 AND 5),
    title TEXT,
    comment TEXT,
    images TEXT[],
    is_verified BOOLEAN DEFAULT FALSE,
    status moderation_status DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_farmer_reviews_farmer ON public.farmer_reviews(farmer_id);
CREATE INDEX idx_farmer_reviews_reviewer ON public.farmer_reviews(reviewer_id);
CREATE INDEX idx_farmer_reviews_rating ON public.farmer_reviews(rating);

-- ============================================
-- WORKER REVIEWS
-- ============================================
CREATE TABLE public.worker_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    skill_rating SMALLINT CHECK (skill_rating BETWEEN 1 AND 5),
    reliability_rating SMALLINT CHECK (reliability_rating BETWEEN 1 AND 5),
    work_ethic_rating SMALLINT CHECK (work_ethic_rating BETWEEN 1 AND 5),
    title TEXT,
    comment TEXT,
    images TEXT[],
    is_verified BOOLEAN DEFAULT FALSE,
    status moderation_status DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_worker_reviews_worker ON public.worker_reviews(worker_id);
CREATE INDEX idx_worker_reviews_reviewer ON public.worker_reviews(reviewer_id);
CREATE INDEX idx_worker_reviews_rating ON public.worker_reviews(rating);

-- ============================================
-- SELLER REVIEWS
-- ============================================
CREATE TABLE public.seller_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    product_quality_rating SMALLINT CHECK (product_quality_rating BETWEEN 1 AND 5),
    delivery_rating SMALLINT CHECK (delivery_rating BETWEEN 1 AND 5),
    service_rating SMALLINT CHECK (service_rating BETWEEN 1 AND 5),
    title TEXT,
    comment TEXT,
    images TEXT[],
    is_verified BOOLEAN DEFAULT FALSE,
    status moderation_status DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_seller_reviews_seller ON public.seller_reviews(seller_id);
CREATE INDEX idx_seller_reviews_reviewer ON public.seller_reviews(reviewer_id);

-- ============================================
-- OVERALL REPUTATION
-- ============================================
CREATE TABLE public.user_reputation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    overall_score NUMERIC(3,2) DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 5),
    total_reviews INT DEFAULT 0,
    five_star_count INT DEFAULT 0,
    four_star_count INT DEFAULT 0,
    three_star_count INT DEFAULT 0,
    two_star_count INT DEFAULT 0,
    one_star_count INT DEFAULT 0,
    response_rate NUMERIC(5,2) DEFAULT 0,
    response_time_avg_hours NUMERIC(8,2),
    completion_rate NUMERIC(5,2) DEFAULT 0,
    dispute_rate NUMERIC(5,2) DEFAULT 0,
    badge_level TEXT DEFAULT 'newcomer' CHECK (badge_level IN ('newcomer', 'bronze', 'silver', 'gold', 'platinum', 'diamond')),
    trust_score NUMERIC(3,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_reputation_user ON public.user_reputation(user_id);
CREATE INDEX idx_user_reputation_score ON public.user_reputation(overall_score DESC);
CREATE INDEX idx_user_reputation_badge ON public.user_reputation(badge_level);

-- ============================================
-- AGRICULTURE EXPERTS
-- ============================================
CREATE TABLE public.experts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    specialization TEXT[] NOT NULL,
    qualifications TEXT[],
    experience_years SMALLINT DEFAULT 0,
    hourly_rate NUMERIC(10,2),
    consultation_fee NUMERIC(10,2),
    currency TEXT DEFAULT 'NPR',
    bio TEXT,
    certifications TEXT[],
    languages TEXT[] DEFAULT ARRAY['ne', 'en'],
    is_available BOOLEAN DEFAULT TRUE,
    available_hours JSONB DEFAULT '{}',
    province_id UUID REFERENCES public.provinces(id),
    district_id UUID REFERENCES public.districts(id),
    consultation_types TEXT[] DEFAULT ARRAY['chat', 'call', 'video', 'visit'],
    avg_rating NUMERIC(3,2) DEFAULT 0,
    total_ratings INT DEFAULT 0,
    total_consultations INT DEFAULT 0,
    total_earnings NUMERIC(12,2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_experts_user ON public.experts(user_id);
CREATE INDEX idx_experts_specialization ON public.experts USING gin(specialization);
CREATE INDEX idx_experts_available ON public.experts(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_experts_district ON public.experts(district_id);
CREATE INDEX idx_experts_rating ON public.experts(avg_rating DESC);

-- ============================================
-- CONSULTATION REQUESTS
-- ============================================
CREATE TABLE public.consultation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expert_id UUID REFERENCES public.experts(id),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'emergency')),
    consultation_type TEXT CHECK (consultation_type IN ('chat', 'call', 'video', 'visit')),
    preferred_date DATE,
    preferred_time TIME,
    farm_id UUID REFERENCES public.farmer_profiles(id),
    crop_type TEXT,
    images TEXT[],
    location TEXT,
    district_id UUID REFERENCES public.districts(id),
    status consultation_status DEFAULT 'requested',
    expert_response TEXT,
    quoted_price NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consultation_requests_client ON public.consultation_requests(client_id);
CREATE INDEX idx_consultation_requests_expert ON public.consultation_requests(expert_id);
CREATE INDEX idx_consultation_requests_status ON public.consultation_requests(status);
CREATE INDEX idx_consultation_requests_created ON public.consultation_requests(created_at DESC);

-- ============================================
-- EXPERT APPOINTMENTS
-- ============================================
CREATE TABLE public.expert_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES public.consultation_requests(id),
    expert_id UUID NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes SMALLINT DEFAULT 30,
    consultation_type TEXT NOT NULL,
    meeting_link TEXT,
    location TEXT,
    fee NUMERIC(10,2) NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    status appointment_status DEFAULT 'pending',
    notes TEXT,
    expert_notes TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expert_appointments_expert ON public.expert_appointments(expert_id);
CREATE INDEX idx_expert_appointments_client ON public.expert_appointments(client_id);
CREATE INDEX idx_expert_appointments_date ON public.expert_appointments(appointment_date);
CREATE INDEX idx_expert_appointments_status ON public.expert_appointments(status);

-- ============================================
-- CONSULTATION REVIEWS
-- ============================================
CREATE TABLE public.consultation_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES public.consultation_requests(id),
    appointment_id UUID REFERENCES public.expert_appointments(id),
    expert_id UUID NOT NULL REFERENCES public.experts(id),
    reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    knowledge_rating SMALLINT CHECK (knowledge_rating BETWEEN 1 AND 5),
    helpfulness_rating SMALLINT CHECK (helpfulness_rating BETWEEN 1 AND 5),
    title TEXT,
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    status moderation_status DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_consultation_reviews_expert ON public.consultation_reviews(expert_id);
CREATE INDEX idx_consultation_reviews_reviewer ON public.consultation_reviews(reviewer_id);

-- ============================================
-- CONSULTATION PAYMENTS
-- ============================================
CREATE TABLE public.consultation_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES public.consultation_requests(id),
    appointment_id UUID REFERENCES public.expert_appointments(id),
    client_id UUID NOT NULL REFERENCES public.users(id),
    expert_id UUID NOT NULL REFERENCES public.users(id),
    amount NUMERIC(10,2) NOT NULL,
    platform_commission NUMERIC(10,2) DEFAULT 0,
    expert_payout NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'NPR',
    payment_method TEXT,
    transaction_id TEXT,
    status payment_status DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CROP DIARY
-- ============================================
CREATE TABLE public.crop_diary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farmer_profiles(id),
    crop_name TEXT NOT NULL,
    variety TEXT,
    area NUMERIC(10,2),
    area_unit TEXT DEFAULT 'bigha',
    season TEXT,
    year SMALLINT,
    current_stage crop_stage DEFAULT 'planning',
    planting_date DATE,
    expected_harvest_date DATE,
    actual_harvest_date DATE,
    notes TEXT,
    images TEXT[],
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_crop_diary_farmer ON public.crop_diary(farmer_id);
CREATE INDEX idx_crop_diary_crop ON public.crop_diary(crop_name);
CREATE INDEX idx_crop_diary_season ON public.crop_diary(season, year);
CREATE INDEX idx_crop_diary_stage ON public.crop_diary(current_stage);

-- ============================================
-- PLANTING RECORDS
-- ============================================
CREATE TABLE public.planting_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_diary_id UUID NOT NULL REFERENCES public.crop_diary(id) ON DELETE CASCADE,
    planting_date DATE NOT NULL,
    seed_variety TEXT,
    seed_quantity NUMERIC(10,2),
    seed_source TEXT,
    seed_cost NUMERIC(10,2),
    soil_type TEXT,
    soil_ph NUMERIC(4,2),
    preparation_method TEXT,
    spacing TEXT,
    depth_cm NUMERIC(5,2),
    irrigation_method TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_planting_records_crop_diary ON public.planting_records(crop_diary_id);

-- ============================================
-- HARVEST RECORDS
-- ============================================
CREATE TABLE public.harvest_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_diary_id UUID NOT NULL REFERENCES public.crop_diary(id) ON DELETE CASCADE,
    harvest_date DATE NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit TEXT DEFAULT 'kg',
    quality_grade TEXT CHECK (quality_grade IN ('premium', 'grade_a', 'grade_b', 'grade_c', 'rejected')),
    price_per_unit NUMERIC(10,2),
    total_revenue NUMERIC(12,2),
    buyer_name TEXT,
    storage_method TEXT,
    notes TEXT,
    images TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_harvest_records_crop_diary ON public.harvest_records(crop_diary_id);
CREATE INDEX idx_harvest_records_date ON public.harvest_records(harvest_date);

-- ============================================
-- FERTILIZER SCHEDULE
-- ============================================
CREATE TABLE public.fertilizer_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_diary_id UUID NOT NULL REFERENCES public.crop_diary(id) ON DELETE CASCADE,
    fertilizer_type TEXT NOT NULL,
    brand TEXT,
    quantity NUMERIC(10,2),
    unit TEXT DEFAULT 'kg',
    application_date DATE NOT NULL,
    method TEXT,
    cost NUMERIC(10,2),
    stage TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fertilizer_schedule_crop_diary ON public.fertilizer_schedule(crop_diary_id);
CREATE INDEX idx_fertilizer_schedule_date ON public.fertilizer_schedule(application_date);

-- ============================================
-- PEST REPORTS
-- ============================================
CREATE TABLE public.pest_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_diary_id UUID NOT NULL REFERENCES public.crop_diary(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.farmer_profiles(id),
    pest_name TEXT NOT NULL,
    pest_type TEXT,
    severity pest_severity DEFAULT 'medium',
    affected_area NUMERIC(10,2),
    affected_area_unit TEXT DEFAULT 'bigha',
    first_observed DATE,
    images TEXT[],
    location GEOGRAPHY(POINT, 4326),
    district_id UUID REFERENCES public.districts(id),
    description TEXT,
    treatment_applied TEXT,
    treatment_date DATE,
    treatment_effectiveness TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pest_reports_crop_diary ON public.pest_reports(crop_diary_id);
CREATE INDEX idx_pest_reports_farmer ON public.pest_reports(farmer_id);
CREATE INDEX idx_pest_reports_severity ON public.pest_reports(severity);
CREATE INDEX idx_pest_reports_district ON public.pest_reports(district_id);

-- ============================================
-- DISEASE REPORTS
-- ============================================
CREATE TABLE public.disease_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_diary_id UUID NOT NULL REFERENCES public.crop_diary(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.farmer_profiles(id),
    disease_name TEXT NOT NULL,
    disease_type TEXT,
    severity pest_severity DEFAULT 'medium',
    affected_area NUMERIC(10,2),
    first_observed DATE,
    images TEXT[],
    location GEOGRAPHY(POINT, 4326),
    district_id UUID REFERENCES public.districts(id),
    description TEXT,
    diagnosis_source TEXT,
    treatment_applied TEXT,
    treatment_date DATE,
    is_contagious BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disease_reports_crop_diary ON public.disease_reports(crop_diary_id);
CREATE INDEX idx_disease_reports_farmer ON public.disease_reports(farmer_id);
CREATE INDEX idx_disease_reports_severity ON public.disease_reports(severity);

-- ============================================
-- YIELD REPORTS
-- ============================================
CREATE TABLE public.yield_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_diary_id UUID NOT NULL REFERENCES public.crop_diary(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.farmer_profiles(id),
    season TEXT NOT NULL,
    year SMALLINT NOT NULL,
    crop_name TEXT NOT NULL,
    variety TEXT,
    area NUMERIC(10,2),
    area_unit TEXT DEFAULT 'bigha',
    expected_yield NUMERIC(10,2),
    actual_yield NUMERIC(10,2),
    yield_unit TEXT DEFAULT 'kg',
    quality_notes TEXT,
    comparison_to_last_season NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_yield_reports_crop_diary ON public.yield_reports(crop_diary_id);
CREATE INDEX idx_yield_reports_farmer ON public.yield_reports(farmer_id);
CREATE INDEX idx_yield_reports_season ON public.yield_reports(season, year);
