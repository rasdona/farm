-- =====================================================
-- Migration 00033: Enable Realtime for Live Chat
-- Run this in Supabase SQL Editor (or via supabase db push)
--
-- Required before realtime chat works:
--   1. This migration adds the tables to the realtime publication
--   2. RLS policies (already in 00013) let participants read their
--      own conversation messages, which realtime respects
-- =====================================================

-- Enable realtime for messages so new messages stream to online users
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for notifications so message notifications update live
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Optional: stream conversation preview updates too
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
