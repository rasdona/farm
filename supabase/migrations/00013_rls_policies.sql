-- KrishiConnect Nepal - Production Database
-- Migration 00013: Row Level Security (RLS) Policies

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.administrators
        WHERE user_id = auth.uid() AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(role_name active_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role_id = (SELECT id FROM public.roles WHERE name = role_name) AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's active role
CREATE OR REPLACE FUNCTION public.get_active_role()
RETURNS active_role AS $$
DECLARE
    role_val active_role;
BEGIN
    SELECT active_role INTO role_val FROM public.users WHERE id = auth.uid();
    RETURN role_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- ENABLE RLS ON ALL USER-GENERATED TABLES
-- ============================================

-- Core
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Profiles
ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_availability_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

-- Marketplace
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_analytics ENABLE ROW LEVEL SECURITY;

-- Jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;

-- Arma Parma
ALTER TABLE public.armacarma_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.armacarma_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Equipment
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_reviews ENABLE ROW LEVEL SECURITY;

-- Community
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Messaging
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.read_receipts ENABLE ROW LEVEL SECURITY;

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Reviews
ALTER TABLE public.farmer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;

-- Expert
ALTER TABLE public.experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_payments ENABLE ROW LEVEL SECURITY;

-- Crop Management
ALTER TABLE public.crop_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planting_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fertilizer_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pest_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_reports ENABLE ROW LEVEL SECURITY;

-- Finance
ALTER TABLE public.income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

-- Documents
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- Search
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Admin
ALTER TABLE public.administrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_queue ENABLE ROW LEVEL SECURITY;

-- Price Alerts
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS POLICIES
-- ============================================
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view other active profiles" ON public.users
    FOR SELECT USING (account_status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update users" ON public.users
    FOR UPDATE USING (public.is_admin());

-- ============================================
-- USER ROLES POLICIES
-- ============================================
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view active roles of others" ON public.user_roles
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (public.is_admin());

-- ============================================
-- FARMER PROFILES POLICIES
-- ============================================
CREATE POLICY "Anyone can view active farmer profiles" ON public.farmer_profiles
    FOR SELECT USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Farmers can view own profile" ON public.farmer_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Farmers can update own profile" ON public.farmer_profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Farmers can insert own profile" ON public.farmer_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Farmers can delete own profile" ON public.farmer_profiles
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- FARM IMAGES POLICIES
-- ============================================
CREATE POLICY "Anyone can view farm images" ON public.farm_images
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.farmer_profiles WHERE id = farmer_id AND status = 'active' AND deleted_at IS NULL)
    );

CREATE POLICY "Farmers can manage own farm images" ON public.farm_images
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.farmer_profiles WHERE id = farmer_id AND user_id = auth.uid())
    );

-- ============================================
-- FARM CERTIFICATES POLICIES
-- ============================================
CREATE POLICY "Farmers can view own certificates" ON public.farm_certificates
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.farmer_profiles WHERE id = farmer_id AND user_id = auth.uid())
    );

CREATE POLICY "Farmers can manage own certificates" ON public.farm_certificates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.farmer_profiles WHERE id = farmer_id AND user_id = auth.uid())
    );

-- ============================================
-- FARM FOLLOWERS POLICIES
-- ============================================
CREATE POLICY "Anyone can view farm followers" ON public.farm_followers
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can follow farms" ON public.farm_followers
    FOR INSERT WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow farms" ON public.farm_followers
    FOR DELETE USING (follower_id = auth.uid());

-- ============================================
-- WORKER PROFILES POLICIES
-- ============================================
CREATE POLICY "Anyone can view active worker profiles" ON public.worker_profiles
    FOR SELECT USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Workers can view own profile" ON public.worker_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Workers can update own profile" ON public.worker_profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Workers can insert own profile" ON public.worker_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- WORKER CERTIFICATES POLICIES
-- ============================================
CREATE POLICY "Workers can view own certificates" ON public.worker_certificates
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.worker_profiles WHERE id = worker_id AND user_id = auth.uid())
    );

CREATE POLICY "Workers can manage own certificates" ON public.worker_certificates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.worker_profiles WHERE id = worker_id AND user_id = auth.uid())
    );

