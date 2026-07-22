-- KrishiConnect Nepal - Production Database
-- Migration 00003: Nepal Location Database (All 7 Provinces, 77 Districts, All Local Bodies, Wards)

-- ============================================
-- PROVINCES (7 Provinces of Nepal)
-- ============================================
CREATE TABLE public.provinces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code SMALLINT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_ne TEXT NOT NULL,
    capital TEXT,
    area_km2 NUMERIC(10,2),
    population BIGINT,
    geo_location GEOGRAPHY(POINT, 4326),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.provinces (code, name_en, name_ne, capital) VALUES
(1, 'Koshi', 'कोशी', 'Biratnagar'),
(2, 'Madhesh', 'मधेश', 'Janakpur'),
(3, 'Bagmati', 'बागमती', 'Hetauda'),
(4, 'Gandaki', 'गण्डकी', 'Pokhara'),
(5, 'Lumbini', 'लुम्बिनी', 'Deukhuri'),
(6, 'Karnali', 'कर्णाली', 'Birendranagar'),
(7, 'Sudurpashchim', 'सुदूरपश्चिम', 'Dhangadhi');

-- ============================================
-- DISTRICTS (77 Districts of Nepal)
-- ============================================
CREATE TABLE public.districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    province_id UUID NOT NULL REFERENCES public.provinces(id),
    code SMALLINT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_ne TEXT NOT NULL,
    area_km2 NUMERIC(10,2),
    population BIGINT,
    headquarters TEXT,
    geo_location GEOGRAPHY(POINT, 4326),
    bbox GEOGRAPHY(POLYGON, 4326),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_districts_province ON public.districts(province_id);

-- Province 1 (Koshi)
INSERT INTO public.districts (province_id, code, name_en, name_ne, headquarters) VALUES
((SELECT id FROM public.provinces WHERE code=1), 1, 'Taplejung', 'ताप्लेजुङ', 'Taplejung'),
((SELECT id FROM public.provinces WHERE code=1), 2, 'Panchthar', 'पाँचथर', 'Phidim'),
((SELECT id FROM public.provinces WHERE code=1), 3, 'Ilam', 'इलाम', 'Ilam'),
((SELECT id FROM public.provinces WHERE code=1), 4, 'Jhapa', 'झापा', 'Bhadrapur'),
((SELECT id FROM public.provinces WHERE code=1), 5, 'Morang', 'मोरङ', 'Biratnagar'),
((SELECT id FROM public.provinces WHERE code=1), 6, 'Sunsari', 'सुनसरी', 'Inaruwa'),
((SELECT id FROM public.provinces WHERE code=1), 7, 'Udayapur', 'उदयपुर', 'Gaighat'),
((SELECT id FROM public.provinces WHERE code=1), 8, 'Sankhuwasabha', 'सङ्खुवासभा', 'Khandbari'),
((SELECT id FROM public.provinces WHERE code=1), 9, 'Solukhumbu', 'सोलुखुम्बू', 'Salleri'),
((SELECT id FROM public.provinces WHERE code=1), 10, 'Okhaldhunga', 'ओखलढुङ्गा', 'Siddhicharan'),
((SELECT id FROM public.provinces WHERE code=1), 11, 'Khotang', 'खोटाङ', 'Diktel'),
((SELECT id FROM public.provinces WHERE code=1), 12, 'Bhojpur', 'भोजपुर', 'Bhojpur'),
((SELECT id FROM public.provinces WHERE code=1), 13, 'Dhankuta', 'धनकुटा', 'Dhankuta'),
((SELECT id FROM public.provinces WHERE code=1), 14, 'Terhathum', 'तेह्रथुम', 'Myanglung');

-- Province 2 (Madhesh)
INSERT INTO public.districts (province_id, code, name_en, name_ne, headquarters) VALUES
((SELECT id FROM public.provinces WHERE code=2), 15, 'Saptari', 'सप्तरी', 'Rajbiraj'),
((SELECT id FROM public.provinces WHERE code=2), 16, 'Siraha', 'सिराहा', 'Siraha'),
((SELECT id FROM public.provinces WHERE code=2), 17, 'Dhanusha', 'धनुषा', 'Janakpur'),
((SELECT id FROM public.provinces WHERE code=2), 18, 'Mahottari', 'महोत्तरी', 'Jaleshwar'),
((SELECT id FROM public.provinces WHERE code=2), 19, 'Sarlahi', 'सर्लाही', 'Malangwa'),
((SELECT id FROM public.provinces WHERE code=2), 20, 'Rautahat', 'रौतहट', 'Gaur'),
((SELECT id FROM public.provinces WHERE code=2), 21, 'Bara', 'बारा', 'Kalaiya'),
((SELECT id FROM public.provinces WHERE code=2), 22, 'Parsa', 'पर्सा', 'Birgunj');

