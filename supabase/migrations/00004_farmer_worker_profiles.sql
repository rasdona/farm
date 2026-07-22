-- KrishiConnect Nepal - Production Database
-- Migration 00004: Farmer & Worker Profiles

-- ============================================
-- FARMER PROFILES
-- ============================================
CREATE TABLE public.farmer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    farm_name TEXT NOT NULL,
    farm_type TEXT CHECK (farm_type IN ('crop', 'livestock', 'mixed', 'organic', 'greenhouse', 'aquaculture', 'other')),
    farm_size NUMERIC(10,2),
    farm_size_unit TEXT DEFAULT 'bigha' CHECK (farm_size_unit IN ('bigha', 'hectare', 'acre', 'ropani', 'kattha')),
    crop_types TEXT[],
    is_organic BOOLEAN DEFAULT FALSE,
    organic_since DATE,
    gps_coordinates GEOGRAPHY(POINT, 4326),
    address TEXT,
    province_id UUID REFERENCES public.provinces(id),
    district_id UUID REFERENCES public.districts(id),
    local_body_id UUID REFERENCES public.local_bodies(id),
    ward_id UUID REFERENCES public.wards(id),
    biography TEXT,
    years_experience SMALLINT DEFAULT 0,
    verification_status verification_status DEFAULT 'unverified',
    avg_rating NUMERIC(3,2) DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
    total_ratings INT DEFAULT 0,
    follower_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    total_products_sold INT DEFAULT 0,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_farmer_profiles_user ON public.farmer_profiles(user_id);
CREATE INDEX idx_farmer_profiles_district ON public.farmer_profiles(district_id);
CREATE INDEX idx_farmer_profiles_local_body ON public.farmer_profiles(local_body_id);
CREATE INDEX idx_farmer_profiles_farm_type ON public.farmer_profiles(farm_type);
CREATE INDEX idx_farmer_profiles_organic ON public.farmer_profiles(is_organic) WHERE is_organic = TRUE;
CREATE INDEX idx_farmer_profiles_rating ON public.farmer_profiles(avg_rating DESC);
CREATE INDEX idx_farmer_profiles_status ON public.farmer_profiles(status);
CREATE INDEX idx_farmer_profiles_crop_types ON public.farmer_profiles USING gin(crop_types);

-- ============================================
-- FARM IMAGES
-- ============================================
CREATE TABLE public.farm_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order SMALLINT DEFAULT 0,
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_farm_images_farmer ON public.farm_images(farmer_id);

-- ============================================
-- FARM CERTIFICATES
-- ============================================
CREATE TABLE public.farm_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    certificate_name TEXT NOT NULL,
    certificate_type TEXT,
    issued_by TEXT,
    issue_date DATE,
    expiry_date DATE,
    document_url TEXT,
    verification_status verification_status DEFAULT 'unverified',
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_farm_certificates_farmer ON public.farm_certificates(farmer_id);

-- ============================================
-- FARM FOLLOWERS
-- ============================================
CREATE TABLE public.farm_followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(farmer_id, follower_id)
);

CREATE INDEX idx_farm_followers_farmer ON public.farm_followers(farmer_id);
CREATE INDEX idx_farm_followers_follower ON public.farm_followers(follower_id);

