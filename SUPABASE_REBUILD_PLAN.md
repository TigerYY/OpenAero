# 🔧 Supabase后端重建方案

## 📊 当前问题分析

### 严重程度: 🔴 高 - 建议完全重建

### 问题清单
1. **数据库表严重缺失**: 仅有2张表,需要40+张表
2. **Schema文件不一致**: 
   - 实际使用: `schema-simple.prisma` (2个模型)
   - 迁移文件: 基于 `schema-postgres.prisma` (40+个模型)
   - API代码: 引用完整模型
3. **认证系统混乱**: Supabase Auth vs 自定义Users表
4. **外键关系缺失**: 无法保证数据完整性
5. **数据库连接不稳定**: 网络间歇性问题

## 🎯 重建目标

### 1. 建立完整的数据模型
- ✅ 用户认证 (基于Supabase Auth)
- ✅ 用户扩展资料 (user_profiles)
- ✅ 创作者系统 (creator_profiles)
- ✅ 解决方案管理 (solutions + versions + files)
- ✅ 订单与支付
- ✅ 评论与评分
- ✅ 通知系统
- ✅ 文件管理
- ✅ 审核流程

### 2. 配置Row Level Security (RLS)
- 用户只能访问自己的数据
- 创作者可管理自己的解决方案
- 管理员拥有完整权限

### 3. 设置正确的索引和外键

## 📝 重建步骤

### Phase 1: 备份现有数据 (如有)
```bash
# 导出现有数据
pg_dump -h aws-1-us-east-2.pooler.supabase.com \
  -U postgres.cardynuoazvaytvinxvm \
  -d postgres \
  --data-only \
  -t solutions -t user_profiles \
  > backup_$(date +%Y%m%d).sql
```

### Phase 2: 准备完整Schema
```bash
# 使用完整的PostgreSQL schema
cp prisma/schema-postgres.prisma prisma/schema.prisma

# 调整为Supabase兼容
# 1. 添加对auth.users的引用
# 2. 配置UserProfile扩展auth用户
# 3. 确保所有枚举类型正确
```

### Phase 3: 重置数据库
```bash
# ⚠️ 警告: 这将删除所有现有数据!
# 在Supabase控制台执行:
# Settings > Database > Reset Database Password (to trigger reset)

# 或使用Prisma
npx prisma migrate reset --force
```

### Phase 4: 创建初始迁移
```bash
# 生成迁移文件
npx prisma migrate dev --name init_complete_schema

# 应用到数据库
npx prisma migrate deploy
```

### Phase 5: 配置Supabase特定功能

#### 5.1 启用RLS
```sql
-- 在Supabase SQL Editor中执行
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ... 其他表
```

#### 5.2 创建RLS策略
```sql
-- 用户只能读取自己的profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid()::text = user_id);

-- 用户可以更新自己的profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid()::text = user_id);

-- 创作者可以管理自己的solutions
CREATE POLICY "Creators can manage own solutions"
  ON solutions FOR ALL
  USING (auth.uid()::text IN (
    SELECT user_id FROM user_profiles 
    WHERE id = solutions.creatorId
  ));

-- 所有人可以查看已发布的solutions
CREATE POLICY "Anyone can view published solutions"
  ON solutions FOR SELECT
  USING (status = 'PUBLISHED');
```

#### 5.3 创建数据库函数
```sql
-- 自动创建用户profile的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, user_id, created_at, updated_at)
  VALUES (gen_random_uuid(), new.id, now(), now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 在auth.users创建时触发
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Phase 6: 恢复数据 (如需要)
```bash
# 恢复备份的数据
psql -h aws-1-us-east-2.pooler.supabase.com \
  -U postgres.cardynuoazvaytvinxvm \
  -d postgres \
  < backup_YYYYMMDD.sql
```

### Phase 7: 更新应用代码

#### 7.1 统一Schema文件
```bash
# 删除旧的简化schema
rm prisma/schema-simple.prisma

