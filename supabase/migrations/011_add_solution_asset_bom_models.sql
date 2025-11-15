-- 添加 SolutionAsset 和 SolutionBomItem 模型
-- 迁移: add_solution_asset_bom_models

-- 1. 创建 AssetType 枚举（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssetType') THEN
    CREATE TYPE "AssetType" AS ENUM (
      'IMAGE',
      'DOCUMENT',
      'VIDEO',
      'CAD',
      'OTHER'
    );
  END IF;
END $$;

-- 2. 创建 solution_assets 表
CREATE TABLE IF NOT EXISTS public.solution_assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "solutionId" TEXT NOT NULL,
  type "AssetType" NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT solution_assets_solutionId_fkey 
    FOREIGN KEY ("solutionId") 
    REFERENCES public.solutions(id) 
    ON DELETE CASCADE
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS solution_assets_solutionId_idx 
  ON public.solution_assets("solutionId");
CREATE INDEX IF NOT EXISTS solution_assets_type_idx 
  ON public.solution_assets(type);

-- 4. 创建 solution_bom_items 表
CREATE TABLE IF NOT EXISTS public.solution_bom_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "solutionId" TEXT NOT NULL,
  name TEXT NOT NULL,
  model TEXT,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  "productId" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT solution_bom_items_solutionId_fkey 
    FOREIGN KEY ("solutionId") 
    REFERENCES public.solutions(id) 
    ON DELETE CASCADE
);

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS solution_bom_items_solutionId_idx 
  ON public.solution_bom_items("solutionId");
CREATE INDEX IF NOT EXISTS solution_bom_items_productId_idx 
  ON public.solution_bom_items("productId");

-- 注意：products 表可能不存在，productId 外键约束稍后添加（当 products 表存在时）

-- 6. 更新 solution_reviews 表，添加 fromStatus 和 toStatus 字段（如果表存在）
DO $$ 
BEGIN
  -- 检查表是否存在
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'solution_reviews'
  ) THEN
    -- 添加 fromStatus 字段
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'solution_reviews' 
      AND column_name = 'fromStatus'
    ) THEN
      ALTER TABLE public.solution_reviews 
      ADD COLUMN "fromStatus" "SolutionStatus" NOT NULL DEFAULT 'DRAFT';
      
      COMMENT ON COLUMN public.solution_reviews."fromStatus" IS '审核前状态';
    END IF;
    
    -- 添加 toStatus 字段
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'solution_reviews' 
      AND column_name = 'toStatus'
    ) THEN
      ALTER TABLE public.solution_reviews 
      ADD COLUMN "toStatus" "SolutionStatus" NOT NULL DEFAULT 'APPROVED';
      
      COMMENT ON COLUMN public.solution_reviews."toStatus" IS '审核后状态';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  solution_reviews 表不存在，跳过字段添加';
  END IF;
END $$;

-- 7. 验证迁移
DO $$ 
DECLARE
  table_count INTEGER;
  column_count INTEGER;
BEGIN
  -- 检查表是否存在
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('solution_assets', 'solution_bom_items');
  
  -- 检查字段是否存在
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'solution_reviews' 
  AND column_name IN ('fromStatus', 'toStatus');
  
  IF table_count >= 2 THEN
    RAISE NOTICE '✅ 所有表已成功创建';
    RAISE NOTICE '   - solution_assets 表: 存在';
    RAISE NOTICE '   - solution_bom_items 表: 存在';
    IF column_count >= 2 THEN
      RAISE NOTICE '   - solution_reviews.fromStatus/toStatus: 已添加';
    ELSE
      RAISE NOTICE '   - solution_reviews.fromStatus/toStatus: 表不存在或字段未添加';
    END IF;
  ELSE
    RAISE WARNING '⚠️  部分表可能未创建';
  END IF;
END $$;
