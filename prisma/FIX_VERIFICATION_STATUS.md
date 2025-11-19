# 修复 creator_profiles 表缺失 verification_status 列

## 问题描述

在申请"创作者"时，系统报错：
```
The column `creator_profiles.verification_status` does not exist in the current database.
```

这是因为数据库 schema 和 Prisma schema 不同步，缺少 `verification_status` 列。

## 解决方案

### 方法 1：在 Supabase Dashboard 中运行 SQL（推荐）

1. 打开 Supabase Dashboard：https://supabase.com/dashboard
2. 选择你的项目
3. 进入 **SQL Editor**
4. 复制并粘贴以下 SQL 脚本：

```sql
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
```

5. 点击 **Run** 执行 SQL
6. 确认执行成功

### 方法 2：使用 Prisma Migrate（需要更新 DIRECT_URL）

如果你有 Primary Database 的连接字符串（端口 5432，不是 Session Pooler），可以：

1. 更新 `.env.local` 中的 `DIRECT_URL` 为 Primary Database 连接字符串：
   ```env
   DIRECT_URL="postgresql://postgres.cardynuoazvaytvinxvm:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
   ```

2. 运行迁移：
   ```bash
   npx prisma migrate dev --name add_verification_status
   ```

## 验证

运行 SQL 后，可以验证列是否已添加：

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'creator_profiles' 
AND column_name IN ('verification_status', 'verified_at', 'rejection_reason');
```

应该看到三列都已存在。

## 注意事项

- Session Pooler（端口 6543）不支持 DDL 操作（如 ALTER TABLE）
- 必须使用 Primary Database（端口 5432）或 Supabase Dashboard SQL Editor 来运行 DDL
- SQL 脚本使用了 `DO $$ ... END $$;` 块来安全地检查列是否存在，可以多次运行而不会出错

