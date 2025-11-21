-- ============================================
-- 回滚：升级解决方案全周期管理流程
-- 迁移: upgrade_solution_lifecycle (ROLLBACK)
-- ============================================
-- 
-- ⚠️ 警告：此回滚脚本会删除所有相关数据！
-- 执行前请确保已备份数据库
-- ============================================

-- 1. 删除 solution_publishing 表
DROP TABLE IF EXISTS public.solution_publishing CASCADE;

-- 2. 删除 solutions 表的升级相关字段
DO $$ 
BEGIN
    -- 删除外键约束
    ALTER TABLE public.solutions 
    DROP CONSTRAINT IF EXISTS solutions_upgraded_from_id_fkey;
    
    -- 删除字段
    ALTER TABLE public.solutions 
    DROP COLUMN IF EXISTS upgraded_from_id,
    DROP COLUMN IF EXISTS upgraded_from_version,
    DROP COLUMN IF EXISTS upgrade_notes,
    DROP COLUMN IF EXISTS is_upgrade;
END $$;

-- 3. 删除索引（如果存在）
DROP INDEX IF EXISTS public.solutions_upgraded_from_id_idx;
DROP INDEX IF EXISTS public.solutions_is_upgrade_idx;

-- 4. 注意：枚举值的删除比较复杂
-- PostgreSQL 不支持直接删除枚举值，需要重建枚举类型
-- 这里只提供警告，实际回滚需要手动处理
DO $$ 
BEGIN
    RAISE WARNING '⚠️  枚举值 READY_TO_PUBLISH 和 SUSPENDED 需要手动从 SolutionStatus 枚举中删除';
    RAISE WARNING '⚠️  如果需要完全回滚枚举，需要重建枚举类型（会丢失数据）';
    RAISE NOTICE '✅ 表结构和字段已回滚';
END $$;

