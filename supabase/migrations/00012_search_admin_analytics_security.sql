-- KrishiConnect Nepal - Production Database
-- Migration 00012: Search, Admin, Analytics, Security

-- ============================================
-- SEARCH HISTORY
-- ============================================
CREATE TABLE public.search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    search_type TEXT NOT NULL,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_history_user ON public.search_history(user_id);
CREATE INDEX idx_search_history_type ON public.search_history(search_type);
CREATE INDEX idx_search_history_created ON public.search_history(created_at DESC);

-- ============================================
-- SAVED SEARCHES
-- ============================================
CREATE TABLE public.saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    search_type TEXT NOT NULL,
    name TEXT NOT NULL,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    notify_on_new BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_searches_user ON public.saved_searches(user_id);

-- ============================================
-- FAVORITES (generic)
-- ============================================
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_type favorite_type NOT NULL,
    target_id UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_favorites_target ON public.favorites(target_type, target_id);

-- ============================================
-- BOOKMARKS
-- ============================================
CREATE TABLE public.bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    collection TEXT DEFAULT 'default',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_type, content_id)
);

CREATE INDEX idx_bookmarks_user ON public.bookmarks(user_id);
CREATE INDEX idx_bookmarks_content ON public.bookmarks(content_type, content_id);

-- ============================================
-- ADMIN: ADMINISTRATORS
-- ============================================
CREATE TABLE public.administrators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    permission_level permission_level DEFAULT 'read',
    department TEXT,
    can_manage_users BOOLEAN DEFAULT FALSE,
    can_manage_content BOOLEAN DEFAULT FALSE,
    can_manage_payments BOOLEAN DEFAULT FALSE,
    can_manage_settings BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT FALSE,
    can_moderate BOOLEAN DEFAULT FALSE,
    can_verify_users BOOLEAN DEFAULT FALSE,
    assigned_districts UUID[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_administrators_user ON public.administrators(user_id);
CREATE INDEX idx_administrators_permission ON public.administrators(permission_level);

-- ============================================
-- ADMIN: PERMISSIONS
-- ============================================
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADMIN: ROLES (extended for admin)
-- ============================================
CREATE TABLE public.admin_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permission_ids UUID[] DEFAULT '{}',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADMIN: ACTIVITY LOGS
-- ============================================
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    activity_type activity_type NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    description TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_type ON public.activity_logs(activity_type);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- ============================================
-- ADMIN: AUDIT LOGS
-- ============================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON public.audit_logs(record_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ============================================
-- ADMIN: SYSTEM SETTINGS
-- ============================================
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    category TEXT DEFAULT 'general',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_settings_key ON public.system_settings(key);
CREATE INDEX idx_system_settings_category ON public.system_settings(category);

-- ============================================
-- ADMIN: PLATFORM ANNOUNCEMENTS
-- ============================================
CREATE TABLE public.platform_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.administrators(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    announcement_type TEXT DEFAULT 'info' CHECK (announcement_type IN ('info', 'warning', 'maintenance', 'feature', 'policy')),
    target_audience TEXT[] DEFAULT ARRAY['all'],
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    view_count INT DEFAULT 0,
    dismiss_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADMIN: REPORTS
-- ============================================
CREATE TABLE public.admin_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES public.users(id),
    admin_id UUID REFERENCES public.administrators(id),
    report_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    evidence_urls TEXT[],
    status moderation_status DEFAULT 'pending',
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_reports_status ON public.admin_reports(status);
CREATE INDEX idx_admin_reports_type ON public.admin_reports(report_type);
CREATE INDEX idx_admin_reports_entity ON public.admin_reports(entity_type, entity_id);

-- ============================================
-- ADMIN: COMPLAINTS
-- ============================================
CREATE TABLE public.complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complainant_id UUID NOT NULL REFERENCES public.users(id),
    against_user_id UUID REFERENCES public.users(id),
    complaint_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[],
    status moderation_status DEFAULT 'pending',
    assigned_to UUID REFERENCES public.administrators(id),
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_complainant ON public.complaints(complainant_id);

-- ============================================
-- ADMIN: MODERATION QUEUE
-- ============================================
CREATE TABLE public.moderation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    submitted_by UUID NOT NULL REFERENCES public.users(id),
    reason TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES public.administrators(id),
    status moderation_status DEFAULT 'pending',
    moderator_notes TEXT,
    action_taken TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX idx_moderation_queue_priority ON public.moderation_queue(priority);
CREATE INDEX idx_moderation_queue_content ON public.moderation_queue(content_type, content_id);

-- ============================================
-- ADMIN: USER VERIFICATION QUEUE
-- ============================================
CREATE TABLE public.verification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    document_id UUID NOT NULL REFERENCES public.verification_documents(id),
    verification_type TEXT NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_to UUID REFERENCES public.administrators(id),
    status verification_status DEFAULT 'pending',
    reviewer_notes TEXT,
    rejection_reason TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_queue_status ON public.verification_queue(status);
CREATE INDEX idx_verification_queue_user ON public.verification_queue(user_id);

-- ============================================
-- ANALYTICS: DASHBOARD STATISTICS
-- ============================================
CREATE TABLE public.dashboard_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_date DATE NOT NULL,
    total_users INT DEFAULT 0,
    new_users_today INT DEFAULT 0,
    active_users_today INT DEFAULT 0,
    total_farmers INT DEFAULT 0,
    total_workers INT DEFAULT 0,
    total_buyers INT DEFAULT 0,
    total_sellers INT DEFAULT 0,
    total_products INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    total_revenue NUMERIC(14,2) DEFAULT 0,
    total_jobs INT DEFAULT 0,
    active_jobs INT DEFAULT 0,
    total_equipment INT DEFAULT 0,
    total_consultations INT DEFAULT 0,
    total_messages INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stat_date)
);

CREATE INDEX idx_dashboard_stats_date ON public.dashboard_stats(stat_date DESC);

-- ============================================
-- ANALYTICS: DAILY ACTIVE USERS
-- ============================================
CREATE TABLE public.daily_active_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    active_count INT DEFAULT 0,
    new_registrations INT DEFAULT 0,
    sessions_count INT DEFAULT 0,
    avg_session_duration_seconds INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date)
);

