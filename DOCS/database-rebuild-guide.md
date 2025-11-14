# 数据库重建指南

## 📋 概述

本指南将帮助您重建 Supabase 数据库，确保与 Prisma schema 完全同步，并正确集成前端应用。

## 🎯 目标

- 重建数据库结构，确保与 Prisma schema 一致
- 创建所有必需的表、枚举和关系
- 确保 Supabase RLS 策略正确配置
- 验证数据库与前端的集成

## ⚠️ 重要提示

**在执行重建之前，请确保：**

1. ✅ 已备份重要数据（如果有）
2. ✅ 已配置正确的环境变量（`.env.local`）
3. ✅ 已连接到正确的 Supabase 项目
4. ✅ 了解重建会删除不匹配的表和列

## 🚀 快速开始

### 方法 1: 使用自动重建脚本（推荐）

```bash
# 运行数据库重建脚本
npm run db:rebuild
```

这个脚本会：
1. 测试数据库连接
2. 检查现有表和枚举
3. 推送 Prisma Schema 到 Supabase
4. 生成 Prisma Client
5. 验证关键表是否存在

### 方法 2: 手动步骤

#### 步骤 1: 测试数据库连接

```bash
# 确保 DATABASE_URL 已配置
cat .env.local | grep DATABASE_URL

# 测试连接
node scripts/test-database-connection.js
```

#### 步骤 2: 推送 Prisma Schema

```bash
# 推送 schema（会删除不匹配的表和列）
npx prisma db push --accept-data-loss

# 或者使用交互式推送
npx prisma db push
```

#### 步骤 3: 生成 Prisma Client

```bash
npm run db:generate
```

#### 步骤 4: 验证数据库结构

```bash
# 打开 Prisma Studio 查看数据库
npm run db:studio
```

## 📊 验证步骤

### 1. 检查关键表

运行以下命令检查关键表是否存在：

```sql
-- 在 Supabase SQL Editor 中执行
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

应该看到以下关键表：
- `user_profiles`
- `creator_profiles`
- `solutions`
- `products`
- `orders`
- `order_items`
- `solution_reviews`
- `product_reviews`
- `audit_logs`
- 等等...

### 2. 检查枚举类型

```sql
SELECT typname 
FROM pg_type 
WHERE typtype = 'e' 
AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY typname;
```

应该看到：
- `UserRole`
- `UserStatus`
- `SolutionStatus`
- `OrderStatus`
- `PaymentStatus`
- `ProductStatus`
- `ReviewStatus`
- 等等...

### 3. 检查关系和外键

```sql
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

## 🔐 Supabase RLS 策略

重建数据库后，需要确保 RLS 策略正确配置。运行以下迁移：

### 1. 用户资料 RLS 策略

```bash
# 在 Supabase Dashboard 的 SQL Editor 中执行
# 或使用 Supabase CLI
supabase db push
```

### 2. 检查现有 RLS 策略

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 3. 应用 RLS 迁移

如果项目中有 RLS 迁移文件，按顺序执行：

```bash
# 执行 Supabase 迁移
# 在 Supabase Dashboard 的 SQL Editor 中按顺序执行：
# 1. supabase/migrations/001_create_user_profiles.sql
# 2. supabase/migrations/004_fix_user_profiles_rls_recursion.sql
# 3. supabase/migrations/005_create_avatars_storage_policies.sql
# 等等...
```

## 🧪 测试数据库集成

### 1. 测试 Prisma 连接

```bash
node scripts/test-database-connection.js
```

### 2. 测试 API 端点

```bash
# 启动开发服务器
npm run dev

# 测试用户 API
curl http://localhost:3000/api/users/me

# 测试解决方案 API
curl http://localhost:3000/api/solutions
```

### 3. 测试前端功能

1. 访问 `http://localhost:3000`
2. 尝试注册/登录
3. 查看个人资料页面
4. 浏览解决方案列表

## 🔧 故障排除

### 问题 1: 连接失败

**错误**: `Error: connect ECONNREFUSED`

**解决方案**:
1. 检查 `DATABASE_URL` 是否正确
2. 确认 Supabase 项目状态正常
3. 检查网络连接

### 问题 2: 表不存在

**错误**: `Table 'xxx' does not exist`

**解决方案**:
1. 运行 `npm run db:rebuild`
2. 检查 Prisma schema 是否正确
3. 确认迁移已执行

### 问题 3: 枚举类型不存在

**错误**: `type "xxx" does not exist`

**解决方案**:
1. 运行 `npx prisma db push`
2. 检查枚举定义是否正确
3. 手动创建枚举（参考 `supabase/migrations/006_create_solution_status_enum.sql`）

### 问题 4: RLS 策略错误

**错误**: `permission denied for table`

**解决方案**:
1. 检查 RLS 策略是否正确配置
2. 确认用户有正确的权限
3. 运行 RLS 迁移文件

## 📝 后续步骤

重建完成后：

1. ✅ **验证所有表已创建**
2. ✅ **检查 RLS 策略**
3. ✅ **测试用户注册/登录**
4. ✅ **测试 API 端点**
5. ✅ **测试前端功能**

## 🔗 相关资源

- [Prisma 文档](https://www.prisma.io/docs)
- [Supabase 文档](https://supabase.com/docs)
- [数据库设置指南](./DATABASE_SETUP.md)
- [迁移指南](./MIGRATION_GUIDE.md)

## 💡 提示

- 使用 `npm run db:studio` 可视化查看数据库
- 定期备份数据库（特别是在生产环境）
- 使用 Supabase Dashboard 监控数据库状态
- 保持 Prisma schema 和数据库同步