-- ============================================
-- WORKER PROFILES
-- ============================================
CREATE TABLE public.worker_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    display_name TEXT,
    skills TEXT[] DEFAULT '{}',
    specializations TEXT[],
    experience_years SMALLINT DEFAULT 0,
    daily_wage NUMERIC(10,2),
    monthly_wage NUMERIC(12,2),
    wage_currency TEXT DEFAULT 'NPR',
    is_available BOOLEAN DEFAULT TRUE,
    available_from DATE,
    available_until DATE,
    availability_schedule JSONB DEFAULT '{}',
    languages TEXT[] DEFAULT ARRAY['ne'],
    preferred_work TEXT[],
    has_accommodation BOOLEAN DEFAULT FALSE,
    willing_to_relocate BOOLEAN DEFAULT FALSE,
    max_relocation_km INT,
    bio TEXT,
    portfolio_url TEXT,
    verification_status verification_status DEFAULT 'unverified',
    avg_rating NUMERIC(3,2) DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
    total_ratings INT DEFAULT 0,
    total_jobs_completed INT DEFAULT 0,
    total_earnings NUMERIC(12,2) DEFAULT 0,
    current_status TEXT DEFAULT 'idle' CHECK (current_status IN ('idle', 'hired', 'on_leave', 'unavailable')),
    province_id UUID REFERENCES public.provinces(id),
    district_id UUID REFERENCES public.districts(id),
    local_body_id UUID REFERENCES public.local_bodies(id),
    is_featured BOOLEAN DEFAULT FALSE,
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_worker_profiles_user ON public.worker_profiles(user_id);
CREATE INDEX idx_worker_profiles_skills ON public.worker_profiles USING gin(skills);
CREATE INDEX idx_worker_profiles_available ON public.worker_profiles(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_worker_profiles_district ON public.worker_profiles(district_id);
CREATE INDEX idx_worker_profiles_rating ON public.worker_profiles(avg_rating DESC);
CREATE INDEX idx_worker_profiles_status ON public.worker_profiles(status);
CREATE INDEX idx_worker_profiles_wage ON public.worker_profiles(daily_wage);
CREATE INDEX idx_worker_profiles_specializations ON public.worker_profiles USING gin(specializations);

-- ============================================
-- WORKER CERTIFICATES
-- ============================================
CREATE TABLE public.worker_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
    certificate_name TEXT NOT NULL,
    issuing_organization TEXT,
    issue_date DATE,
    expiry_date DATE,
    document_url TEXT,
    verification_status verification_status DEFAULT 'unverified',
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worker_certificates_worker ON public.worker_certificates(worker_id);

-- ============================================
-- WORKER AVAILABILITY LOG
-- ============================================
CREATE TABLE public.worker_availability_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
    date_from DATE NOT NULL,
    date_to DATE,
    status TEXT NOT NULL CHECK (status IN ('available', 'busy', 'unavailable', 'on_leave')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worker_availability_worker ON public.worker_availability_log(worker_id);
CREATE INDEX idx_worker_availability_dates ON public.worker_availability_log(date_from, date_to);

-- ============================================
-- BUYER PROFILES
-- ============================================
CREATE TABLE public.buyer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    business_name TEXT,
    business_type TEXT CHECK (business_type IN ('individual', 'retailer', 'wholesaler', 'restaurant', 'hotel', 'cooperative', 'exporter', 'other')),
    gst_number TEXT,
    business_license TEXT,
    delivery_address TEXT,
    province_id UUID REFERENCES public.provinces(id),
    district_id UUID REFERENCES public.districts(id),
    local_body_id UUID REFERENCES public.local_bodies(id),
    preferred_categories TEXT[],
    avg_rating NUMERIC(3,2) DEFAULT 0,
    total_orders INT DEFAULT 0,
    total_spent NUMERIC(12,2) DEFAULT 0,
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_buyer_profiles_user ON public.buyer_profiles(user_id);

-- ============================================
-- SELLER PROFILES
-- ============================================
CREATE TABLE public.seller_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    store_description TEXT,
    store_logo TEXT,
    store_banner TEXT,
    business_type TEXT,
    gst_number TEXT,
    business_license TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    province_id UUID REFERENCES public.provinces(id),
    district_id UUID REFERENCES public.districts(id),
    local_body_id UUID REFERENCES public.local_bodies(id),
    avg_rating NUMERIC(3,2) DEFAULT 0,
    total_sales INT DEFAULT 0,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    commission_rate NUMERIC(5,2) DEFAULT 5.00,
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_seller_profiles_user ON public.seller_profiles(user_id);
CREATE INDEX idx_seller_profiles_store ON public.seller_profiles(store_name);