-- ============================================
-- ANALYTICS: MONTHLY ACTIVE USERS
-- ============================================
CREATE TABLE public.monthly_active_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year SMALLINT NOT NULL,
    month SMALLINT NOT NULL,
    active_count INT DEFAULT 0,
    new_registrations INT DEFAULT 0,
    churn_count INT DEFAULT 0,
    retention_rate NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, month)
);

-- ============================================
-- ANALYTICS: JOB STATISTICS
-- ============================================
CREATE TABLE public.job_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    new_jobs_posted INT DEFAULT 0,
    total_applications INT DEFAULT 0,
    jobs_filled INT DEFAULT 0,
    avg_salary NUMERIC(10,2) DEFAULT 0,
    top_categories JSONB DEFAULT '[]',
    top_locations JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date)
);

-- ============================================
-- ANALYTICS: MARKETPLACE STATISTICS
-- ============================================
CREATE TABLE public.marketplace_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    new_products_listed INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    total_revenue NUMERIC(14,2) DEFAULT 0,
    avg_order_value NUMERIC(10,2) DEFAULT 0,
    top_categories JSONB DEFAULT '[]',
    top_districts JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date)
);

-- ============================================
-- ANALYTICS: REVENUE STATISTICS
-- ============================================
CREATE TABLE public.revenue_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_revenue NUMERIC(14,2) DEFAULT 0,
    marketplace_revenue NUMERIC(14,2) DEFAULT 0,
    equipment_revenue NUMERIC(14,2) DEFAULT 0,
    consultation_revenue NUMERIC(14,2) DEFAULT 0,
    commission_earned NUMERIC(14,2) DEFAULT 0,
    refunds NUMERIC(14,2) DEFAULT 0,
    net_revenue NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date)
);

-- ============================================
-- ANALYTICS: USER GROWTH
-- ============================================
CREATE TABLE public.user_growth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_users INT DEFAULT 0,
    farmer_count INT DEFAULT 0,
    worker_count INT DEFAULT 0,
    buyer_count INT DEFAULT 0,
    seller_count INT DEFAULT 0,
    expert_count INT DEFAULT 0,
    growth_rate NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date)
);

-- ============================================
-- SECURITY: TWO FACTOR AUTH (future)
-- ============================================
CREATE TABLE public.two_factor_auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    secret_key TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    method TEXT DEFAULT 'totp' CHECK (method IN ('totp', 'sms', 'email')),
    backup_codes TEXT[],
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_two_factor_auth_user ON public.two_factor_auth(user_id);
