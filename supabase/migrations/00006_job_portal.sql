-- KrishiConnect Nepal - Production Database
-- Migration 00006: Job Portal

-- ============================================
-- JOB CATEGORIES
-- ============================================
CREATE TABLE public.job_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES public.job_categories(id),
    name_en TEXT NOT NULL,
    name_ne TEXT,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order SMALLINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_categories_parent ON public.job_categories(parent_id);

INSERT INTO public.job_categories (name_en, slug, description) VALUES
('Planting', 'planting', 'Seed sowing and transplanting jobs'),
('Harvesting', 'harvesting', 'Crop harvesting and collection'),
('Irrigation', 'irrigation', 'Water management and irrigation work'),
('Pest Control', 'pest-control', 'Pesticide spraying and pest management'),
('Fertilizer Application', 'fertilizer-application', 'Applying fertilizers and soil treatment'),
('Livestock Care', 'livestock-care', 'Animal husbandry and dairy work'),
('Farm Maintenance', 'farm-maintenance', 'Fence repair, building maintenance'),
('Equipment Operation', 'equipment-operation', 'Operating farm machinery'),
('Processing', 'processing', 'Post-harvest processing and packaging'),
('Transportation', 'transportation', 'Loading, unloading, and transport'),
('Other', 'other', 'Other agricultural jobs');

-- ============================================
-- JOBS
-- ============================================
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poster_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    farmer_profile_id UUID REFERENCES public.farmer_profiles(id),
    category_id UUID REFERENCES public.job_categories(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    crop_type TEXT,
    required_workers SMALLINT DEFAULT 1 CHECK (required_workers > 0),
    hired_count SMALLINT DEFAULT 0,
    salary_type TEXT DEFAULT 'daily' CHECK (salary_type IN ('daily', 'monthly', 'per_task', 'negotiable')),
    salary_amount NUMERIC(10,2),
    salary_min NUMERIC(10,2),
    salary_max NUMERIC(10,2),
    currency TEXT DEFAULT 'NPR',
    provides_accommodation BOOLEAN DEFAULT FALSE,
    provides_food BOOLEAN DEFAULT FALSE,
    working_hours_start TIME,
    working_hours_end TIME,
    job_duration_days INT,
    start_date DATE,
    end_date DATE,
    is_urgent BOOLEAN DEFAULT FALSE,
    province_id UUID REFERENCES public.provinces(id),
    district_id UUID REFERENCES public.districts(id),
    local_body_id UUID REFERENCES public.local_bodies(id),
    ward_id UUID REFERENCES public.wards(id),
    gps_location GEOGRAPHY(POINT, 4326),
    address TEXT,
    skills_required TEXT[],
    experience_required SMALLINT DEFAULT 0,
    status job_status DEFAULT 'open',
    view_count INT DEFAULT 0,
    application_count INT DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_poster ON public.jobs(poster_id);
CREATE INDEX idx_jobs_farmer ON public.jobs(farmer_profile_id);
CREATE INDEX idx_jobs_category ON public.jobs(category_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_district ON public.jobs(district_id);
CREATE INDEX idx_jobs_created ON public.jobs(created_at DESC);
CREATE INDEX idx_jobs_salary ON public.jobs(salary_amount);
CREATE INDEX idx_jobs_urgent ON public.jobs(is_urgent) WHERE is_urgent = TRUE;
CREATE INDEX idx_jobs_expires ON public.jobs(expires_at) WHERE status = 'open';
CREATE INDEX idx_jobs_skills ON public.jobs USING gin(skills_required);
CREATE INDEX idx_jobs_search ON public.jobs USING gin(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- ============================================
-- JOB APPLICATIONS
-- ============================================
CREATE TABLE public.job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    worker_profile_id UUID REFERENCES public.worker_profiles(id),
    cover_letter TEXT,
    expected_salary NUMERIC(10,2),
    available_from DATE,
    status application_status DEFAULT 'pending',
    rejection_reason TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, applicant_id)
);

CREATE INDEX idx_job_applications_job ON public.job_applications(job_id);
CREATE INDEX idx_job_applications_applicant ON public.job_applications(applicant_id);
CREATE INDEX idx_job_applications_status ON public.job_applications(status);

-- ============================================
-- JOB ASSIGNMENTS
-- ============================================
CREATE TABLE public.job_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES public.job_applications(id),
    worker_profile_id UUID REFERENCES public.worker_profiles(id),
    start_date DATE,
    end_date DATE,
    agreed_salary NUMERIC(10,2),
    salary_type TEXT,
    status assignment_status DEFAULT 'active',
    completion_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_assignments_job ON public.job_assignments(job_id);
CREATE INDEX idx_job_assignments_worker ON public.job_assignments(worker_id);
CREATE INDEX idx_job_assignments_status ON public.job_assignments(status);

-- ============================================
-- JOB BOOKMARKS
-- ============================================
CREATE TABLE public.job_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, user_id)
);

CREATE INDEX idx_job_bookmarks_user ON public.job_bookmarks(user_id);

-- ============================================
-- JOB NOTIFICATIONS (for new matching jobs)
-- ============================================
CREATE TABLE public.job_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.job_categories(id),
    district_id UUID REFERENCES public.districts(id),
    min_salary NUMERIC(10,2),
    max_salary NUMERIC(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    last_notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_alerts_user ON public.job_alerts(user_id);
CREATE INDEX idx_job_alerts_active ON public.job_alerts(is_active) WHERE is_active = TRUE;
