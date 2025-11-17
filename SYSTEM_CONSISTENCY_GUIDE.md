# 系统一致性诊断与修复指南

## 📋 概述

本指南用于确保 Prisma Schema、Supabase 数据库、API 路由和前端代码之间的一致性。

---

## 🔍 当前问题诊断结果

### 1. **Prisma Schema vs 数据库结构**

#### 问题：roles 字段不一致
- **Prisma Schema**: 使用 `roles UserRole[] @default([USER])` (数组)
- **数据库实际**: 某些迁移可能使用 `role TEXT` (单值)

#### 解决方案：
```bash
# 运行多角色迁移
npx supabase db push --file supabase/migrations/015_migrate_to_multi_roles.sql
```

---

### 2. **Prisma Client 生成状态**

#### 问题：Prisma Client 可能与 schema 不同步

#### 解决方案：
```bash
# 重新生成 Prisma Client
npm run db:generate

# 如果有错误，先清理再生成
rm -rf node_modules/.prisma
npm run db:generate
```

---

### 3. **API 路由一致性**

#### 问题：混用 Prisma Client 和 Supabase 客户端

#### 当前状态：
- ✅ 使用 Supabase: `auth`, `admin/users`, `solutions`
- ⚠️  使用 Prisma: `orders`, `admin/solutions`

#### 建议：统一使用 Supabase 客户端

**原因：**
1. Supabase 提供 Row Level Security (RLS)
2. 更好的实时功能
3. 减少依赖复杂度
4. Auth 集成更简单

#### 迁移步骤：

**示例：将 orders API 从 Prisma 迁移到 Supabase**

```typescript
// ❌ 之前 (Prisma)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const orders = await prisma.order.findMany({
  where: { user_id: userId },
  include: { orderItems: true }
});

// ✅ 之后 (Supabase)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);

const { data: orders } = await supabase
  .from('orders')
  .select('*, order_items(*)')
  .eq('user_id', userId);
```

---

### 4. **前端类型定义**

#### 问题：缺少类型文件或类型不一致

#### 解决方案：创建统一的类型定义

```bash
# 创建 types 目录
mkdir -p src/types

# 生成类型文件
npx tsx scripts/generate-frontend-types.ts
```

**手动创建示例：**

```typescript
// src/types/user.ts
export type UserRole = 
  | 'USER' 
  | 'CREATOR' 
  | 'REVIEWER' 
  | 'FACTORY_MANAGER' 
  | 'ADMIN' 
  | 'SUPER_ADMIN';

export interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar?: string;
  bio?: string;
  roles: UserRole[];  // ✅ 使用数组
  permissions: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
  created_at: string;
  updated_at: string;
}
```

---

## 🔧 完整修复流程

### 步骤 1: 备份当前状态

```bash
# 备份数据库
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# 提交当前代码
git add .
git commit -m "backup: 系统一致性修复前备份"
```

### 步骤 2: 运行诊断

```bash
npx tsx scripts/diagnose-system-consistency.ts
```

### 步骤 3: 修复数据库结构

```bash
# 1. 运行所有迁移
for file in supabase/migrations/*.sql; do
  echo "Running: $file"
  npx supabase db push --file "$file"
done

# 2. 特别注意多角色迁移
npx supabase db push --file supabase/migrations/015_migrate_to_multi_roles.sql

# 3. 验证表结构
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1);
  
  if (data && data[0]) {
    console.log('user_profiles 列:', Object.keys(data[0]));
  }
}
check();
"
```

### 步骤 4: 更新 Prisma Schema

检查 `prisma/schema.prisma` 是否与数据库一致：

```prisma
model UserProfile {
  id      String @id @default(uuid())
  user_id String @unique @map("user_id")
  
  // ✅ 确保使用 roles 数组
  roles       UserRole[] @default([USER])
  
  // ❌ 删除或注释掉旧的 role 字段
  // role        UserRole   @default(USER)
  
  @@map("user_profiles")
}
```

