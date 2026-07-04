-- Phone Accessories AI Studio - Database Schema

-- 商品表（核心）
CREATE TABLE IF NOT EXISTS pa_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT '',           -- phone_case | earbuds | holder | cable | charger | fan | stand | car_mount | power_bank
  brand TEXT DEFAULT '',
  color TEXT DEFAULT '',
  material TEXT DEFAULT '',
  specs JSONB DEFAULT '{}',            -- {weight, size, compatibility, etc}
  selling_points TEXT[] DEFAULT '{}',  -- 用户填写的卖点
  original_images TEXT[] DEFAULT '{}', -- R2 URLs
  -- AI分析结果
  ai_analysis JSONB DEFAULT '{}',      -- {productType, color, material, usage, targetUser, suggestedPoints, competitorKeywords}
  -- 标题（多平台、多语言）
  title_shopee_en TEXT DEFAULT '',
  title_shopee_ms TEXT DEFAULT '',
  title_tiktok_en TEXT DEFAULT '',
  title_lazada_en TEXT DEFAULT '',
  title_lazada_ms TEXT DEFAULT '',
  -- 描述
  description_short TEXT DEFAULT '',
  description_long TEXT DEFAULT '',
  description_bullets TEXT[] DEFAULT '{}',
  description_specs JSONB DEFAULT '{}',
  description_faq TEXT[] DEFAULT '{}',
  -- 核心关键词
  core_keywords TEXT[] DEFAULT '{}',
  longtail_keywords TEXT[] DEFAULT '{}',
  -- 状态
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'analyzed', 'generated', 'completed')),
  total_cost DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 生成的图片
CREATE TABLE IF NOT EXISTS pa_generated_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES pa_products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('main_white', 'scene', 'selling_point', 'comparison')),
  sub_type TEXT DEFAULT '',            -- main: white_bg | enhanced | hd
                                   -- scene: car | office | desk | outdoor
                                   -- selling_point: feature_1 | feature_2 | material | usage | specs
  prompt TEXT NOT NULL DEFAULT '',
  original_image_url TEXT DEFAULT '',
  generated_image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 生成历史（成本追踪）
CREATE TABLE IF NOT EXISTS pa_generation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES pa_products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image_edit', 'title', 'description', 'analysis')),
  model TEXT NOT NULL DEFAULT '',
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  error_message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 卖点数据库（预置）
CREATE TABLE IF NOT EXISTS pa_selling_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,              -- phone_case | earbuds | holder | cable | charger | fan | stand | car_mount | power_bank
  point_en TEXT NOT NULL,               -- 英文
  point_ms TEXT DEFAULT '',             -- 马来文
  point_zh TEXT DEFAULT '',             -- 中文
  point_image_prompt TEXT DEFAULT '',   -- 对应的图片生成prompt
  priority INT DEFAULT 0,
  UNIQUE(category, point_en)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pa_products_status ON pa_products(status);
CREATE INDEX IF NOT EXISTS idx_pa_products_category ON pa_products(category);
CREATE INDEX IF NOT EXISTS idx_pa_products_created_at ON pa_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pa_generated_images_product ON pa_generated_images(product_id);
CREATE INDEX IF NOT EXISTS idx_pa_generation_history_product ON pa_generation_history(product_id);
CREATE INDEX IF NOT EXISTS idx_pa_selling_points_category ON pa_selling_points(category);

-- Enable RLS
ALTER TABLE pa_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_selling_points ENABLE ROW LEVEL SECURITY;

-- Allow all (auth handled at app level via cookie)
CREATE POLICY "Allow all on pa_products" ON pa_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on pa_generated_images" ON pa_generated_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on pa_generation_history" ON pa_generation_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on pa_selling_points" ON pa_selling_points FOR ALL USING (true) WITH CHECK (true);