# 确保使用完整schema
git mv prisma/schema-postgres.prisma prisma/schema.prisma
```

#### 7.2 更新认证逻辑
- 确保使用Supabase Auth作为主要认证
- user_profiles作为扩展数据存储
- 所有API通过auth.uid()获取当前用户

#### 7.3 重新生成Prisma Client
```bash
npx prisma generate
```

### Phase 8: 测试验证

#### 8.1 数据库结构验证
```bash
# 检查所有表是否创建
npx prisma db pull

# 验证外键关系
npx prisma validate
```

#### 8.2 功能测试清单
- [ ] 用户注册/登录
- [ ] 创建/编辑用户资料
- [ ] 创作者申请
- [ ] 创建解决方案
- [ ] 文件上传
- [ ] 创建订单
- [ ] 支付流程
- [ ] 评论评分
- [ ] 通知接收

## ⚡ 快速执行脚本

创建 `scripts/rebuild-supabase.sh`:

```bash
#!/bin/bash
set -e

echo "🔧 开始重建Supabase后端..."

# 1. 备份
echo "📦 备份现有数据..."
./scripts/backup-database.sh

# 2. 使用完整schema
echo "📝 切换到完整schema..."
cp prisma/schema-postgres.prisma prisma/schema.prisma

# 3. 重置并迁移
echo "🗄️ 重置数据库..."
DATABASE_URL="$DATABASE_URL" npx prisma migrate reset --force

# 4. 应用RLS策略
echo "🔒 配置安全策略..."
psql "$DATABASE_URL" -f scripts/setup-rls.sql

# 5. 生成客户端
echo "⚙️ 生成Prisma Client..."
npx prisma generate

# 6. 运行测试
echo "🧪 运行测试..."
npm run test:db

echo "✅ 重建完成!"
```

## 🎯 关键配置调整

### Prisma Schema调整

需要在schema.prisma中添加:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// 引用Supabase Auth Users
model UserProfile {
  id      String @id @default(uuid())
  user_id String @unique // 关联到 auth.users.id
  
  // ... 其他字段
  
  @@map("user_profiles")
}

// 确保所有需要用户关联的表都使用 user_id
```

### 环境变量配置

确保 `.env.local` 包含:

```env
# 使用Connection Pooler (Session Mode)
DATABASE_URL="postgresql://postgres.cardynuoazvaytvinxvm:PASSWORD@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# 使用Direct Connection (用于迁移)
DIRECT_URL="postgresql://postgres.cardynuoazvaytvinxvm:PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

# Supabase配置
NEXT_PUBLIC_SUPABASE_URL="https://cardynuoazvaytvinxvm.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## 🚨 注意事项

1. **数据丢失风险**: 重建将清空所有数据,务必先备份
2. **停机时间**: 重建期间应用将无法访问数据库
3. **测试环境**: 建议先在测试环境执行完整流程
4. **回滚计划**: 准备好回滚脚本以防出现问题

## 📅 预计时间

- 备份数据: 5分钟
- Schema准备: 30分钟
- 数据库重置: 10分钟
- RLS配置: 45分钟
- 代码调整: 2小时
- 测试验证: 2小时

**总计: 约6小时**

## ✅ 完成标准

- [ ] 所有40+张表正确创建
- [ ] 外键关系完整
- [ ] RLS策略生效
- [ ] Prisma schema与数据库同步
- [ ] 所有API端点正常工作
- [ ] 测试套件全部通过
- [ ] 文档更新完成

## 🔄 替代方案 (不推荐)

如果不想完全重建,可以尝试:
1. 逐步添加缺失的表
2. 手动执行迁移SQL
3. 调整代码以适配简化schema

**缺点**: 
- 耗时更长
- 容易遗漏
- 累积技术债务
- 难以保证一致性

---

**建议**: 考虑到问题的严重性和复杂度,**强烈推荐完全重建**。一次性解决所有问题,避免后续更多麻烦。