-- ============================================
-- BUYER PROFILES POLICIES
-- ============================================
CREATE POLICY "Buyers can view own profile" ON public.buyer_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Buyers can update own profile" ON public.buyer_profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Buyers can insert own profile" ON public.buyer_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- SELLER PROFILES POLICIES
-- ============================================
CREATE POLICY "Anyone can view active seller profiles" ON public.seller_profiles
    FOR SELECT USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Sellers can view own profile" ON public.seller_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Sellers can update own profile" ON public.seller_profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Sellers can insert own profile" ON public.seller_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- PRODUCTS POLICIES
-- ============================================
CREATE POLICY "Anyone can view active products" ON public.products
    FOR SELECT USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Sellers can view own products" ON public.products
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = seller_id AND user_id = auth.uid())
    );

CREATE POLICY "Sellers can manage own products" ON public.products
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = seller_id AND user_id = auth.uid())
    );

-- ============================================
-- PRODUCT IMAGES POLICIES
-- ============================================
CREATE POLICY "Anyone can view product images" ON public.product_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.seller_profiles s ON s.id = p.seller_id
            WHERE p.id = product_id AND p.status = 'active' AND p.deleted_at IS NULL
        )
    );

CREATE POLICY "Sellers can manage own product images" ON public.product_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.seller_profiles s ON s.id = p.seller_id
            WHERE p.id = product_id AND s.user_id = auth.uid()
        )
    );

-- ============================================
-- ORDERS POLICIES
-- ============================================
CREATE POLICY "Buyers can view own orders" ON public.orders
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.buyer_profiles WHERE id = buyer_id AND user_id = auth.uid())
    );

CREATE POLICY "Sellers can view orders for their store" ON public.orders
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = seller_id AND user_id = auth.uid())
    );

CREATE POLICY "Buyers can create orders" ON public.orders
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.buyer_profiles WHERE id = buyer_id AND user_id = auth.uid())
    );

CREATE POLICY "Sellers can update order status" ON public.orders
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = seller_id AND user_id = auth.uid())
    );

-- ============================================
-- ORDER ITEMS POLICIES
-- ============================================
CREATE POLICY "Buyers can view own order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            JOIN public.buyer_profiles b ON b.id = o.buyer_id
            WHERE o.id = order_id AND b.user_id = auth.uid()
        )
    );

CREATE POLICY "Sellers can view order items for their store" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            JOIN public.seller_profiles s ON s.id = o.seller_id
            WHERE o.id = order_id AND s.user_id = auth.uid()
        )
    );

-- ============================================
-- PRODUCT REVIEWS POLICIES
-- ============================================
CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews
    FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY "Users can view own reviews" ON public.product_reviews
    FOR SELECT USING (reviewer_id = auth.uid());

CREATE POLICY "Users can create reviews" ON public.product_reviews
    FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Users can update own reviews" ON public.product_reviews
    FOR UPDATE USING (reviewer_id = auth.uid());

CREATE POLICY "Users can delete own reviews" ON public.product_reviews
    FOR DELETE USING (reviewer_id = auth.uid());

-- ============================================
-- PRODUCT FAVORITES POLICIES
-- ============================================
CREATE POLICY "Users can view own favorites" ON public.product_favorites
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can add favorites" ON public.product_favorites
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove favorites" ON public.product_favorites
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- JOBS POLICIES
-- ============================================
CREATE POLICY "Anyone can view open jobs" ON public.jobs
    FOR SELECT USING (status = 'open' AND deleted_at IS NULL);

CREATE POLICY "Posters can view own jobs" ON public.jobs
    FOR SELECT USING (poster_id = auth.uid());

CREATE POLICY "Posters can manage own jobs" ON public.jobs
    FOR ALL USING (poster_id = auth.uid());

-- ============================================
-- JOB APPLICATIONS POLICIES
-- ============================================
CREATE POLICY "Applicants can view own applications" ON public.job_applications
    FOR SELECT USING (applicant_id = auth.uid());

CREATE POLICY "Job posters can view applications for their jobs" ON public.job_applications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND poster_id = auth.uid())
    );

CREATE POLICY "Workers can apply to jobs" ON public.job_applications
    FOR INSERT WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "Job posters can update application status" ON public.job_applications
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND poster_id = auth.uid())
    );

-- ============================================
-- JOB ASSIGNMENTS POLICIES
-- ============================================
CREATE POLICY "Workers can view own assignments" ON public.job_assignments
    FOR SELECT USING (worker_id = auth.uid());

CREATE POLICY "Job posters can view assignments for their jobs" ON public.job_assignments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND poster_id = auth.uid())
    );

CREATE POLICY "Job posters can manage assignments" ON public.job_assignments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND poster_id = auth.uid())
    );

