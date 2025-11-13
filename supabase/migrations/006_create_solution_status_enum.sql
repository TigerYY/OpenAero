-- ============================================
-- 创建缺失的枚举类型
-- 修复 Prisma schema 中定义的枚举类型在数据库中不存在的问题
-- ============================================

-- 创建 SolutionStatus 枚举类型
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

-- 确保枚举类型在 public schema 中
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SolutionStatus' AND typnamespace != (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER TYPE "SolutionStatus" SET SCHEMA public;
    END IF;
END $$;

-- 创建其他可能缺失的枚举类型
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
        CREATE TYPE "OrderStatus" AS ENUM (
            'PENDING',
            'CONFIRMED',
            'PROCESSING',
            'SHIPPED',
            'DELIVERED',
            'CANCELLED',
            'REFUNDED'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
        CREATE TYPE "PaymentMethod" AS ENUM (
            'CREDIT_CARD',
            'PAYPAL',
            'BANK_TRANSFER',
            'ALIPAY',
            'WECHAT_PAY'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
        CREATE TYPE "PaymentStatus" AS ENUM (
            'PENDING',
            'PROCESSING',
            'COMPLETED',
            'FAILED',
            'CANCELLED',
            'REFUNDED'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStatus') THEN
        CREATE TYPE "ProductStatus" AS ENUM (
            'DRAFT',
            'PENDING',
            'APPROVED',
            'PUBLISHED',
            'ARCHIVED',
            'DISCONTINUED'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewStatus') THEN
        CREATE TYPE "ReviewStatus" AS ENUM (
            'PENDING',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewDecision') THEN
        CREATE TYPE "ReviewDecision" AS ENUM (
            'APPROVED',
            'REJECTED',
            'NEEDS_REVISION',
            'PENDING'
        );
    END IF;
END $$;

-- 注释：其他枚举类型（如 UserRole, UserStatus 等）应该在之前的迁移中已创建