-- Province 3 (Bagmati)
INSERT INTO public.districts (province_id, code, name_en, name_ne, headquarters) VALUES
((SELECT id FROM public.provinces WHERE code=3), 23, 'Dolakha', 'दोलखा', 'Charikot'),
((SELECT id FROM public.provinces WHERE code=3), 24, 'Rasuwa', 'रसुवा', 'Dhunche'),
((SELECT id FROM public.provinces WHERE code=3), 25, 'Sindhupalchok', 'सिन्धुपाल्चोक', 'Chautara'),
((SELECT id FROM public.provinces WHERE code=3), 26, 'Kavrepalanchok', 'काभ्रेपलाञ्चोक', 'Dhulikhel'),
((SELECT id FROM public.provinces WHERE code=3), 27, 'Nuwakot', 'नुवाकोट', 'Bidur'),
((SELECT id FROM public.provinces WHERE code=3), 28, 'Ramechhap', 'रामेछाप', 'Manthali'),
((SELECT id FROM public.provinces WHERE code=3), 29, 'Sindhuli', 'सिन्धुली', 'Kamalamai'),
((SELECT id FROM public.provinces WHERE code=3), 30, 'Chitwan', 'चितवन', 'Bharatpur'),
((SELECT id FROM public.provinces WHERE code=3), 31, 'Makwanpur', 'मकवानपुर', 'Hetauda'),
((SELECT id FROM public.provinces WHERE code=3), 32, 'Bhaktapur', 'भक्तपुर', 'Bhaktapur'),
((SELECT id FROM public.provinces WHERE code=3), 33, 'Lalitpur', 'ललितपुर', 'Lalitpur'),
((SELECT id FROM public.provinces WHERE code=3), 34, 'Kathmandu', 'काठमाडौं', 'Kathmandu');

-- Province 4 (Gandaki)
INSERT INTO public.districts (province_id, code, name_en, name_ne, headquarters) VALUES
((SELECT id FROM public.provinces WHERE code=4), 35, 'Gorkha', 'गोरखा', 'Gorkha'),
((SELECT id FROM public.provinces WHERE code=4), 36, 'Manang', 'मनाङ', 'Chame'),
((SELECT id FROM public.provinces WHERE code=4), 37, 'Mustang', 'मुस्ताङ', 'Jomsom'),
((SELECT id FROM public.provinces WHERE code=4), 38, 'Myagdi', 'म्याग्दी', 'Beni'),
((SELECT id FROM public.provinces WHERE code=4), 39, 'Kaski', 'कास्की', 'Pokhara'),
((SELECT id FROM public.provinces WHERE code=4), 40, 'Lamjung', 'लमजुङ', 'Besisahar'),
((SELECT id FROM public.provinces WHERE code=4), 41, 'Tanahu', 'तनहुं', 'Damauli'),
((SELECT id FROM public.provinces WHERE code=4), 42, 'Nawalparasi East', 'नवलपरासी पूर्व', 'Bardaghat'),
((SELECT id FROM public.provinces WHERE code=4), 43, 'Syangja', 'स्याङ्जा', 'Waling'),
((SELECT id FROM public.provinces WHERE code=4), 44, 'Parbat', 'पर्वत', 'Kusma'),
((SELECT id FROM public.provinces WHERE code=4), 45, 'Baglung', 'बागलुङ', 'Baglung'),
((SELECT id FROM public.provinces WHERE code=4), 46, 'Dhaulagiri', 'धौलागिरी', 'Beni');

-- Province 5 (Lumbini)
INSERT INTO public.districts (province_id, code, name_en, name_ne, headquarters) VALUES
((SELECT id FROM public.provinces WHERE code=5), 47, 'Kapilvastu', 'कपिलवस्तु', 'Taulihawa'),
((SELECT id FROM public.provinces WHERE code=5), 48, 'Rupandehi', 'रुपन्देही', 'Siddharthanagar'),
((SELECT id FROM public.provinces WHERE code=5), 49, 'Nawalparasi West', 'नवलपरासी पश्चिम', 'Parasi'),
((SELECT id FROM public.provinces WHERE code=5), 50, 'Rolpa', 'रोल्पा', 'Liwang'),
((SELECT id FROM public.provinces WHERE code=5), 51, 'Rukum West', 'रुकुम पश्चिम', 'Musikot'),
((SELECT id FROM public.provinces WHERE code=5), 52, 'Syangtan', 'स्याङ्ता', 'Syanja'),
((SELECT id FROM public.provinces WHERE code=5), 53, 'Pyuthan', 'प्युठान', 'Pyuthan'),
((SELECT id FROM public.provinces WHERE code=5), 54, 'Dang', 'दाङ', 'Tulsipur'),
((SELECT id FROM public.provinces WHERE code=5), 55, 'Banke', 'बाँके', 'Nepalgunj'),
((SELECT id FROM public.provinces WHERE code=5), 56, 'Bardiya', 'बर्दिया', 'Gulariya'),
((SELECT id FROM public.provinces WHERE code=5), 57, 'Surkhet', 'सुर्खेत', 'Birendranagar');