-- ============================================
-- JOB BOOKMARKS POLICIES
-- ============================================
CREATE POLICY "Users can view own bookmarks" ON public.job_bookmarks
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can add bookmarks" ON public.job_bookmarks
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove bookmarks" ON public.job_bookmarks
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- ARMA PARMA POLICIES
-- ============================================
CREATE POLICY "Anyone can view open requests" ON public.armacarma_requests
    FOR SELECT USING (status = 'open' AND deleted_at IS NULL);

CREATE POLICY "Requesters can view own requests" ON public.armacarma_requests
    FOR SELECT USING (requester_id = auth.uid());

CREATE POLICY "Requesters can manage own requests" ON public.armacarma_requests
    FOR ALL USING (requester_id = auth.uid());

CREATE POLICY "Members can view own memberships" ON public.armacarma_members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Requesters can view members of their requests" ON public.armacarma_members
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.armacarma_requests WHERE id = request_id AND requester_id = auth.uid())
    );

CREATE POLICY "Users can join open requests" ON public.armacarma_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- LABOR CREDITS POLICIES
-- ============================================
CREATE POLICY "Users can view own credits" ON public.labor_credits
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own transactions" ON public.credit_transactions
    FOR SELECT USING (user_id = auth.uid());

-- ============================================
-- EQUIPMENT POLICIES
-- ============================================
CREATE POLICY "Anyone can view available equipment" ON public.equipment
    FOR SELECT USING (status IN ('available', 'rented') AND deleted_at IS NULL);

CREATE POLICY "Owners can view own equipment" ON public.equipment
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can manage own equipment" ON public.equipment
    FOR ALL USING (owner_id = auth.uid());

-- ============================================
-- EQUIPMENT BOOKINGS POLICIES
-- ============================================
CREATE POLICY "Renters can view own bookings" ON public.equipment_bookings
    FOR SELECT USING (renter_id = auth.uid());

CREATE POLICY "Owners can view bookings for their equipment" ON public.equipment_bookings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.equipment WHERE id = equipment_id AND owner_id = auth.uid())
    );

CREATE POLICY "Renters can create bookings" ON public.equipment_bookings
    FOR INSERT WITH CHECK (renter_id = auth.uid());

CREATE POLICY "Owners can update booking status" ON public.equipment_bookings
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.equipment WHERE id = equipment_id AND owner_id = auth.uid())
    );

-- ============================================
-- COMMUNITY POSTS POLICIES
-- ============================================
CREATE POLICY "Anyone can view approved posts" ON public.community_posts
    FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY "Authors can view own posts" ON public.community_posts
    FOR SELECT USING (author_id = auth.uid());

CREATE POLICY "Users can create posts" ON public.community_posts
    FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update own posts" ON public.community_posts
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Authors can delete own posts" ON public.community_posts
    FOR DELETE USING (author_id = auth.uid());

-- ============================================
-- POST COMMENTS POLICIES
-- ============================================
CREATE POLICY "Anyone can view approved comments" ON public.post_comments
    FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY "Users can create comments" ON public.post_comments
    FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update own comments" ON public.post_comments
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Authors can delete own comments" ON public.post_comments
    FOR DELETE USING (author_id = auth.uid());

-- ============================================
-- POST LIKES POLICIES
-- ============================================
CREATE POLICY "Users can view likes" ON public.post_likes
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can like content" ON public.post_likes
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike content" ON public.post_likes
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- CONVERSATIONS POLICIES
-- ============================================
CREATE POLICY "Participants can view conversations" ON public.conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = id AND user_id = auth.uid() AND left_at IS NULL
        )
    );

CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- ============================================
-- CONVERSATION PARTICIPANTS POLICIES
-- ============================================
CREATE POLICY "Participants can view co-participants" ON public.conversation_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Conversation creator can add participants" ON public.conversation_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations WHERE id = conversation_id AND created_by = auth.uid()
        )
    );

-- ============================================
-- MESSAGES POLICIES
-- ============================================
CREATE POLICY "Participants can view messages" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id AND user_id = auth.uid() AND left_at IS NULL
        )
    );

CREATE POLICY "Participants can send messages" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id AND user_id = auth.uid() AND left_at IS NULL
        )
    );

