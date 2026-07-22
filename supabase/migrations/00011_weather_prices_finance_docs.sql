-- KrishiConnect Nepal - Production Database
-- Migration 00011: Weather, Market Prices, Finance, Documents

-- ============================================
-- WEATHER LOCATIONS
-- ============================================
CREATE TABLE public.weather_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    district_id UUID REFERENCES public.districts(id),
    local_body_id UUID REFERENCES public.local_bodies(id),
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    elevation_m INT,
    timezone TEXT DEFAULT 'Asia/Kathmandu',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weather_locations_district ON public.weather_locations(district_id);

-- ============================================
-- WEATHER ALERTS
-- ============================================
CREATE TABLE public.weather_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES public.weather_locations(id),
    alert_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity alert_severity DEFAULT 'info',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    source TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weather_alerts_location ON public.weather_alerts(location_id);
CREATE INDEX idx_weather_alerts_active ON public.weather_alerts(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_weather_alerts_severity ON public.weather_alerts(severity);

-- ============================================
-- WEATHER HISTORY
-- ============================================
CREATE TABLE public.weather_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES public.weather_locations(id),
    recorded_at TIMESTAMPTZ NOT NULL,
    temperature_c NUMERIC(5,2),
    feels_like_c NUMERIC(5,2),
    humidity_pct NUMERIC(5,2),
    wind_speed_kmh NUMERIC(5,2),
    wind_direction TEXT,
    precipitation_mm NUMERIC(8,2),
    weather_condition TEXT,
    weather_icon TEXT,
    visibility_km NUMERIC(5,2),
    uv_index NUMERIC(4,2),
    air_quality_index INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weather_history_location ON public.weather_history(location_id);
CREATE INDEX idx_weather_history_recorded ON public.weather_history(recorded_at DESC);

-- ============================================
-- WEATHER FORECAST CACHE
-- ============================================
CREATE TABLE public.weather_forecast_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES public.weather_locations(id),
    forecast_date DATE NOT NULL,
    forecast_data JSONB NOT NULL,
    source TEXT DEFAULT 'openweathermap',
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(location_id, forecast_date, source)
);

CREATE INDEX idx_weather_forecast_location ON public.weather_forecast_cache(location_id);
CREATE INDEX idx_weather_forecast_expires ON public.weather_forecast_cache(expires_at);

-- ============================================
-- CROP CATEGORIES (for market prices)
-- ============================================
CREATE TABLE public.crop_price_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en TEXT NOT NULL,
    name_ne TEXT,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    sort_order SMALLINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.crop_price_categories (name_en, slug, sort_order) VALUES
('Rice', 'rice', 1),
('Wheat', 'wheat', 2),
('Maize', 'maize', 3),
('Millet', 'millet', 4),
('Barley', 'barley', 5),
('Lentils', 'lentils', 6),
('Beans', 'beans', 7),
('Potato', 'potato', 8),
('Tomato', 'tomato', 9),
('Onion', 'onion', 10),
('Vegetables', 'vegetables', 11),
('Fruits', 'fruits', 12),
('Spices', 'spices', 13),
('Oil Seeds', 'oil-seeds', 14),
('Other', 'other', 15);

-- ============================================
-- DAILY PRICES
-- ============================================
CREATE TABLE public.daily_crop_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.crop_price_categories(id),
    crop_name TEXT NOT NULL,
    variety TEXT,
    district_id UUID NOT NULL REFERENCES public.districts(id),
    market_name TEXT,
    price_date DATE NOT NULL,
    min_price NUMERIC(10,2),
    max_price NUMERIC(10,2),
    avg_price NUMERIC(10,2) NOT NULL,
    unit TEXT DEFAULT 'kg',
    currency TEXT DEFAULT 'NPR',
    price_change NUMERIC(10,2),
    price_change_pct NUMERIC(5,2),
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, crop_name, district_id, price_date, market_name)
);

CREATE INDEX idx_daily_crop_prices_category ON public.daily_crop_prices(category_id);
CREATE INDEX idx_daily_crop_prices_crop ON public.daily_crop_prices(crop_name);
CREATE INDEX idx_daily_crop_prices_district ON public.daily_crop_prices(district_id);
CREATE INDEX idx_daily_crop_prices_date ON public.daily_crop_prices(price_date DESC);
CREATE INDEX idx_daily_crop_prices_avg ON public.daily_crop_prices(avg_price);

-- ============================================
-- DISTRICT PRICES (aggregated)
-- ============================================
CREATE TABLE public.district_crop_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.crop_price_categories(id),
    district_id UUID NOT NULL REFERENCES public.districts(id),
    crop_name TEXT NOT NULL,
    current_price NUMERIC(10,2),
    min_price NUMERIC(10,2),
    max_price NUMERIC(10,2),
    unit TEXT DEFAULT 'kg',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, district_id, crop_name)
);