-- Province 6 (Karnali)
INSERT INTO public.districts (province_id, code, name_en, name_ne, headquarters) VALUES
((SELECT id FROM public.provinces WHERE code=6), 58, 'Mugu', 'मुगु', 'Gamgadhi'),
((SELECT id FROM public.provinces WHERE code=6), 59, 'Humla', 'हुम्ला', 'Simikot'),
((SELECT id FROM public.provinces WHERE code=6), 60, 'Jumla', 'जुम्ला', 'Chandannath'),
((SELECT id FROM public.provinces WHERE code=6), 61, 'Dolpa', 'डोल्पा', 'Dunai'),
((SELECT id FROM public.provinces WHERE code=6), 62, 'Kalikot', 'कालिकोट', 'Manma'),
((SELECT id FROM public.provinces WHERE code=6), 63, 'Jajarkot', 'जाजरकोट', 'Bheri'),
((SELECT id FROM public.provinces WHERE code=6), 64, 'Rukum East', 'रुकुम पूर्व', 'Musikot'),
((SELECT id FROM public.provinces WHERE code=6), 65, 'Salyan', 'सल्यान', 'Salyan'),
((SELECT id FROM public.provinces WHERE code=6), 66, 'Dailekh', 'दैलेख', 'Dullu'),
((SELECT id FROM public.provinces WHERE code=6), 67, 'Kalikot', 'कालिकोट', 'Manma');

-- Province 7 (Sudurpashchim)
INSERT INTO public.districts (province_id, code, name_en, name_ne, headquarters) VALUES
((SELECT id FROM public.provinces WHERE code=7), 68, 'Darchula', 'दार्चुला', 'Darchula'),
((SELECT id FROM public.provinces WHERE code=7), 69, 'Baitadi', 'बैतडी', 'Baitadi'),
((SELECT id FROM public.provinces WHERE code=7), 70, 'Dadeldhura', 'दडेलधुरा', 'Dadeldhura'),
((SELECT id FROM public.provinces WHERE code=7), 71, 'Doti', 'डोटी', 'Dipayal'),
((SELECT id FROM public.provinces WHERE code=7), 72, 'Achham', 'अछाम', 'Mangalsen'),
((SELECT id FROM public.provinces WHERE code=7), 73, 'Bajhang', 'बझाङ', 'Jaya Prithvi'),
((SELECT id FROM public.provinces WHERE code=7), 74, 'Bajura', 'बाजुरा', 'Badimalika'),
((SELECT id FROM public.provinces WHERE code=7), 75, 'Kailali', 'कैलाली', 'Dhangadhi'),
((SELECT id FROM public.provinces WHERE code=7), 76, 'Kanchanpur', 'कञ्चनपुर', 'Mahendranagar'),
((SELECT id FROM public.provinces WHERE code=7), 77, 'Doti', 'डोटी', 'Dipayal');

-- ============================================
-- LOCAL BODIES (Municipalities & Rural Municipalities)
-- ============================================
CREATE TABLE public.local_bodies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID NOT NULL REFERENCES public.districts(id),
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_ne TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('metropolitan', 'sub_metropolitan', 'municipality', 'rural_municipality')),
    area_km2 NUMERIC(10,2),
    population BIGINT,
    ward_count SMALLINT DEFAULT 1,
    headquarters TEXT,
    geo_location GEOGRAPHY(POINT, 4326),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_local_bodies_district ON public.local_bodies(district_id);
CREATE INDEX idx_local_bodies_type ON public.local_bodies(type);

-- ============================================
-- WARDS
-- ============================================
CREATE TABLE public.wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_body_id UUID NOT NULL REFERENCES public.local_bodies(id),
    ward_number SMALLINT NOT NULL,
    name_en TEXT,
    name_ne TEXT,
    area_km2 NUMERIC(10,2),
    population BIGINT,
    geo_location GEOGRAPHY(POINT, 4326),
    boundary GEOGRAPHY(POLYGON, 4326),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(local_body_id, ward_number)
);

CREATE INDEX idx_wards_local_body ON public.wards(local_body_id);

-- ============================================
-- LOCATION HIERARCHY VIEW
-- ============================================
CREATE OR REPLACE VIEW public.v_location_hierarchy AS
SELECT
    p.id AS province_id,
    p.code AS province_code,
    p.name_en AS province_name_en,
    p.name_ne AS province_name_ne,
    d.id AS district_id,
    d.code AS district_code,
    d.name_en AS district_name_en,
    d.name_ne AS district_name_ne,
    lb.id AS local_body_id,
    lb.code AS local_body_code,
    lb.name_en AS local_body_name_en,
    lb.name_ne AS local_body_name_ne,
    lb.type AS local_body_type,
    w.id AS ward_id,
    w.ward_number,
    w.name_en AS ward_name_en,
    w.name_ne AS ward_name_ne
FROM public.provinces p
JOIN public.districts d ON d.province_id = p.id
JOIN public.local_bodies lb ON lb.district_id = d.id
JOIN public.wards w ON w.local_body_id = lb.id;
