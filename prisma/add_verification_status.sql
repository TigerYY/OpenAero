-- 添加 verification_status 列到 creator_profiles 表
-- 如果列不存在，则添加

-- 创建 VerificationStatus 枚举类型（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerificationStatus') THEN
        CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
    END IF;
END $$;

-- 添加 verification_status 列（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'creator_profiles' 
        AND column_name = 'verification_status'
    ) THEN
        ALTER TABLE creator_profiles 
        ADD COLUMN verification_status "VerificationStatus" NOT NULL DEFAULT 'PENDING';
        RAISE NOTICE '已成功添加 verification_status 列';
    ELSE
        RAISE NOTICE 'verification_status 列已存在';
    END IF;
END $$;

-- 添加 verified_at 列（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'creator_profiles' AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE creator_profiles ADD COLUMN verified_at TIMESTAMP;
        RAISE NOTICE '已成功添加 verified_at 列';
    ELSE
        RAISE NOTICE 'verified_at 列已存在';
    END IF;
END $$;

-- 添加 rejection_reason 列（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'creator_profiles' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE creator_profiles ADD COLUMN rejection_reason TEXT;
        RAISE NOTICE '已成功添加 rejection_reason 列';
    ELSE
        RAISE NOTICE 'rejection_reason 列已存在';
    END IF;
END $$;