### 步骤 5: 重新生成 Prisma Client

```bash
npm run db:generate
```

### 步骤 6: 更新 API 路由

统一使用 Supabase 客户端。参考 `src/app/api/admin/users/route.ts` 的实现。

### 步骤 7: 创建前端类型

```bash
npx tsx scripts/generate-frontend-types.ts
```

### 步骤 8: 测试验证

```bash
# 1. 运行测试
npm test

# 2. 启动开发服务器
npm run dev

# 3. 手动测试关键功能
# - 用户登录
# - 创建解决方案
# - 提交订单
# - 管理员操作
```

---

## 📊 验证清单

### 数据库层面
- [ ] 所有迁移已执行
- [ ] `user_profiles` 表有 `roles` 数组列
- [ ] 所有外键关系正确
- [ ] RLS 策略已启用

### Prisma 层面
- [ ] Schema 与数据库结构一致
- [ ] Prisma Client 已重新生成
- [ ] 可以成功连接数据库
- [ ] 查询操作正常

### API 层面
- [ ] 所有 API 路由可访问
- [ ] 统一使用 Supabase 客户端
- [ ] 错误处理完善
- [ ] 权限验证正确

### 前端层面
- [ ] 类型定义与后端一致
- [ ] API 调用使用正确的字段名
- [ ] 角色检查使用 `roles` 数组
- [ ] UI 显示正确

---

## 🎯 最佳实践

### 1. 使用 Supabase 作为主要数据访问方式

```typescript
// ✅ 推荐
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data } = await supabase.from('users').select('*');
  return Response.json(data);
}
```

### 2. Prisma 仅用于类型和迁移

```typescript
// ✅ 使用 Prisma 类型
import { UserRole } from '@prisma/client';

// ❌ 不要直接使用 Prisma Client 查询
// const users = await prisma.user.findMany();

// ✅ 使用 Supabase 查询
const { data: users } = await supabase.from('user_profiles').select('*');
```

### 3. 保持类型一致性

```typescript
// src/types/database.ts
import { Database } from '@/lib/supabase/database.types';

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];
```

---

## 🚨 常见问题

### Q1: Prisma Client 与数据库不匹配

**症状：** `Unknown arg` 或 `Unknown field` 错误

**解决：**
```bash
rm -rf node_modules/.prisma
npm run db:generate
```

### Q2: Supabase 查询权限错误

**症状：** `permission denied for schema public`

**解决：**
```bash
# 检查 RLS 策略
npx supabase db push --file supabase/migrations/004_fix_user_profiles_rls_recursion.sql
```

### Q3: roles vs role 混乱

**症状：** 前端显示角色错误

**解决：**
```typescript
// ❌ 错误
if (user.role === 'ADMIN')

// ✅ 正确
if (user.roles?.includes('ADMIN'))
```

---

## 📚 相关文档

- [Supabase 文档](https://supabase.com/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [项目架构文档](./docs/ARCHITECTURE.md)
- [数据库文档](./docs/DATABASE_SCHEMA.md)
- [API 文档](./docs/API_DOCUMENTATION.md)

---

## 🔄 持续维护

### 每次数据库更改后：

1. 更新 Supabase 迁移文件
2. 更新 Prisma Schema
3. 重新生成 Prisma Client
4. 更新前端类型定义
5. 更新 API 路由
6. 运行诊断脚本验证
7. 更新文档

### 定期检查：

```bash
# 每周运行一次
npx tsx scripts/diagnose-system-consistency.ts

# 检查类型覆盖率
npm run type-check
```

---

## 📞 获取帮助

如果遇到问题：

1. 查看 `diagnostic-report.txt`
2. 检查 `logs/` 目录下的日志
3. 运行 `npm run dev` 查看控制台错误
4. 参考相关文档

---

**最后更新：** 2025-11-16
**维护者：** OpenAero Team
