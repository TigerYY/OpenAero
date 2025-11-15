# Solution 模型 Schema 迁移说明

## ✅ 已完成的 Schema 变更

### 1. Solution 模型新增字段

**文件**: `prisma/schema.prisma:224-225`

```prisma
// 创作者关联
creatorId String? // 创作者ID（关联到 CreatorProfile.id）
```

**说明**:
- 字段类型：`String?`（可选，允许历史数据为 null）
- 关联到：`CreatorProfile.id`
- 删除策略：`onDelete: SetNull`（当 CreatorProfile 被删除时，Solution 的 creatorId 设为 null，保留历史数据）

### 2. Solution 模型新增关联关系

**文件**: `prisma/schema.prisma:239`

```prisma
creator CreatorProfile? @relation(fields: [creatorId], references: [id], onDelete: SetNull)
```

**说明**:
- 关联类型：可选一对一（`CreatorProfile?`）
- 允许通过 `solution.creator` 访问完整的 CreatorProfile 信息
- 支持级联查询，如 `solution.creator.user`

### 3. CreatorProfile 模型新增反向关联

**文件**: `prisma/schema.prisma:104`

```prisma
solutions Solution[] // 创作者创建的方案列表
```

**说明**:
- 反向关联，允许通过 `creatorProfile.solutions` 查询该创作者的所有方案
- 自动维护，无需手动设置

## 📋 下一步操作

### 1. ✅ 数据库迁移已完成

**迁移方式**: 使用 SQL 迁移文件（绕过 Prisma 的跨 schema 检查）

```bash
# 已执行的迁移
node scripts/apply-solution-creator-migration.js
```

**迁移文件**: `supabase/migrations/009_add_solution_creator_relation.sql`

**迁移内容**:
- ✅ 添加 `creatorId UUID` 字段到 `solutions` 表
- ✅ 创建外键约束 `solutions_creatorId_fkey`
- ✅ 创建索引 `solutions_creatorId_idx`

**注意**: 
- 字段类型：数据库中使用 `UUID`，Prisma schema 中使用 `String?`（Prisma 会自动映射）
- 现有 Solution 记录的 `creatorId` 为 `null`（因为字段是可选的）
- 如果需要为现有数据填充 `creatorId`，需要运行数据迁移脚本

### 2. ✅ 更新 Prisma Client（已完成）

```bash
npx prisma generate
```

**注意**: 由于使用了 SQL 迁移而非 Prisma migrate，Prisma 可能不会自动检测到 schema 变更。如果遇到类型错误，可以：
1. 运行 `npx prisma db pull` 同步 schema（但可能遇到跨 schema 问题）
2. 或者直接使用现有的 Prisma schema（字段已定义）

### 3. 更新代码中的 TODO 注释

以下文件中有 TODO 注释需要更新：

**`src/app/api/solutions/route.ts`**:
- Line 92: `creatorId: null` → 使用实际的 `solution.creatorId`
- Line 93: `creatorName: 'Unknown'` → 通过 `solution.creator` 关联获取
- Line 117: `creatorId: null` → 使用实际的 `solution.creatorId`
- Line 183: 取消注释 `creatorId: creatorProfile.id`
- Line 215: `creatorId: null` → 使用实际的 `solution.creatorId`

**示例修复**:
```typescript
// 之前
creatorId: null, // TODO: 添加 creatorId 字段

// 之后
creatorId: solution.creatorId || null,
creatorName: solution.creator?.user 
  ? `${solution.creator.user.firstName} ${solution.creator.user.lastName}`.trim() 
  : 'Unknown',
```

### 4. 数据迁移脚本（可选）

如果需要为现有 Solution 记录填充 `creatorId`，可以创建迁移脚本：

```typescript
// scripts/migrate-solution-creator-id.ts
import { prisma } from '@/lib/prisma';

async function migrateSolutionCreatorId() {
  const solutions = await prisma.solution.findMany({
    where: { creatorId: null },
    include: { creator: true }
  });

  for (const solution of solutions) {
    // 根据业务逻辑确定如何关联 creatorId
    // 例如：通过其他字段或关联关系
    // await prisma.solution.update({
    //   where: { id: solution.id },
    //   data: { creatorId: '...' }
    // });
  }
}
```

## ⚠️ 注意事项

1. **向后兼容性**: `creatorId` 字段是可选的（`String?`），不会破坏现有代码
2. **历史数据**: 现有 Solution 记录的 `creatorId` 将为 `null`，需要根据业务需求决定是否迁移
3. **权限检查**: 代码中已有权限检查逻辑（如 `solution.creatorId === userId`），迁移后这些检查将正常工作
4. **关联查询**: 现在可以通过 `include: { creator: { include: { user: true } } }` 一次性获取完整的创作者信息

## ✅ 验证清单

- [x] Schema 格式正确（已通过 `prisma format`）
- [ ] 运行数据库迁移
- [ ] 更新 Prisma Client
- [ ] 更新代码中的 TODO 注释
- [ ] 测试创建新 Solution（验证 creatorId 正确设置）
- [ ] 测试查询 Solution（验证 creator 关联正常工作）
- [ ] 测试权限检查（验证 creatorId 比较逻辑）

## 🔗 相关文件

- `prisma/schema.prisma` - Schema 定义
- `src/app/api/solutions/route.ts` - 需要更新 TODO
- `src/app/api/solutions/[id]/route.ts` - 已使用 creatorId，无需修改
- `src/backend/solution/solution.service.ts` - 已使用 creatorId，无需修改

