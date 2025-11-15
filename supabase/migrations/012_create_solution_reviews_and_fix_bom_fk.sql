-- 创建 solution_reviews 表并修复 solution_bom_items 外键约束
-- 迁移: create_solution_reviews_and_fix_bom_fk

-- 1. 检查并创建必要的枚举类型
DO $$ 
BEGIN
  -- ReviewStatus 枚举
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewStatus') THEN
    CREATE TYPE "ReviewStatus" AS ENUM (
      'PENDING',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;
  
  -- ReviewDecision 枚举
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewDecision') THEN
    CREATE TYPE "ReviewDecision" AS ENUM (
      'APPROVED',
      'REJECTED',
      'NEEDS_REVISION',
      'PENDING'
    );
  END IF;
  
  -- SolutionStatus 枚举（如果不存在）
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SolutionStatus') THEN
    CREATE TYPE "SolutionStatus" AS ENUM (
      'DRAFT',
      'PENDING_REVIEW',
      'APPROVED',
      'REJECTED',
      'PUBLISHED',
      'ARCHIVED'
    );
  END IF;
END $$;

-- 2. 创建 solution_reviews 表
CREATE TABLE IF NOT EXISTS public.solution_reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "solutionId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  
  -- 状态转换记录
  "fromStatus" "SolutionStatus" NOT NULL DEFAULT 'DRAFT',
  "toStatus" "SolutionStatus" NOT NULL DEFAULT 'APPROVED',
  
  -- 审核内容
  status "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  score INTEGER,
  comments TEXT,
  
  -- 审核维度
  "qualityScore" INTEGER,
  completeness INTEGER,
  innovation INTEGER,
  "marketPotential" INTEGER,
  
  -- 审核决策
  decision "ReviewDecision" NOT NULL DEFAULT 'PENDING',
  "decisionNotes" TEXT,
  
  -- 改进建议
  suggestions TEXT[] DEFAULT '{}',
  
  -- 时间记录
  "reviewStartedAt" TIMESTAMP WITH TIME ZONE,
  "reviewedAt" TIMESTAMP WITH TIME ZONE,
  
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT solution_reviews_solutionId_fkey 
    FOREIGN KEY ("solutionId") 
    REFERENCES public.solutions(id) 
    ON DELETE CASCADE
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS solution_reviews_solutionId_idx 
  ON public.solution_reviews("solutionId");
CREATE INDEX IF NOT EXISTS solution_reviews_reviewerId_idx 
  ON public.solution_reviews("reviewerId");
CREATE INDEX IF NOT EXISTS solution_reviews_status_idx 
  ON public.solution_reviews(status);
CREATE INDEX IF NOT EXISTS solution_reviews_decision_idx 
  ON public.solution_reviews(decision);
CREATE INDEX IF NOT EXISTS solution_reviews_fromStatus_idx 
  ON public.solution_reviews("fromStatus");
CREATE INDEX IF NOT EXISTS solution_reviews_toStatus_idx 
  ON public.solution_reviews("toStatus");

-- 4. 添加注释
COMMENT ON TABLE public.solution_reviews IS '方案审核记录表';
COMMENT ON COLUMN public.solution_reviews."fromStatus" IS '审核前状态';
COMMENT ON COLUMN public.solution_reviews."toStatus" IS '审核后状态';

-- 5. 为 solution_bom_items.productId 添加外键约束（如果 products 表存在）
DO $$ 
BEGIN
  -- 检查 products 表是否存在
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'products'
  ) THEN
    -- 检查外键约束是否已存在
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'solution_bom_items' 
      AND constraint_name = 'solution_bom_items_productId_fkey'
    ) THEN
      -- 添加外键约束
      ALTER TABLE public.solution_bom_items 
      ADD CONSTRAINT solution_bom_items_productId_fkey 
      FOREIGN KEY ("productId") 
      REFERENCES public.products(id) 
      ON DELETE SET NULL;
      
      RAISE NOTICE '✅ 已为 solution_bom_items.productId 添加外键约束';
    ELSE
      RAISE NOTICE 'ℹ️  solution_bom_items.productId 外键约束已存在';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  products 表不存在，跳过外键约束添加';
  END IF;
END $$;

-- 6. 验证迁移
DO $$ 
DECLARE
  review_table_exists BOOLEAN;
  review_columns_count INTEGER;
  bom_fk_exists BOOLEAN;
BEGIN
  -- 检查 solution_reviews 表
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'solution_reviews'
  ) INTO review_table_exists;
  
  -- 检查 fromStatus 和 toStatus 字段
  SELECT COUNT(*) INTO review_columns_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'solution_reviews' 
  AND column_name IN ('fromStatus', 'toStatus');
  
  -- 检查 solution_bom_items.productId 外键
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'solution_bom_items' 
    AND constraint_name = 'solution_bom_items_productId_fkey'
  ) INTO bom_fk_exists;
  
  -- 输出验证结果
  IF review_table_exists AND review_columns_count >= 2 THEN
    RAISE NOTICE '✅ solution_reviews 表创建成功';
    RAISE NOTICE '   - fromStatus/toStatus 字段: 已添加';
  ELSE
    RAISE WARNING '⚠️  solution_reviews 表或字段可能未正确创建';
  END IF;
  
  IF bom_fk_exists THEN
    RAISE NOTICE '✅ solution_bom_items.productId 外键约束: 已添加';
  ELSE
    RAISE NOTICE 'ℹ️  solution_bom_items.productId 外键约束: 未添加（products 表可能不存在）';
  END IF;
END $$;