CREATE POLICY "Senders can update own messages" ON public.messages
    FOR UPDATE USING (sender_id = auth.uid());

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- NOTIFICATION PREFERENCES POLICIES
-- ============================================
CREATE POLICY "Users can view own preferences" ON public.notification_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own preferences" ON public.notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- PUSH TOKENS POLICIES
-- ============================================
CREATE POLICY "Users can manage own push tokens" ON public.push_tokens
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- FARMER REVIEWS POLICIES
-- ============================================
CREATE POLICY "Anyone can view approved farmer reviews" ON public.farmer_reviews
    FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY "Users can create farmer reviews" ON public.farmer_reviews
    FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- ============================================
-- WORKER REVIEWS POLICIES
-- ============================================
CREATE POLICY "Anyone can view approved worker reviews" ON public.worker_reviews
    FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY "Users can create worker reviews" ON public.worker_reviews
    FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- ============================================
-- SELLER REVIEWS POLICIES
-- ============================================
CREATE POLICY "Anyone can view approved seller reviews" ON public.seller_reviews
    FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY "Users can create seller reviews" ON public.seller_reviews
    FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- ============================================
-- USER REPUTATION POLICIES
-- ============================================
CREATE POLICY "Anyone can view user reputation" ON public.user_reputation
    FOR SELECT USING (TRUE);

-- ============================================
-- EXPERTS POLICIES
-- ============================================
CREATE POLICY "Anyone can view active experts" ON public.experts
    FOR SELECT USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Experts can view own profile" ON public.experts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Experts can update own profile" ON public.experts
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- CONSULTATION REQUESTS POLICIES
-- ============================================
CREATE POLICY "Clients can view own requests" ON public.consultation_requests
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Experts can view requests directed to them" ON public.consultation_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.experts WHERE id = expert_id AND user_id = auth.uid())
    );

CREATE POLICY "Clients can create requests" ON public.consultation_requests
    FOR INSERT WITH CHECK (client_id = auth.uid());

-- ============================================
-- EXPERT APPOINTMENTS POLICIES
-- ============================================
CREATE POLICY "Experts can view own appointments" ON public.expert_appointments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.experts WHERE id = expert_id AND user_id = auth.uid())
    );

CREATE POLICY "Clients can view own appointments" ON public.expert_appointments
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Experts can manage appointments" ON public.expert_appointments
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.experts WHERE id = expert_id AND user_id = auth.uid())
    );

-- ============================================
-- CROP DIARY POLICIES
-- ============================================
CREATE POLICY "Farmers can view own crop diary" ON public.crop_diary
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.farmer_profiles WHERE id = farmer_id AND user_id = auth.uid())
    );

CREATE POLICY "Farmers can manage own crop diary" ON public.crop_diary
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.farmer_profiles WHERE id = farmer_id AND user_id = auth.uid())
    );

-- ============================================
-- PLANTING RECORDS POLICIES
-- ============================================
CREATE POLICY "Farmers can view own planting records" ON public.planting_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.crop_diary cd
            JOIN public.farmer_profiles fp ON fp.id = cd.farmer_id
            WHERE cd.id = crop_diary_id AND fp.user_id = auth.uid()
        )
    );

CREATE POLICY "Farmers can manage own planting records" ON public.planting_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.crop_diary cd
            JOIN public.farmer_profiles fp ON fp.id = cd.farmer_id
            WHERE cd.id = crop_diary_id AND fp.user_id = auth.uid()
        )
    );

-- ============================================
-- HARVEST RECORDS POLICIES
-- ============================================
CREATE POLICY "Farmers can view own harvest records" ON public.harvest_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.crop_diary cd
            JOIN public.farmer_profiles fp ON fp.id = cd.farmer_id
            WHERE cd.id = crop_diary_id AND fp.user_id = auth.uid()
        )
    );

CREATE POLICY "Farmers can manage own harvest records" ON public.harvest_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.crop_diary cd
            JOIN public.farmer_profiles fp ON fp.id = cd.farmer_id
            WHERE cd.id = crop_diary_id AND fp.user_id = auth.uid()
        )
    );

-- ============================================
-- FERTILIZER SCHEDULE POLICIES
-- ============================================
CREATE POLICY "Farmers can view own fertilizer schedule" ON public.fertilizer_schedule
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.crop_diary cd
            JOIN public.farmer_profiles fp ON fp.id = cd.farmer_id
            WHERE cd.id = crop_diary_id AND fp.user_id = auth.uid()
        )
    );

