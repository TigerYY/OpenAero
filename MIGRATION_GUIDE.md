# Supabase Auth 迁移快速指南

**目标**: 统一使用 Supabase Auth 进行用户管理  
**状态**: ✅ 代码修复完成，等待数据库迁移

---

## 🚀 快速开始 (5 分钟)

### 步骤 1: 备份数据库

```bash
# 备份当前数据库 (重要!)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 步骤 2: 执行数据库迁移

```bash
# 方式 1: 使用自动化脚本 (推荐)
./scripts/run-supabase-migrations.sh

# 方式 2: 手动执行
psql $DATABASE_URL -f supabase/migrations/001_create_user_profiles.sql
psql $DATABASE_URL -f supabase/migrations/002_update_creator_profiles.sql
psql $DATABASE_URL -f supabase/migrations/003_update_other_tables.sql
```

### 步骤 3: 更新 Prisma 客户端

```bash
# 生成新的 Prisma 客户端
npx prisma generate

# (可选) 验证 Schema
npx prisma db pull
```

### 步骤 4: 启动应用

```bash
npm run dev
```

### 步骤 5: 测试功能

访问以下页面测试:
- ✅ 用户注册: http://localhost:3000/register
- ✅ 用户登录: http://localhost:3000/login
- ✅ 个人资料: http://localhost:3000/profile

---

## 📋 核心变更

### 1. 数据库结构

**旧结构** ❌:
```
users 表 (Prisma)
├── id (cuid)
├── supabaseId (引用 auth.users)
├── email
└── ...
```

**新结构** ✅:
```
auth.users 表 (Supabase)
├── id (uuid)
├── email
└── ...

user_profiles 表 (应用)
├── id (uuid)
├── user_id → auth.users.id
├── first_name
├── last_name
└── ...
```

### 2. 字段命名

- ❌ 旧: `userId`, `firstName`, `createdAt` (camelCase)
- ✅ 新: `user_id`, `first_name`, `created_at` (snake_case)

### 3. 登录方式

**旧方式** ❌:
```typescript
const response = await fetch('/api/auth/login', {...});
```

**新方式** ✅:
```typescript
const { signIn } = useAuth();
await signIn(email, password);
```

---

## 🔍 验证清单

执行迁移后，请验证以下内容:

### 数据库验证

```sql
-- 1. 检查 user_profiles 表是否创建
SELECT * FROM user_profiles LIMIT 1;

-- 2. 检查触发器是否工作
-- 注册一个新用户，然后查询
SELECT * FROM user_profiles WHERE user_id = 'new-user-uuid';

-- 3. 检查 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- 4. 检查索引
SELECT indexname FROM pg_indexes WHERE tablename = 'user_profiles';
```

### 应用验证

- [ ] ✅ 可以注册新用户
- [ ] ✅ `user_profiles` 自动创建
- [ ] ✅ 可以登录
- [ ] ✅ 可以查看个人资料
- [ ] ✅ 可以更新个人资料
- [ ] ✅ 权限检查正常
- [ ] ✅ 创作者功能正常

---

## ⚠️ 常见问题

### Q1: 迁移失败怎么办?

**A**: 恢复备份
```bash
psql $DATABASE_URL < backup_20251112_123456.sql
```

### Q2: Prisma 生成报错?

**A**: 清除缓存后重新生成
```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### Q3: 旧数据如何迁移?

**A**: 迁移脚本中包含数据迁移逻辑 (已注释)
- 取消注释 `001_create_user_profiles.sql` 末尾的数据迁移部分
- 根据实际情况调整字段映射

### Q4: RLS 策略不生效?

**A**: 检查 Supabase 设置
```sql
-- 确认 RLS 已启用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 查看策略
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

---

## 📞 需要帮助?

查看详细文档:
- **完整报告**: `SUPABASE_AUTH_UNIFICATION_REPORT.md`
- **集成指南**: `README_SUPABASE.md`
- **Supabase 文档**: https://supabase.com/docs

---

**迁移状态**: ✅ 代码已准备好  
**下一步**: 执行数据库迁移
