-- ============================================
-- 修复 VerificationStatus 枚举类型名称
-- 将 verification_status 枚举类型转换为 VerificationStatus 以匹配 Prisma schema
-- ============================================

-- 1. 创建 VerificationStatus 枚举类型（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerificationStatus') THEN
    CREATE TYPE "VerificationStatus" AS ENUM (
      'PENDING',
      'APPROVED',
      'REJECTED',
      'EXPIRED'
    );
  END IF;
END $$;

-- 2. 将 creator_profiles.verification_status 列从 verification_status 转换为 VerificationStatus
-- 2.1 删除默认值
ALTER TABLE public.creator_profiles
  ALTER COLUMN verification_status DROP DEFAULT;

-- 2.2 转换为 text（中间步骤）
ALTER TABLE public.creator_profiles
  ALTER COLUMN verification_status TYPE text;

-- 2.3 转换为 VerificationStatus 枚举类型
ALTER TABLE public.creator_profiles
  ALTER COLUMN verification_status TYPE "VerificationStatus" 
  USING verification_status::"VerificationStatus";

-- 2.4 恢复默认值
ALTER TABLE public.creator_profiles
  ALTER COLUMN verification_status SET DEFAULT 'PENDING'::"VerificationStatus";

-- 3. 添加注释
COMMENT ON TYPE "VerificationStatus" IS '创作者认证状态枚举：PENDING(待审核), APPROVED(已通过), REJECTED(已拒绝), EXPIRED(已过期)';

-- 提示信息
DO $$ BEGIN RAISE NOTICE '✅ VerificationStatus 枚举类型已修复'; END $$;

