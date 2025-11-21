-- ============================================
-- 升级解决方案全周期管理流程
-- 迁移: upgrade_solution_lifecycle
-- ============================================

-- 1. 更新 SolutionStatus 枚举，添加新状态
DO $$ 
BEGIN
    -- 检查枚举是否存在
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SolutionStatus') THEN
        -- 添加新状态到枚举（如果不存在）
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'READY_TO_PUBLISH' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SolutionStatus')
        ) THEN
            ALTER TYPE "SolutionStatus" ADD VALUE 'READY_TO_PUBLISH';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'SUSPENDED' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SolutionStatus')
        ) THEN
            ALTER TYPE "SolutionStatus" ADD VALUE 'SUSPENDED';
        END IF;
    ELSE
        -- 如果枚举不存在，创建它（防御性检查）
        CREATE TYPE "SolutionStatus" AS ENUM (
            'DRAFT',
            'PENDING_REVIEW',
            'APPROVED',
            'READY_TO_PUBLISH',
            'REJECTED',
            'PUBLISHED',
            'SUSPENDED',
            'ARCHIVED'
        );
    END IF;
END $$;

-- 2. 在 solutions 表中添加升级相关字段
DO $$ 
BEGIN
    -- 添加 upgraded_from_id 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'solutions' 
        AND column_name = 'upgraded_from_id'
    ) THEN
        ALTER TABLE public.solutions 
        ADD COLUMN upgraded_from_id TEXT;
        
        COMMENT ON COLUMN public.solutions.upgraded_from_id IS '源方案ID（升级关系）';
        
        -- 添加外键约束（可选，自引用）
        ALTER TABLE public.solutions 
        ADD CONSTRAINT solutions_upgraded_from_id_fkey 
        FOREIGN KEY (upgraded_from_id) 
        REFERENCES public.solutions(id) 
        ON DELETE SET NULL;
    END IF;
    
    -- 添加 upgraded_from_version 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'solutions' 
        AND column_name = 'upgraded_from_version'
    ) THEN
        ALTER TABLE public.solutions 
        ADD COLUMN upgraded_from_version INTEGER;
        
        COMMENT ON COLUMN public.solutions.upgraded_from_version IS '源方案版本号';
    END IF;
    
    -- 添加 upgrade_notes 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'solutions' 
        AND column_name = 'upgrade_notes'
    ) THEN
        ALTER TABLE public.solutions 
        ADD COLUMN upgrade_notes TEXT;
        
        COMMENT ON COLUMN public.solutions.upgrade_notes IS '升级说明';
    END IF;
    
    -- 添加 is_upgrade 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'solutions' 
        AND column_name = 'is_upgrade'
    ) THEN
        ALTER TABLE public.solutions 
        ADD COLUMN is_upgrade BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN public.solutions.is_upgrade IS '是否为升级方案';
    END IF;
END $$;

-- 3. 创建 solution_publishing 表（管理员商品化数据）
CREATE TABLE IF NOT EXISTS public.solution_publishing (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    solution_id TEXT UNIQUE NOT NULL,
    
    -- 商品化内容
    publish_description TEXT,
    media_links JSONB,
    product_links JSONB,
    
    -- SEO 优化
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[] DEFAULT '{}',
    
    -- 推荐设置
    featured_tags TEXT[] DEFAULT '{}',
    featured_order INTEGER,
    is_featured BOOLEAN DEFAULT false,
    
    -- 统计信息（发布后更新）
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- 优化记录
    optimized_at TIMESTAMP WITH TIME ZONE,
    optimized_by TEXT,
    optimization_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 外键约束
    CONSTRAINT solution_publishing_solution_id_fkey 
        FOREIGN KEY (solution_id) 
        REFERENCES public.solutions(id) 
        ON DELETE CASCADE
);

