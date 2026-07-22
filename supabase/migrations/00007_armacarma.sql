-- KrishiConnect Nepal - Production Database
-- Migration 00007: Arma Parma (Labor Exchange System)

-- ============================================
-- ARMA PARMA REQUESTS
-- ============================================
CREATE TABLE public.armacarma_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farmer_profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    work_type TEXT NOT NULL,
    required_workers SMALLINT DEFAULT 1,
    offered_hours NUMERIC(5,1),
    credits_per_hour NUMERIC(5,2) DEFAULT 1.00,
    total_credits_offered NUMERIC(10,2),
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern JSONB,
    province_id UUID REFERENCES public.provinces(id),
    district_id UUID REFERENCES public.districts(id),
    local_body_id UUID REFERENCES public.local_bodies(id),
    gps_location GEOGRAPHY(POINT, 4326),
    address TEXT,
    skills_required TEXT[],
    provides_food BOOLEAN DEFAULT FALSE,
    provides_accommodation BOOLEAN DEFAULT FALSE,
    status armaparma_request_status DEFAULT 'open',
    matched_count SMALLINT DEFAULT 0,
    max_matches SMALLINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_armacarma_requests_requester ON public.armacarma_requests(requester_id);
CREATE INDEX idx_armacarma_requests_status ON public.armacarma_requests(status);
CREATE INDEX idx_armacarma_requests_district ON public.armacarma_requests(district_id);
CREATE INDEX idx_armacarma_requests_start_date ON public.armacarma_requests(start_date);
CREATE INDEX idx_armacarma_requests_work_type ON public.armacarma_requests(work_type);

-- ============================================
-- ARMA PARMA MEMBERS (participants in exchange)
-- ============================================
CREATE TABLE public.armacarma_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.armacarma_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    hours_offered NUMERIC(5,1) DEFAULT 0,
    hours_worked NUMERIC(5,1) DEFAULT 0,
    credits_earned NUMERIC(10,2) DEFAULT 0,
    credits_owed NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'joined' CHECK (status IN ('joined', 'in_progress', 'completed', 'cancelled', 'disputed')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(request_id, user_id)
);

CREATE INDEX idx_armacarma_members_request ON public.armacarma_members(request_id);
CREATE INDEX idx_armacarma_members_user ON public.armacarma_members(user_id);
CREATE INDEX idx_armacarma_members_status ON public.armacarma_members(status);

-- ============================================
-- LABOR CREDITS (wallet for exchange credits)
-- ============================================
CREATE TABLE public.labor_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    balance NUMERIC(10,2) DEFAULT 0 CHECK (balance >= 0),
    total_earned NUMERIC(10,2) DEFAULT 0,
    total_spent NUMERIC(10,2) DEFAULT 0,
    total_transferred NUMERIC(10,2) DEFAULT 0,
    total_expired NUMERIC(10,2) DEFAULT 0,
    is_frozen BOOLEAN DEFAULT FALSE,
    frozen_reason TEXT,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_labor_credits_user ON public.labor_credits(user_id);

-- Initialize credits for all users
CREATE OR REPLACE FUNCTION initialize_labor_credits()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.labor_credits (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_labor_credits
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_labor_credits();

-- ============================================
-- CREDIT TRANSACTIONS (exchange history)
-- ============================================
CREATE TABLE public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    transaction_type credit_transaction_type NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(10,2) NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    description TEXT,
    related_user_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON public.credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_created ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_reference ON public.credit_transactions(reference_type, reference_id);

-- ============================================
-- COMMUNITY EVENTS
-- ============================================
CREATE TABLE public.community_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT CHECK (event_type IN ('workshop', 'training', 'festival', 'market_day', 'community_work', 'meeting', 'other')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    location TEXT,
    province_id UUID REFERENCES public.provinces(id),
    district_id UUID REFERENCES public.districts(id),
    local_body_id UUID REFERENCES public.local_bodies(id),
    gps_location GEOGRAPHY(POINT, 4326),
    max_participants INT,
    current_participants INT DEFAULT 0,
    is_armacarma_enabled BOOLEAN DEFAULT FALSE,
    credits_per_hour NUMERIC(5,2),
    cover_image TEXT,
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_community_events_organizer ON public.community_events(organizer_id);
CREATE INDEX idx_community_events_start ON public.community_events(start_date);
CREATE INDEX idx_community_events_district ON public.community_events(district_id);
CREATE INDEX idx_community_events_type ON public.community_events(event_type);

-- ============================================
-- EVENT PARTICIPANTS
-- ============================================
CREATE TABLE public.event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'completed', 'cancelled')),
    credits_earned NUMERIC(10,2) DEFAULT 0,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    attended_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_participants_event ON public.event_participants(event_id);
CREATE INDEX idx_event_participants_user ON public.event_participants(user_id);
