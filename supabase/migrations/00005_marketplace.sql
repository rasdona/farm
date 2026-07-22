-- KrishiConnect Nepal - Production Database
-- Migration 00005: Marketplace

-- ============================================
-- PRODUCT CATEGORIES
-- ============================================
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES public.product_categories(id),
    name_en TEXT NOT NULL,
    name_ne TEXT,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    image_url TEXT,
    sort_order SMALLINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_categories_parent ON public.product_categories(parent_id);
CREATE INDEX idx_product_categories_slug ON public.product_categories(slug);

INSERT INTO public.product_categories (name_en, slug, description, sort_order) VALUES
('Vegetables', 'vegetables', 'Fresh vegetables and greens', 1),
('Fruits', 'fruits', 'Fresh and seasonal fruits', 2),
('Grains', 'grains', 'Rice, wheat, maize, millet, etc.', 3),
('Spices', 'spices', 'Herbs and spices', 4),
('Dairy', 'dairy', 'Milk, cheese, butter, ghee', 5),
('Meat & Poultry', 'meat-poultry', 'Meat, chicken, eggs', 6),
('Seeds', 'seeds', 'Agricultural seeds and saplings', 7),
('Fertilizer', 'fertilizer', 'Organic and chemical fertilizers', 8),
('Feed', 'feed', 'Animal feed and supplements', 9),
('Processed Food', 'processed-food', 'Processed and packaged food', 10),
('Handicrafts', 'handicrafts', 'Agricultural handicrafts', 11),
('Other', 'other', 'Other agricultural products', 12);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES public.farmer_profiles(id),
    category_id UUID REFERENCES public.product_categories(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    original_price NUMERIC(12,2),
    currency TEXT DEFAULT 'NPR',
    quantity NUMERIC(10,2) DEFAULT 0 CHECK (quantity >= 0),
    unit TEXT NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'g', 'quintal', 'ton', 'piece', 'dozen', 'bunch', 'bundle', 'liter', 'ml', 'sack', 'box')),
    min_order_qty NUMERIC(10,2) DEFAULT 1,
    max_order_qty NUMERIC(10,2),
    harvest_date DATE,
    expiry_date DATE,
    is_organic BOOLEAN DEFAULT FALSE,
    is_seasonal BOOLEAN DEFAULT FALSE,
    season TEXT,
    delivery_option delivery_option DEFAULT 'both',
    delivery_fee NUMERIC(10,2) DEFAULT 0,
    free_delivery_above NUMERIC(10,2),
    estimated_delivery_days SMALLINT,
    province_id UUID REFERENCES public.provinces(id),
    district_id UUID REFERENCES public.districts(id),
    local_body_id UUID REFERENCES public.local_bodies(id),
    gps_location GEOGRAPHY(POINT, 4326),
    status product_status DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INT DEFAULT 0,
    avg_rating NUMERIC(3,2) DEFAULT 0,
    total_ratings INT DEFAULT 0,
    total_sold INT DEFAULT 0,
    tags TEXT[],
    meta_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_products_seller ON public.products(seller_id);
CREATE INDEX idx_products_farmer ON public.products(farmer_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_price ON public.products(price);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_organic ON public.products(is_organic) WHERE is_organic = TRUE;
CREATE INDEX idx_products_featured ON public.products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_district ON public.products(district_id);
CREATE INDEX idx_products_created ON public.products(created_at DESC);
CREATE INDEX idx_products_name_trgm ON public.products USING gin(name gin_trgm_ops);
CREATE INDEX idx_products_tags ON public.products USING gin(tags);
CREATE INDEX idx_products_search ON public.products USING gin(
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);

-- ============================================
-- PRODUCT IMAGES
-- ============================================
CREATE TABLE public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order SMALLINT DEFAULT 0,
    status general_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON public.product_images(product_id);

-- ============================================
-- PRODUCT INVENTORY
-- ============================================
CREATE TABLE public.product_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity_change NUMERIC(10,2) NOT NULL,
    reason TEXT CHECK (reason IN ('restock', 'sale', 'return', 'adjustment', 'spoiled', 'donated')),
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_inventory_product ON public.product_inventory(product_id);
CREATE INDEX idx_product_inventory_created ON public.product_inventory(created_at DESC);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    buyer_id UUID NOT NULL REFERENCES public.buyer_profiles(id),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id),
    subtotal NUMERIC(12,2) NOT NULL,
    delivery_fee NUMERIC(10,2) DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    tax NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'NPR',
    status order_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    delivery_option delivery_option DEFAULT 'pickup',
    delivery_address TEXT,
    delivery_province_id UUID REFERENCES public.provinces(id),
    delivery_district_id UUID REFERENCES public.districts(id),
    delivery_local_body_id UUID REFERENCES public.local_bodies(id),
    delivery_ward_id UUID REFERENCES public.wards(id),
    delivery_gps GEOGRAPHY(POINT, 4326),
    delivery_notes TEXT,
    estimated_delivery DATE,
    actual_delivery DATE,
    pickup_location TEXT,
    pickup_time TEXT,
    notes TEXT,
    cancelled_reason TEXT,
    cancelled_by UUID REFERENCES public.users(id),
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller ON public.orders(seller_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    product_image TEXT,
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    is_organic BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);

-- ============================================
-- PRODUCT REVIEWS
-- ============================================
CREATE TABLE public.product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id),
    reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title TEXT,
    comment TEXT,
    images TEXT[],
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    helpful_count INT DEFAULT 0,
    status moderation_status DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_product_reviews_product ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_reviewer ON public.product_reviews(reviewer_id);
CREATE INDEX idx_product_reviews_rating ON public.product_reviews(rating);

-- ============================================
-- PRODUCT FAVORITES
-- ============================================
CREATE TABLE public.product_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, user_id)
);

CREATE INDEX idx_product_favorites_user ON public.product_favorites(user_id);
CREATE INDEX idx_product_favorites_product ON public.product_favorites(product_id);

-- ============================================
-- SELLER ANALYTICS
-- ============================================
CREATE TABLE public.seller_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_views INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    total_products_sold INT DEFAULT 0,
    unique_visitors INT DEFAULT 0,
    conversion_rate NUMERIC(5,2) DEFAULT 0,
    avg_order_value NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(seller_id, date)
);

CREATE INDEX idx_seller_analytics_seller ON public.seller_analytics(seller_id);
CREATE INDEX idx_seller_analytics_date ON public.seller_analytics(date DESC);