CREATE INDEX idx_district_crop_prices_district ON public.district_crop_prices(district_id);
CREATE INDEX idx_district_crop_prices_crop ON public.district_crop_prices(crop_name);

-- ============================================
-- HISTORICAL PRICES
-- ============================================
CREATE TABLE public.historical_crop_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.crop_price_categories(id),
    crop_name TEXT NOT NULL,
    district_id UUID NOT NULL REFERENCES public.districts(id),
    year SMALLINT NOT NULL,
    month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    avg_price NUMERIC(10,2),
    min_price NUMERIC(10,2),
    max_price NUMERIC(10,2),
    unit TEXT DEFAULT 'kg',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_historical_crop_prices_crop ON public.historical_crop_prices(crop_name);
CREATE INDEX idx_historical_crop_prices_district ON public.historical_crop_prices(district_id);
CREATE INDEX idx_historical_crop_prices_year ON public.historical_crop_prices(year, month);

-- ============================================
-- PRICE ALERTS
-- ============================================
CREATE TABLE public.price_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL,
    district_id UUID REFERENCES public.districts(id),
    target_price NUMERIC(10,2) NOT NULL,
    alert_condition TEXT CHECK (alert_condition IN ('above', 'below', 'equals')),
    is_active BOOLEAN DEFAULT TRUE,
    last_notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_alerts_user ON public.price_alerts(user_id);
CREATE INDEX idx_price_alerts_active ON public.price_alerts(is_active) WHERE is_active = TRUE;

-- ============================================
-- FINANCE: INCOME
-- ============================================
CREATE TABLE public.income_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'NPR',
    source_type TEXT,
    source_id UUID,
    reference_number TEXT,
    received_date DATE NOT NULL,
    payment_method TEXT,
    notes TEXT,
    attachments TEXT[],
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_income_records_user ON public.income_records(user_id);
CREATE INDEX idx_income_records_date ON public.income_records(received_date DESC);
CREATE INDEX idx_income_records_category ON public.income_records(category);

-- ============================================
-- FINANCE: EXPENSES
-- ============================================
CREATE TABLE public.expense_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'NPR',
    vendor TEXT,
    reference_number TEXT,
    expense_date DATE NOT NULL,
    payment_method TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern TEXT,
    receipt_url TEXT,
    notes TEXT,
    tags TEXT[],
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_expense_records_user ON public.expense_records(user_id);
CREATE INDEX idx_expense_records_date ON public.expense_records(expense_date DESC);
CREATE INDEX idx_expense_records_category ON public.expense_records(category);

-- ============================================
-- FINANCE: TRANSACTIONS
-- ============================================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'NPR',
    balance_after NUMERIC(12,2),
    reference_type TEXT,
    reference_id UUID,
    description TEXT,
    payment_method TEXT,
    transaction_id TEXT UNIQUE,
    status payment_status DEFAULT 'completed',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_status ON public.transactions(status);

-- ============================================
-- FINANCE: INVOICES
-- ============================================
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    recipient_name TEXT,
    recipient_email TEXT,
    recipient_address TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC(12,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'NPR',
    status invoice_status DEFAULT 'draft',
    due_date DATE,
    paid_date DATE,
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_user ON public.invoices(user_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);

-- ============================================
-- FINANCE: FINANCIAL REPORTS
-- ============================================
CREATE TABLE public.financial_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_income NUMERIC(12,2) DEFAULT 0,
    total_expenses NUMERIC(12,2) DEFAULT 0,
    net_profit NUMERIC(12,2) DEFAULT 0,
    report_data JSONB DEFAULT '{}',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financial_reports_user ON public.financial_reports(user_id);
CREATE INDEX idx_financial_reports_period ON public.financial_reports(period_start, period_end);

-- ============================================
-- DOCUMENTS: VERIFICATION DOCUMENTS
-- ============================================
CREATE TABLE public.verification_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    document_name TEXT NOT NULL,
    document_number TEXT,
    document_url TEXT NOT NULL,
    issuing_authority TEXT,
    issue_date DATE,
    expiry_date DATE,
    front_image_url TEXT,
    back_image_url TEXT,
    verification_status verification_status DEFAULT 'unverified',
    rejection_reason TEXT,
    verified_by UUID REFERENCES public.users(id),
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_documents_user ON public.verification_documents(user_id);
CREATE INDEX idx_verification_documents_type ON public.verification_documents(document_type);
CREATE INDEX idx_verification_documents_status ON public.verification_documents(verification_status);

-- ============================================
-- DOCUMENTS: UPLOADED FILES (generic)
-- ============================================
CREATE TABLE public.uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    bucket_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    download_count INT DEFAULT 0,
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_uploaded_files_user ON public.uploaded_files(user_id);
CREATE INDEX idx_uploaded_files_bucket ON public.uploaded_files(bucket_name);
