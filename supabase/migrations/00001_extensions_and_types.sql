-- KrishiConnect Nepal - Production Database
-- Migration 00001: Extensions, Custom Types, and Foundation

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================
-- CUSTOM ENUM TYPES
-- ============================================

-- Account & User Status
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'deactivated', 'pending_verification');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE language_preference AS ENUM ('en', 'ne', 'both');
CREATE TYPE active_role AS ENUM (
    'farmer', 'worker', 'buyer', 'seller',
    'equipment_owner', 'expert', 'cooperative_member', 'admin'
);

-- General Status
CREATE TYPE general_status AS ENUM ('active', 'inactive', 'archived', 'deleted');
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');

-- Marketplace
CREATE TYPE product_status AS ENUM ('draft', 'active', 'sold_out', 'expired', 'removed');
CREATE TYPE order_status AS ENUM (
    'pending', 'confirmed', 'processing', 'shipped',
    'delivered', 'cancelled', 'refunded', 'disputed'
);
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'partial');
CREATE TYPE delivery_option AS ENUM ('pickup', 'delivery', 'both');

-- Job Portal
CREATE TYPE job_status AS ENUM (
    'draft', 'open', 'in_progress', 'completed', 'cancelled', 'expired'
);
CREATE TYPE application_status AS ENUM (
    'pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn'
);
CREATE TYPE assignment_status AS ENUM (
    'active', 'completed', 'disputed', 'cancelled'
);

-- Arma Parma
CREATE TYPE armaparma_request_status AS ENUM (
    'open', 'matched', 'in_progress', 'completed', 'cancelled', 'disputed'
);
CREATE TYPE exchange_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE credit_transaction_type AS ENUM ('earned', 'spent', 'transferred', 'expired', 'adjusted');

-- Equipment
CREATE TYPE equipment_status AS ENUM ('available', 'rented', 'maintenance', 'retired');
CREATE TYPE booking_status AS ENUM (
    'pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed'
);
CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'overdue');

-- Community
CREATE TYPE post_type AS ENUM ('text', 'image', 'video', 'poll', 'question', 'tip');
CREATE TYPE report_reason AS ENUM (
    'spam', 'inappropriate', 'fake', 'harassment',
    'copyright', 'other'
);
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- Messaging
CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'voice', 'system');
CREATE TYPE conversation_type AS ENUM ('direct', 'group', 'support');

-- Notifications
CREATE TYPE notification_type AS ENUM (
    'order', 'job', 'message', 'review', 'system',
    'weather', 'price_alert', 'community', 'arma_parma',
    'equipment', 'expert', 'payment', 'verification'
);

-- Finance
CREATE TYPE transaction_type AS ENUM (
    'income', 'expense', 'transfer', 'refund', 'commission', 'withdrawal'
);
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- Documents
CREATE TYPE document_type AS ENUM (
    'citizenship', 'passport', 'farm_registration', 'organic_certificate',
    'license', 'academic', 'other'
);

-- Weather
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'severe', 'extreme');

-- Admin
CREATE TYPE permission_level AS ENUM ('read', 'write', 'admin', 'super_admin');
CREATE TYPE activity_type AS ENUM (
    'login', 'logout', 'create', 'update', 'delete',
    'view', 'export', 'import', 'moderate', 'verify'
);

-- Reviews
CREATE TYPE review_target AS ENUM ('farmer', 'worker', 'seller', 'equipment', 'expert');

-- Crop Management
CREATE TYPE pest_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE crop_stage AS ENUM (
    'planning', 'preparation', 'planting', 'growing',
    'flowering', 'harvesting', 'post_harvest'
);

-- Expert
CREATE TYPE consultation_status AS ENUM (
    'requested', 'scheduled', 'in_progress', 'completed', 'cancelled'
);
CREATE TYPE appointment_status AS ENUM (
    'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
);

-- Search
CREATE TYPE favorite_type AS ENUM (
    'product', 'farmer', 'worker', 'equipment', 'job', 'post'
);
