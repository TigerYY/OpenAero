-- 修复列名不匹配问题
-- 将solutions表中的camelCase列名改为snake_case
-- 注意：PostgreSQL区分大小写，camelCase列名必须用双引号括起来

-- 根据实际检查结果，只有solutions表有camelCase列名需要修复

BEGIN;

-- Solutions表 - 只修复实际存在的camelCase列
ALTER TABLE solutions RENAME COLUMN "submittedAt" TO submitted_at;
ALTER TABLE solutions RENAME COLUMN "reviewedAt" TO reviewed_at;
ALTER TABLE solutions RENAME COLUMN "reviewNotes" TO review_notes;
ALTER TABLE solutions RENAME COLUMN "publishedAt" TO published_at;
ALTER TABLE solutions RENAME COLUMN "archivedAt" TO archived_at;
ALTER TABLE solutions RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE solutions RENAME COLUMN "updatedAt" TO updated_at;

COMMIT;

-- 验证修改
SELECT 'Column renaming completed successfully! 7 columns renamed in solutions table.' AS status;
