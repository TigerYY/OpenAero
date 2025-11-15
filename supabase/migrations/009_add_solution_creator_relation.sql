-- 添加 Solution 表的 creatorId 字段和关联关系
-- 迁移: add_solution_creator_relation

-- 1. 添加或修改 creatorId 字段
DO $$ 
BEGIN
  -- 如果字段不存在，添加 UUID 类型字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'creatorId'
  ) THEN
    ALTER TABLE public.solutions 
    ADD COLUMN "creatorId" UUID;
    
    -- 添加注释
    COMMENT ON COLUMN public.solutions."creatorId" IS '创作者ID（关联到 creator_profiles.id）';
  -- 如果字段存在但类型不对，先删除再重新添加
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'creatorId'
    AND data_type != 'uuid'
  ) THEN
    -- 删除旧的外键约束（如果存在）
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'solutions' 
      AND constraint_name LIKE 'solutions_creatorid%'
    ) THEN
      ALTER TABLE public.solutions DROP CONSTRAINT IF EXISTS solutions_creatorId_fkey;
    END IF;
    
    -- 删除旧字段
    ALTER TABLE public.solutions DROP COLUMN IF EXISTS "creatorId";
    
    -- 重新添加 UUID 类型字段
    ALTER TABLE public.solutions 
    ADD COLUMN "creatorId" UUID;
    
    -- 添加注释
    COMMENT ON COLUMN public.solutions."creatorId" IS '创作者ID（关联到 creator_profiles.id）';
  END IF;
END $$;

-- 2. 添加外键约束（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'solutions' 
    AND constraint_name = 'solutions_creatorId_fkey'
  ) THEN
    ALTER TABLE public.solutions 
    ADD CONSTRAINT solutions_creatorId_fkey 
    FOREIGN KEY ("creatorId") 
    REFERENCES public.creator_profiles(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- 3. 创建索引（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'solutions' 
    AND indexname = 'solutions_creatorId_idx'
  ) THEN
    CREATE INDEX solutions_creatorId_idx ON public.solutions("creatorId");
  END IF;
END $$;

-- 4. 验证迁移
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name = 'creatorId'
  ) THEN
    RAISE NOTICE '✅ creatorId 字段已成功添加';
  ELSE
    RAISE EXCEPTION '❌ creatorId 字段添加失败';
  END IF;
END $$;

