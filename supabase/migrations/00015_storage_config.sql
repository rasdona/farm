-- KrishiConnect Nepal - Production Database
-- Migration 00015: Storage Buckets & Final Configuration

-- ============================================
-- SUPABASE STORAGE BUCKETS
-- ============================================
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- This file documents the required buckets and their policies

/*
Required Storage Buckets:
1. profile-images
   - Public: true
   - Max size: 5MB
   - Allowed types: image/jpeg, image/png, image/webp

2. farm-images
   - Public: true
   - Max size: 10MB
   - Allowed types: image/jpeg, image/png, image/webp

3. product-images
   - Public: true
   - Max size: 10MB
   - Allowed types: image/jpeg, image/png, image/webp

4. equipment-images
   - Public: true
   - Max size: 10MB
   - Allowed types: image/jpeg, image/png, image/webp

5. verification-documents
   - Public: false
   - Max size: 20MB
   - Allowed types: image/jpeg, image/png, application/pdf

6. community-media
   - Public: true
   - Max size: 50MB
   - Allowed types: image/jpeg, image/png, image/webp, video/mp4

7. chat-files
   - Public: false
   - Max size: 25MB
   - Allowed types: image/jpeg, image/png, application/pdf, application/msword

8. expert-documents
   - Public: false
   - Max size: 20MB
   - Allowed types: image/jpeg, image/png, application/pdf
*/

-- ============================================
-- INITIAL SYSTEM SETTINGS
-- ============================================
INSERT INTO public.system_settings (key, value, category, description, is_public) VALUES
('platform_name', '"KrishiConnect Nepal"', 'general', 'Platform display name', TRUE),
('platform_tagline', '"Connecting Nepal''s Agricultural Community"', 'general', 'Platform tagline', TRUE),
('default_currency', '"NPR"', 'general', 'Default currency code', TRUE),
('default_language', '"en"', 'general', 'Default language', TRUE),
('max_upload_size_mb', '50', 'general', 'Maximum file upload size in MB', FALSE),
('min_password_length', '8', 'security', 'Minimum password length', FALSE),
('max_login_attempts', '5', 'security', 'Max failed login attempts before lockout', FALSE),
('lockout_duration_minutes', '30', 'security', 'Account lockout duration', FALSE),
('otp_expiry_minutes', '5', 'security', 'OTP expiration time', FALSE),
('marketplace_commission_pct', '5.0', 'finance', 'Platform commission percentage', FALSE),
('equipment_commission_pct', '10.0', 'finance', 'Equipment rental commission', FALSE),
('expert_commission_pct', '15.0', 'finance', 'Expert consultation commission', FALSE),
('min_withdrawal_amount', '1000', 'finance', 'Minimum withdrawal amount in NPR', FALSE),
('max_products_per_seller', '500', 'marketplace', 'Max products per seller', FALSE),
('max_images_per_product', '10', 'marketplace', 'Max images per product', FALSE),
('job_expiry_days', '30', 'jobs', 'Job listing expiry in days', FALSE),
('max_job_applications', '50', 'jobs', 'Max applications per user per day', FALSE),
('weather_refresh_minutes', '30', 'weather', 'Weather data refresh interval', FALSE),
('price_refresh_hours', '6', 'marketplace', 'Market price refresh interval', FALSE),
('notification_batch_size', '100', 'notifications', 'Batch size for push notifications', FALSE);

-- ============================================
-- INDEXES FOR PERFORMANCE (additional)
-- ============================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_products_seller_status ON public.products(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_products_category_status ON public.products(category_id, status);
CREATE INDEX IF NOT EXISTS idx_products_district_status ON public.products(district_id, status);
CREATE INDEX IF NOT EXISTS idx_products_price_status ON public.products(price, status);

CREATE INDEX IF NOT EXISTS idx_jobs_status_district ON public.jobs(status, district_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON public.jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_category_status ON public.jobs(category_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_status ON public.orders(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON public.orders(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_status_created ON public.community_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_created ON public.community_posts(author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_equipment_status_district ON public.equipment(status, district_id);
CREATE INDEX IF NOT EXISTS idx_equipment_bookings_status_dates ON public.equipment_bookings(status, booking_start, booking_end);

CREATE INDEX IF NOT EXISTS idx_farmer_profiles_district_status ON public.farmer_profiles(district_id, status);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_district_status ON public.worker_profiles(district_id, status);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_available_skills ON public.worker_profiles USING gin(skills) WHERE is_available = TRUE;

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(id) WHERE account_status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(id) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_open ON public.jobs(id) WHERE status = 'open' AND deleted_at IS NULL;

-- ============================================
-- COMMENTS ON TABLES
-- ============================================
COMMENT ON TABLE public.users IS 'Core user profiles extending Supabase auth.users';
COMMENT ON TABLE public.roles IS 'Platform roles for multi-role support';
COMMENT ON TABLE public.user_roles IS 'Many-to-many relationship between users and roles';
COMMENT ON TABLE public.provinces IS '7 Provinces of Nepal';
COMMENT ON TABLE public.districts IS '77 Districts of Nepal';
COMMENT ON TABLE public.local_bodies IS 'Municipalities and Rural Municipalities of Nepal';
COMMENT ON TABLE public.wards IS 'Wards within local bodies';
COMMENT ON TABLE public.farmer_profiles IS 'Farmer-specific profile information';
COMMENT ON TABLE public.worker_profiles IS 'Agricultural worker profile information';
COMMENT ON TABLE public.buyer_profiles IS 'Buyer profile information';
COMMENT ON TABLE public.seller_profiles IS 'Seller/store profile information';
COMMENT ON TABLE public.products IS 'Marketplace product listings';
COMMENT ON TABLE public.orders IS 'Marketplace orders';
COMMENT ON TABLE public.jobs IS 'Agricultural job listings';
COMMENT ON TABLE public.job_applications IS 'Job application submissions';
COMMENT ON TABLE public.armacarma_requests IS 'Arma Parma labor exchange requests';
COMMENT ON TABLE public.labor_credits IS 'User labor credit balances';
COMMENT ON TABLE public.credit_transactions IS 'Labor credit transaction history';
COMMENT ON TABLE public.equipment IS 'Agricultural equipment for rental';
COMMENT ON TABLE public.equipment_bookings IS 'Equipment rental bookings';
COMMENT ON TABLE public.community_posts IS 'Community forum posts';
COMMENT ON TABLE public.messages IS 'Direct and group messages';
COMMENT ON TABLE public.notifications IS 'User notifications';
COMMENT ON TABLE public.experts IS 'Agriculture expert profiles';
COMMENT ON TABLE public.consultation_requests IS 'Expert consultation requests';
COMMENT ON TABLE public.crop_diary IS 'Farmer crop diary entries';
COMMENT ON TABLE public.daily_crop_prices IS 'Daily market prices by district';
COMMENT ON TABLE public.income_records IS 'User income tracking';
COMMENT ON TABLE public.expense_records IS 'User expense tracking';
COMMENT ON TABLE public.verification_documents IS 'User identity verification documents';
COMMENT ON TABLE public.system_settings IS 'Platform configuration settings';
COMMENT ON TABLE public.audit_logs IS 'Data modification audit trail';
