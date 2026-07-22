# KrishiConnect Nepal - Database Schema

Production-ready PostgreSQL database for Supabase.

## Project Structure

```
supabase/
  migrations/
    00001_extensions_and_types.sql        # PostgreSQL extensions & custom ENUM types
    00002_core_users_auth.sql             # Users, roles, sessions, login history, OTP
    00003_nepal_locations.sql             # 7 provinces, 77 districts, local bodies, wards
    00004_farmer_worker_profiles.sql      # Farmer, worker, buyer, seller profiles
    00005_marketplace.sql                 # Products, orders, reviews, favorites
    00006_job_portal.sql                  # Jobs, applications, assignments
    00007_armacarma.sql                   # Labor exchange, credits, events
    00008_equipment_rental.sql            # Equipment listings, bookings, maintenance
    00009_community_messaging_notifications.sql  # Posts, comments, messages, notifications
    00010_reviews_expert_crop.sql         # Reviews, experts, crop diary, pest/disease reports
    00011_weather_prices_finance_docs.sql # Weather, market prices, finance, documents
    00016_flexible_verification.sql       # OTP records, verification tokens, rate limits (SHA-256 hashed)
    00017_verification_functions.sql      # 25+ functions: OTP create/verify, rate limiting, cleanup
    00019_admin_verification_views.sql    # Admin dashboard views + unlock/resend functions
    00020_verification_rls.sql            # RLS policies + GRANT permissions
    00021_farm_work_core.sql              # Work categories, requests, applications, assignments
    00023_farm_work_functions.sql         # Work system business logic (create, apply, match, complete)
    00024_farm_work_admin_rls.sql         # Admin views + RLS for farm work system
    00028_profile_photo_verification.sql  # Mandatory photo upload, trust badges, photo history
  functions/
    _shared/utils.ts                      # Provider abstraction (Sparrow SMS, Resend), validators, templates
    send-otp/index.ts                     # Generate + send OTP
    verify-otp/index.ts                   # Verify OTP hash, complete verification
    register-user/index.ts                # Register with mobile/email/both
    login-user/index.ts                   # Password or OTP login with lockout
    forgot-password/index.ts              # Send reset OTP or email link
    reset-password/index.ts               # Set new password via token/OTP
    resend-verification/index.ts          # Resend with 60s cooldown, 5/hr limit
    get-verification-status/index.ts      # Verification status + recent activity
    request-contact-change/index.ts       # Change mobile/email with password check
    verify-email-link/index.ts            # Verify via email link token
    cleanup-otps/index.ts                 # Cron: purge expired OTPs/logs
    upload-photo/index.ts                 # Upload + validate profile photo (JPG/PNG/WEBP, 5MB, 300x300)
    delete-photo/index.ts                 # Remove profile photo + revoke badge
    photo-status/index.ts                 # Get photo status, trust badges, upload history
```
    00012_search_admin_analytics_security.sql  # Search, admin, analytics, 2FA
    00013_rls_policies.sql                # Row Level Security on all user tables
    00014_functions_triggers_views.sql    # Triggers, functions, views, materialized views
    00015_storage_config.sql              # Storage buckets, system settings, indexes
```

## Table Count: 100+ tables across 15 migration files

### Modules Covered
- Authentication & Multi-Role System
- Nepal Location Database (7 Provinces, 77 Districts, All Local Bodies, Wards)
- Farmer & Worker Profiles
- Marketplace (Products, Orders, Reviews)
- Job Portal (Jobs, Applications, Assignments)
- Arma Parma (Labor Exchange, Credits)
- Equipment Rental
- Community (Posts, Comments, Groups, Events)
- Messaging & Notifications
- Reviews & Reputation
- Expert Consultation
- Crop Management (Diary, Planting, Harvest, Pest/Disease Reports)
- Weather & Market Prices
- Finance (Income, Expenses, Transactions, Invoices)
- Documents & Verification
- Search & Favorites
- Admin (Moderation, Audit Logs, System Settings)
- Analytics (Dashboard Stats, User Growth)
- Security (Sessions, Login History, 2FA)
- Storage Buckets (8 buckets for different media types)

## Key Features
- UUID primary keys on all tables
- Row Level Security (RLS) enabled on all user-generated tables
- Soft deletes with `deleted_at` columns
- Auto-updating `updated_at` timestamps
- Full-text search indexes
- PostGIS geographic queries for location-based features
- Materialized views for analytics dashboards
- Triggers for auto-calculating ratings, like counts, message previews
- Credit system for Arma Parma labor exchange

## How to Apply

### Via Supabase Dashboard
1. Go to SQL Editor
2. Run each migration file in order (00001 through 000015)

### Via Supabase CLI
```bash
supabase db push
```

### Via psql
```bash
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

## Supabase Storage Buckets
Create these buckets in Supabase Dashboard > Storage:
- `profile-images` (public)
- `farm-images` (public)
- `product-images` (public)
- `equipment-images` (public)
- `verification-documents` (private)
- `community-media` (public)
- `chat-files` (private)
- `expert-documents` (private)