CREATE POLICY "Farmers can manage own fertilizer schedule" ON public.fertilizer_schedule
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.crop_diary cd
            JOIN public.farmer_profiles fp ON fp.id = cd.farmer_id
            WHERE cd.id = crop_diary_id AND fp.user_id = auth.uid()
        )
    );

-- ============================================
-- PEST/DISEASE/YIELD REPORTS POLICIES
-- ============================================
CREATE POLICY "Farmers can view own pest reports" ON public.pest_reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.farmer_profiles WHERE id = farmer_id AND user_id = auth.uid())
    );

CREATE POLICY "Farmers can manage own pest reports" ON public.pest_reports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.farmer_profiles WHERE id = farmer_id AND user_id = auth.uid())
    );

CREATE POLICY "Farmers can view own disease reports" ON public.disease_reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.farmer_profiles WHERE id = farmer_id AND user_id = auth.uid())
    );

CREATE POLICY "Farmers can manage own disease reports" ON public.disease_reports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.farmer_profiles WHERE id = farmer_id AND user_id = auth.uid())
    );

CREATE POLICY "Farmers can view own yield reports" ON public.yield_reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.farmer_profiles WHERE id = farmer_id AND user_id = auth.uid())
    );

CREATE POLICY "Farmers can manage own yield reports" ON public.yield_reports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.farmer_profiles WHERE id = farmer_id AND user_id = auth.uid())
    );

-- ============================================
-- FINANCE POLICIES
-- ============================================
CREATE POLICY "Users can view own income" ON public.income_records
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own income" ON public.income_records
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own expenses" ON public.expense_records
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own expenses" ON public.expense_records
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own invoices" ON public.invoices
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own invoices" ON public.invoices
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own financial reports" ON public.financial_reports
    FOR SELECT USING (user_id = auth.uid());

-- ============================================
-- DOCUMENTS POLICIES
-- ============================================
CREATE POLICY "Users can view own documents" ON public.verification_documents
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own documents" ON public.verification_documents
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own uploaded files" ON public.uploaded_files
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own uploaded files" ON public.uploaded_files
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- SEARCH POLICIES
-- ============================================
CREATE POLICY "Users can view own search history" ON public.search_history
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own search history" ON public.search_history
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own saved searches" ON public.saved_searches
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own favorites" ON public.favorites
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- ADMIN POLICIES
-- ============================================
CREATE POLICY "Admins can view administrators" ON public.administrators
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage administrators" ON public.administrators
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can view activity logs" ON public.activity_logs
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Anyone can view active announcements" ON public.platform_announcements
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage announcements" ON public.platform_announcements
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can view reports" ON public.admin_reports
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage reports" ON public.admin_reports
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can view complaints" ON public.complaints
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage complaints" ON public.complaints
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can view moderation queue" ON public.moderation_queue
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage moderation queue" ON public.moderation_queue
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can view verification queue" ON public.verification_queue
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage verification queue" ON public.verification_queue
    FOR ALL USING (public.is_admin());

-- ============================================
-- PRICE ALERTS POLICIES
-- ============================================
CREATE POLICY "Users can manage own price alerts" ON public.price_alerts
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- SELLER ANALYTICS POLICIES
-- ============================================
CREATE POLICY "Sellers can view own analytics" ON public.seller_analytics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = seller_id AND user_id = auth.uid())
    );

-- ============================================
-- SYSTEM SETTINGS (public read, admin write)
-- ============================================
CREATE POLICY "Anyone can view public settings" ON public.system_settings
    FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Admins can view all settings" ON public.system_settings
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage settings" ON public.system_settings
    FOR ALL USING (public.is_admin());

-- ============================================
-- USER SESSIONS POLICIES
-- ============================================
CREATE POLICY "Users can view own sessions" ON public.user_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own sessions" ON public.user_sessions
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- BLOCKED USERS POLICIES
-- ============================================
CREATE POLICY "Users can view own blocks" ON public.blocked_users
    FOR SELECT USING (blocker_id = auth.uid());

CREATE POLICY "Users can block others" ON public.blocked_users
    FOR INSERT WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can unblock others" ON public.blocked_users
    FOR DELETE USING (blocker_id = auth.uid());

-- ============================================
-- EVENT POLICIES
-- ============================================
CREATE POLICY "Anyone can view active events" ON public.community_events
    FOR SELECT USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Organizers can manage own events" ON public.community_events
    FOR ALL USING (organizer_id = auth.uid());

CREATE POLICY "Users can view event participants" ON public.event_participants
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can join events" ON public.event_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());
