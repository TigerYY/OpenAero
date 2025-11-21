-- 为 solution_reviews 表添加状态转换字段
-- 由于使用 Supabase Session Pooler，需要手动执行此 SQL

-- 确保 SolutionStatus 枚举类型存在
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

-- 添加 from_status 字段（审核前的方案状态）
-- 注意：使用双引号确保类型名称大小写正确
ALTER TABLE solution_reviews 
ADD COLUMN IF NOT EXISTS from_status "SolutionStatus";

-- 添加 to_status 字段（审核后的方案状态）
ALTER TABLE solution_reviews 
ADD COLUMN IF NOT EXISTS to_status "SolutionStatus";

-- 为现有记录设置默认值（可选）
-- 如果现有记录的 from_status 和 to_status 为 NULL，设置为 PENDING_REVIEW
UPDATE solution_reviews 
SET 
  from_status = 'PENDING_REVIEW',
  to_status = 'PENDING_REVIEW'
WHERE from_status IS NULL OR to_status IS NULL;

-- 验证字段已添加
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'solution_reviews'
  AND column_name IN ('from_status', 'to_status');

