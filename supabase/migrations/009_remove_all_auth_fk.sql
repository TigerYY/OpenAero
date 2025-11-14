-- ============================================
-- 删除所有引用 auth.users 的外键约束
-- 解决 Prisma 跨 schema 引用问题
-- ============================================

-- 删除所有引用 auth.users 的外键约束
DO $$
DECLARE
    constraint_rec RECORD;
    constraint_count INT := 0;
BEGIN
    -- 查找所有引用 auth schema 的外键约束
    FOR constraint_rec IN
        SELECT 
            tc.table_name,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_schema = 'auth'
        ORDER BY tc.table_name, tc.constraint_name
    LOOP
        -- 删除外键约束
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', 
            constraint_rec.table_name, 
            constraint_rec.constraint_name);
        
        RAISE NOTICE '已删除外键约束: %.%', constraint_rec.table_name, constraint_rec.constraint_name;
        constraint_count := constraint_count + 1;
    END LOOP;
    
    IF constraint_count = 0 THEN
        RAISE NOTICE '未找到需要删除的外键约束';
    ELSE
        RAISE NOTICE '总共删除了 % 个外键约束', constraint_count;
    END IF;
END $$;

-- 验证：检查是否还有引用 auth schema 的外键约束
DO $$
DECLARE
    remaining_count INT;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'auth';
    
    IF remaining_count > 0 THEN
        RAISE WARNING '仍有 % 个外键约束引用 auth schema', remaining_count;
    ELSE
        RAISE NOTICE '✅ 所有引用 auth schema 的外键约束已删除';
    END IF;
END $$;

