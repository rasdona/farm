-- KrishiConnect Nepal - Production Database
-- Migration 00008: Equipment Rental

-- ============================================
-- EQUIPMENT CATEGORIES
-- ============================================
CREATE TABLE public.equipment_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES public.equipment_categories(id),
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

INSERT INTO public.equipment_categories (name_en, slug, description) VALUES
('Tractors', 'tractors', 'Farm tractors and attachments'),
('Tillers', 'tillers', 'Power tillers and cultivators'),
('Irrigation', 'irrigation', 'Pumps, sprinklers, drip systems'),
('Harvesters', 'harvesters', 'Reapers, threshers, combines'),
('Sprayers', 'sprayers', 'Pesticide and fertilizer sprayers'),
('Driers', 'driers', 'Grain and crop driers'),
('Storage', 'storage', 'Silos, cold storage, containers'),
('Transport', 'transport', 'Carts, trailers, loaders'),
('Processing', 'processing', 'Mills, grinders, separators'),
('Other', 'other', 'Other agricultural equipment');

-- ============================================
-- EQUIPMENT
-- ============================================
CREATE TABLE public.equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.equipment_categories(id),
    name TEXT NOT NULL,
    description TEXT,
    brand TEXT,
    model TEXT,
    year_manufactured SMALLINT,
    condition TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
    hourly_rate NUMERIC(10,2),
    daily_rate NUMERIC(10,2),
    weekly_rate NUMERIC(10,2),
    monthly_rate NUMERIC(10,2),
    currency TEXT DEFAULT 'NPR',
    security_deposit NUMERIC(10,2) DEFAULT 0,
    includes_operator BOOLEAN DEFAULT FALSE,
    operator_charge NUMERIC(10,2),
    delivery_available BOOLEAN DEFAULT FALSE,
    delivery_fee NUMERIC(10,2),
    delivery_radius_km INT,
    province_id UUID REFERENCES public.provinces(id),
    district_id UUID REFERENCES public.districts(id),
    local_body_id UUID REFERENCES public.local_bodies(id),
    gps_location GEOGRAPHY(POINT, 4326),
    address TEXT,
    specifications JSONB DEFAULT '{}',
    status equipment_status DEFAULT 'available',
    is_insured BOOLEAN DEFAULT FALSE,
    insurance_details TEXT,
    total_rentals INT DEFAULT 0,
    avg_rating NUMERIC(3,2) DEFAULT 0,
    total_ratings INT DEFAULT 0,
    view_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_equipment_owner ON public.equipment(owner_id);
CREATE INDEX idx_equipment_category ON public.equipment(category_id);
CREATE INDEX idx_equipment_status ON public.equipment(status);
CREATE INDEX idx_equipment_district ON public.equipment(district_id);
CREATE INDEX idx_equipment_daily_rate ON public.equipment(daily_rate);
CREATE INDEX idx_equipment_featured ON public.equipment(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_equipment_name_trgm ON public.equipment USING gin(name gin_trgm_ops);

-- ============================================
-- EQUIPMENT IMAGES
-- ============================================
CREATE TABLE public.equipment_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order SMALLINT DEFAULT 0,
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_equipment_images_equipment ON public.equipment_images(equipment_id);

-- ============================================
-- EQUIPMENT BOOKINGS
-- ============================================
CREATE TABLE public.equipment_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    renter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    booking_start TIMESTAMPTZ NOT NULL,
    booking_end TIMESTAMPTZ NOT NULL,
    rental_type TEXT NOT NULL CHECK (rental_type IN ('hourly', 'daily', 'weekly', 'monthly')),
    total_hours NUMERIC(8,2),
    base_cost NUMERIC(12,2) NOT NULL,
    delivery_fee NUMERIC(10,2) DEFAULT 0,
    operator_charge NUMERIC(10,2) DEFAULT 0,
    security_deposit NUMERIC(10,2) DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    total_cost NUMERIC(12,2) NOT NULL,
    requires_delivery BOOLEAN DEFAULT FALSE,
    delivery_address TEXT,
    delivery_gps GEOGRAPHY(POINT, 4326),
    needs_operator BOOLEAN DEFAULT FALSE,
    status booking_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_equipment_bookings_equipment ON public.equipment_bookings(equipment_id);
CREATE INDEX idx_equipment_bookings_renter ON public.equipment_bookings(renter_id);
CREATE INDEX idx_equipment_bookings_status ON public.equipment_bookings(status);
CREATE INDEX idx_equipment_bookings_dates ON public.equipment_bookings(booking_start, booking_end);

-- ============================================
-- EQUIPMENT MAINTENANCE
-- ============================================
CREATE TABLE public.equipment_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    maintenance_type TEXT CHECK (maintenance_type IN ('scheduled', 'repair', 'inspection', 'upgrade')),
    description TEXT NOT NULL,
    cost NUMERIC(10,2) DEFAULT 0,
    performed_by TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    next_maintenance_date DATE,
    status maintenance_status DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_equipment_maintenance_equipment ON public.equipment_maintenance(equipment_id);
CREATE INDEX idx_equipment_maintenance_status ON public.equipment_maintenance(status);
CREATE INDEX idx_equipment_maintenance_next ON public.equipment_maintenance(next_maintenance_date) WHERE status = 'scheduled';

-- ============================================
-- EQUIPMENT REVIEWS
-- ============================================
CREATE TABLE public.equipment_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.equipment_bookings(id),
    reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title TEXT,
    comment TEXT,
    images TEXT[],
    is_verified_booking BOOLEAN DEFAULT FALSE,
    status moderation_status DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_equipment_reviews_equipment ON public.equipment_reviews(equipment_id);
CREATE INDEX idx_equipment_reviews_reviewer ON public.equipment_reviews(reviewer_id);
