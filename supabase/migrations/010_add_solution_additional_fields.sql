-- 添加 Solution 表的额外字段
-- 迁移: add_solution_additional_fields

-- 1. 添加 summary 字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'summary'
  ) THEN
    ALTER TABLE public.solutions 
    ADD COLUMN summary TEXT;
    
    COMMENT ON COLUMN public.solutions.summary IS '方案摘要';
  END IF;
END $$;

-- 2. 添加 tags 字段（数组类型）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.solutions 
    ADD COLUMN tags TEXT[] DEFAULT '{}';
    
    COMMENT ON COLUMN public.solutions.tags IS '标签数组（独立于 features）';
  END IF;
END $$;

-- 3. 添加 locale 字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'locale'
  ) THEN
    ALTER TABLE public.solutions 
    ADD COLUMN locale TEXT DEFAULT 'zh-CN';
    
    COMMENT ON COLUMN public.solutions.locale IS '语言代码（默认 zh-CN）';
  END IF;
END $$;

-- 4. 添加 technicalSpecs 字段（JSONB）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'technicalSpecs'
  ) THEN
    ALTER TABLE public.solutions 
    ADD COLUMN "technicalSpecs" JSONB;
    
    COMMENT ON COLUMN public.solutions."technicalSpecs" IS '技术规格JSON（新字段，与 specs 互斥使用）';
  END IF;
END $$;

-- 5. 添加 useCases 字段（JSONB）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'useCases'
  ) THEN
    ALTER TABLE public.solutions 
    ADD COLUMN "useCases" JSONB;
    
    COMMENT ON COLUMN public.solutions."useCases" IS '应用场景JSON';
  END IF;
END $$;

-- 6. 添加 architecture 字段（JSONB）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'architecture'
  ) THEN
    ALTER TABLE public.solutions 
    ADD COLUMN architecture JSONB;
    
    COMMENT ON COLUMN public.solutions.architecture IS '架构图JSON';
  END IF;
END $$;

-- 7. 添加 lastReviewedAt 字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'lastReviewedAt'
  ) THEN
    ALTER TABLE public.solutions 
    ADD COLUMN "lastReviewedAt" TIMESTAMP WITH TIME ZONE;
    
    COMMENT ON COLUMN public.solutions."lastReviewedAt" IS '最后审核时间';
    
    -- 如果 reviewed_at 有值，复制到 lastReviewedAt（注意：数据库字段可能是 snake_case）
    -- 由于当前数据为空，跳过数据迁移
  END IF;
END $$;

-- 8. 添加 publishedAt 字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'publishedAt'
  ) THEN
    ALTER TABLE public.solutions 
    ADD COLUMN "publishedAt" TIMESTAMP WITH TIME ZONE;
    
    COMMENT ON COLUMN public.solutions."publishedAt" IS '发布时间';
    
    -- 如果状态为 PUBLISHED 且 publishedAt 为空，设置为 updated_at
    -- 由于当前数据为空，跳过数据迁移
  END IF;
END $$;

-- 9. 添加 archivedAt 字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'archivedAt'
  ) THEN
    ALTER TABLE public.solutions 
    ADD COLUMN "archivedAt" TIMESTAMP WITH TIME ZONE;
    
    COMMENT ON COLUMN public.solutions."archivedAt" IS '归档时间';
    
    -- 如果状态为 ARCHIVED 且 archivedAt 为空，设置为 updated_at
    -- 由于当前数据为空，跳过数据迁移
  END IF;
END $$;

-- 10. 创建索引（如果需要）
DO $$ 
BEGIN
  -- tags 数组索引（GIN 索引用于数组查询）
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'solutions' 
    AND indexname = 'solutions_tags_idx'
  ) THEN
    CREATE INDEX solutions_tags_idx ON public.solutions USING GIN(tags);
  END IF;
  
  -- locale 索引
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'solutions' 
    AND indexname = 'solutions_locale_idx'
  ) THEN
    CREATE INDEX solutions_locale_idx ON public.solutions(locale);
  END IF;
  
  -- publishedAt 索引（用于查询已发布的方案）
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'solutions' 
    AND indexname = 'solutions_publishedAt_idx'
  ) THEN
    CREATE INDEX solutions_publishedAt_idx ON public.solutions("publishedAt");
  END IF;
END $$;

-- 11. 验证迁移
DO $$ 
DECLARE
  field_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO field_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'solutions' 
  AND column_name IN ('summary', 'tags', 'locale', 'technicalSpecs', 'useCases', 'architecture', 'lastReviewedAt', 'publishedAt', 'archivedAt');
  
  IF field_count >= 9 THEN
    RAISE NOTICE '✅ 所有字段已成功添加 (共 % 个)', field_count;
  ELSE
    RAISE WARNING '⚠️  部分字段可能未添加 (共 % 个)', field_count;
  END IF;
END $$;

