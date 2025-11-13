-- ============================================
-- 将 solutions.status 列转换为 SolutionStatus 枚举
-- ============================================

-- 1. 确保枚举已经存在（防御性检查）
DO $$
BEGIN
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

-- 2. 删除旧的检查约束（如果仍然存在）
ALTER TABLE public.solutions DROP CONSTRAINT IF EXISTS solutions_status_check;

-- 3. 将旧值映射到新枚举值
UPDATE public.solutions
SET status = 'PENDING_REVIEW'
WHERE status = 'PENDING';

-- 4. 将列类型修改为枚举
ALTER TABLE public.solutions
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE "SolutionStatus" USING status::"SolutionStatus",
    ALTER COLUMN status SET DEFAULT 'DRAFT';

-- 5. 重新创建索引（如果需要）
-- 旧索引仍然有效，无需重新创建。若数据库中不存在索引，可取消注释以下语句：
-- CREATE INDEX IF NOT EXISTS idx_solutions_status ON public.solutions(status);
