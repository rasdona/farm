-- =====================================================
-- Migration 00034: Weather Alert Preference
-- Adds a per-user toggle so users can disable automatic
-- weather alert messages sent to their chat.
-- Run this in Supabase SQL Editor (or via supabase db push)
-- =====================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS weather_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE;
