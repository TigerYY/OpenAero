-- ============================================
-- 修复 applications 表的外键约束
-- 删除引用 auth.users 的外键，避免 Prisma 跨 schema 错误
-- ============================================

-- 检查并删除 applications 表中引用 auth.users 的外键约束
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- 查找引用 auth schema 的外键约束
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
        AND tc.table_name = 'applications'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'auth'
    LIMIT 1;
    
    -- 如果找到约束，删除它
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE '已删除外键约束: %', constraint_name;
    ELSE
        RAISE NOTICE '未找到需要删除的外键约束';
    END IF;
END $$;

-- 如果 applications 表存在但不在 Prisma schema 中，可以选择删除它
-- 注意：只有在确认不需要此表时才取消注释
-- DROP TABLE IF EXISTS public.applications CASCADE;