-- 4. 创建索引
DO $$ 
BEGIN
    -- solution_id 唯一索引（已通过 UNIQUE 约束自动创建，但显式创建以明确意图）
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'solution_publishing' 
        AND indexname = 'solution_publishing_solution_id_idx'
    ) THEN
        CREATE UNIQUE INDEX solution_publishing_solution_id_idx 
        ON public.solution_publishing(solution_id);
    END IF;
    
    -- is_featured 索引（用于查询推荐方案）
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'solution_publishing' 
        AND indexname = 'solution_publishing_is_featured_idx'
    ) THEN
        CREATE INDEX solution_publishing_is_featured_idx 
        ON public.solution_publishing(is_featured) 
        WHERE is_featured = true;
    END IF;
    
    -- featured_order 索引（用于排序推荐方案）
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'solution_publishing' 
        AND indexname = 'solution_publishing_featured_order_idx'
    ) THEN
        CREATE INDEX solution_publishing_featured_order_idx 
        ON public.solution_publishing(featured_order) 
        WHERE featured_order IS NOT NULL;
    END IF;
    
    -- meta_keywords 数组索引（GIN 索引用于数组查询）
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'solution_publishing' 
        AND indexname = 'solution_publishing_meta_keywords_idx'
    ) THEN
        CREATE INDEX solution_publishing_meta_keywords_idx 
        ON public.solution_publishing USING GIN(meta_keywords);
    END IF;
    
    -- featured_tags 数组索引
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'solution_publishing' 
        AND indexname = 'solution_publishing_featured_tags_idx'
    ) THEN
        CREATE INDEX solution_publishing_featured_tags_idx 
        ON public.solution_publishing USING GIN(featured_tags);
    END IF;
    
    -- solutions 表的升级相关字段索引
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'solutions' 
        AND indexname = 'solutions_upgraded_from_id_idx'
    ) THEN
        CREATE INDEX solutions_upgraded_from_id_idx 
        ON public.solutions(upgraded_from_id) 
        WHERE upgraded_from_id IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'solutions' 
        AND indexname = 'solutions_is_upgrade_idx'
    ) THEN
        CREATE INDEX solutions_is_upgrade_idx 
        ON public.solutions(is_upgrade) 
        WHERE is_upgrade = true;
    END IF;
END $$;

-- 5. 添加表注释
COMMENT ON TABLE public.solution_publishing IS '方案上架优化数据表（管理员商品化）';
COMMENT ON COLUMN public.solution_publishing.publish_description IS '上架说明';
COMMENT ON COLUMN public.solution_publishing.media_links IS '媒体链接数组（JSONB）';
COMMENT ON COLUMN public.solution_publishing.product_links IS '商品链接数组（JSONB）';
COMMENT ON COLUMN public.solution_publishing.meta_title IS 'SEO 标题';
COMMENT ON COLUMN public.solution_publishing.meta_description IS 'SEO 描述';
COMMENT ON COLUMN public.solution_publishing.meta_keywords IS 'SEO 关键词数组';
COMMENT ON COLUMN public.solution_publishing.featured_tags IS '推荐标签数组';
COMMENT ON COLUMN public.solution_publishing.featured_order IS '推荐排序';
COMMENT ON COLUMN public.solution_publishing.is_featured IS '是否推荐';
COMMENT ON COLUMN public.solution_publishing.view_count IS '浏览次数';
COMMENT ON COLUMN public.solution_publishing.download_count IS '下载次数';
COMMENT ON COLUMN public.solution_publishing.like_count IS '点赞次数';
COMMENT ON COLUMN public.solution_publishing.optimized_at IS '优化完成时间';
COMMENT ON COLUMN public.solution_publishing.optimized_by IS '优化人员ID';
COMMENT ON COLUMN public.solution_publishing.optimization_notes IS '优化说明';

-- 6. 验证迁移
DO $$ 
DECLARE
    enum_count INTEGER;
    solution_field_count INTEGER;
    publishing_table_exists BOOLEAN;
BEGIN
    -- 检查枚举值
    SELECT COUNT(*) INTO enum_count
    FROM pg_enum 
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SolutionStatus')
    AND enumlabel IN ('READY_TO_PUBLISH', 'SUSPENDED');
    
    IF enum_count >= 2 THEN
        RAISE NOTICE '✅ SolutionStatus 枚举已更新 (新增 % 个状态)', enum_count;
    ELSE
        RAISE WARNING '⚠️  SolutionStatus 枚举可能未完全更新 (找到 % 个新状态)', enum_count;
    END IF;
    
    -- 检查 solutions 表字段
    SELECT COUNT(*) INTO solution_field_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'solutions' 
    AND column_name IN ('upgraded_from_id', 'upgraded_from_version', 'upgrade_notes', 'is_upgrade');
    
    IF solution_field_count >= 4 THEN
        RAISE NOTICE '✅ solutions 表升级字段已添加 (共 % 个)', solution_field_count;
    ELSE
        RAISE WARNING '⚠️  solutions 表部分字段可能未添加 (找到 % 个)', solution_field_count;
    END IF;
    
    -- 检查 solution_publishing 表
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'solution_publishing'
    ) INTO publishing_table_exists;
    
    IF publishing_table_exists THEN
        RAISE NOTICE '✅ solution_publishing 表已创建';
    ELSE
        RAISE WARNING '⚠️  solution_publishing 表可能未创建';
    END IF;
    
    RAISE NOTICE '🎉 迁移完成！';
END $$;

