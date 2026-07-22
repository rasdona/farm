-- KrishiConnect Nepal - Production Database
-- Migration 00009: Community, Messaging, Notifications

-- ============================================
-- COMMUNITY POSTS
-- ============================================
CREATE TABLE public.community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    post_type post_type DEFAULT 'text',
    title TEXT,
    content TEXT NOT NULL,
    images TEXT[],
    videos TEXT[],
    poll_options JSONB,
    poll_end_date TIMESTAMPTZ,
    location TEXT,
    district_id UUID REFERENCES public.districts(id),
    tags TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    status moderation_status DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_community_posts_author ON public.community_posts(author_id);
CREATE INDEX idx_community_posts_type ON public.community_posts(post_type);
CREATE INDEX idx_community_posts_created ON public.community_posts(created_at DESC);
CREATE INDEX idx_community_posts_district ON public.community_posts(district_id);
CREATE INDEX idx_community_posts_pinned ON public.community_posts(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_community_posts_tags ON public.community_posts USING gin(tags);
CREATE INDEX idx_community_posts_search ON public.community_posts USING gin(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
);

-- ============================================
-- POST COMMENTS
-- ============================================
CREATE TABLE public.post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.post_comments(id),
    content TEXT NOT NULL,
    images TEXT[],
    like_count INT DEFAULT 0,
    status moderation_status DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX idx_post_comments_author ON public.post_comments(author_id);
CREATE INDEX idx_post_comments_parent ON public.post_comments(parent_id);

-- ============================================
-- POST LIKES
-- ============================================
CREATE TABLE public.post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction_type TEXT DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'helpful', 'insightful')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL)),
    UNIQUE(user_id, post_id),
    UNIQUE(user_id, comment_id)
);

CREATE INDEX idx_post_likes_post ON public.post_likes(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_post_likes_comment ON public.post_likes(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX idx_post_likes_user ON public.post_likes(user_id);

-- ============================================
-- POST REPORTS
-- ============================================
CREATE TABLE public.post_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
    reason report_reason NOT NULL,
    description TEXT,
    status report_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_post_reports_status ON public.post_reports(status);

-- ============================================
-- COMMUNITY GROUPS
-- ============================================
CREATE TABLE public.community_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    district_id UUID REFERENCES public.districts(id),
    group_type TEXT DEFAULT 'open' CHECK (group_type IN ('open', 'closed', 'secret')),
    member_count INT DEFAULT 0,
    post_count INT DEFAULT 0,
    rules TEXT[],
    tags TEXT[],
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_community_groups_creator ON public.community_groups(creator_id);
CREATE INDEX idx_community_groups_district ON public.community_groups(district_id);

-- ============================================
-- GROUP MEMBERS
-- ============================================
CREATE TABLE public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'banned')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);

-- ============================================
-- GROUP POSTS
-- ============================================
CREATE TABLE public.group_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, post_id)
);

-- ============================================
-- ANNOUNCEMENTS
-- ============================================
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    target_audience TEXT[] DEFAULT ARRAY['all'],
    district_id UUID REFERENCES public.districts(id),
    expires_at TIMESTAMPTZ,
    view_count INT DEFAULT 0,
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_priority ON public.announcements(priority);
CREATE INDEX idx_announcements_expires ON public.announcements(expires_at);

-- ============================================
-- CONVERSATIONS
-- ============================================
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type conversation_type DEFAULT 'direct',
    title TEXT,
    description TEXT,
    cover_image TEXT,
    created_by UUID REFERENCES public.users(id),
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATION PARTICIPANTS
-- ============================================
CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    is_muted BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    unread_count INT DEFAULT 0,
    last_read_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user ON public.conversation_participants(user_id);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT,
    message_type message_type DEFAULT 'text',
    attachment_url TEXT,
    attachment_type TEXT,
    attachment_name TEXT,
    voice_duration_seconds INT,
    reply_to_id UUID REFERENCES public.messages(id),
    is_forwarded BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    reactions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_messages_type ON public.messages(message_type);

-- ============================================
-- MESSAGE ATTACHMENTS
-- ============================================
CREATE TABLE public.message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_attachments_message ON public.message_attachments(message_id);

-- ============================================
-- READ RECEIPTS
-- ============================================
CREATE TABLE public.read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

CREATE INDEX idx_read_receipts_message ON public.read_receipts(message_id);
CREATE INDEX idx_read_receipts_user ON public.read_receipts(user_id);

-- ============================================
-- TYPING STATUS
-- ============================================
CREATE TABLE public.typing_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- ============================================
-- NOTIFICATION TYPES
-- ============================================
CREATE TABLE public.notification_types_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type notification_type NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_ne TEXT,
    description TEXT,
    default_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.notification_types_config (type, name_en, description) VALUES
('order', 'Order Updates', 'Notifications about order status changes'),
('job', 'Job Updates', 'Notifications about job applications and assignments'),
('message', 'Messages', 'New message notifications'),
('review', 'Reviews', 'New review notifications'),
('system', 'System', 'System announcements and updates'),
('weather', 'Weather Alerts', 'Weather warnings and forecasts'),
('price_alert', 'Price Alerts', 'Market price change alerts'),
('community', 'Community', 'Community post and comment notifications'),
('arma_parma', 'Arma Parma', 'Labor exchange notifications'),
('equipment', 'Equipment', 'Equipment booking notifications'),
('expert', 'Expert', 'Expert consultation notifications'),
('payment', 'Payments', 'Payment and wallet notifications'),
('verification', 'Verification', 'Account verification updates');

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    reference_type TEXT,
    reference_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_sent_push BOOLEAN DEFAULT FALSE,
    is_sent_email BOOLEAN DEFAULT FALSE,
    is_sent_sms BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- ============================================
-- NOTIFICATION PREFERENCES
-- ============================================
CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT FALSE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, type)
);

CREATE INDEX idx_notification_preferences_user ON public.notification_preferences(user_id);

-- ============================================
-- PUSH NOTIFICATION TOKENS
-- ============================================
CREATE TABLE public.push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_user ON public.push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON public.push_tokens(is_active) WHERE is_active = TRUE;
