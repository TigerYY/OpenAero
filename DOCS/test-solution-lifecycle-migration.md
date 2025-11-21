# 测试解决方案全周期管理流程迁移

## 📋 概述

本文档提供测试数据库迁移和后端 API 的完整指南。

## ⚠️ 前置条件

1. **环境变量配置**
   - 确保 `.env.local` 文件存在
   - 配置 `DATABASE_URL`（Supabase 数据库连接字符串）
   - 可选：配置 `NEXT_PUBLIC_APP_URL`（默认: `http://localhost:3000`）

2. **数据库访问**
   - 确保可以访问 Supabase 数据库
   - 有执行 SQL 的权限

3. **开发服务器**（用于 API 测试）
   - 确保可以启动 Next.js 开发服务器

## 🚀 快速开始

### 步骤 1: 执行数据库迁移

#### 方式 A: 使用 Supabase Dashboard（推荐用于测试）

1. 打开 Supabase Dashboard
2. 进入 **SQL Editor**
3. 创建新查询
4. 复制 `supabase/migrations/016_upgrade_solution_lifecycle.sql` 的全部内容
5. 粘贴到 SQL Editor
6. 点击 **Run** 执行

**预期输出**:
```
✅ SolutionStatus 枚举已更新 (新增 2 个状态)
✅ solutions 表升级字段已添加 (共 4 个)
✅ solution_publishing 表已创建
🎉 迁移完成！
```

#### 方式 B: 使用 Supabase CLI

```bash
# 确保已链接项目
supabase link --project-ref YOUR_PROJECT_REF

# 推送迁移
supabase db push
```

### 步骤 2: 验证数据库迁移

**确保环境变量已配置**:
```bash
# 检查 .env.local 是否存在
ls -la .env.local

# 或手动设置环境变量
export DATABASE_URL="your-database-url"
```

运行验证脚本：

```bash
node scripts/test-solution-lifecycle-migration.js
```

**预期输出**:
```
🔍 开始测试解决方案全周期管理流程迁移...

✅ 测试1: 检查 SolutionStatus 枚举
   枚举值: DRAFT, PENDING_REVIEW, APPROVED, READY_TO_PUBLISH, REJECTED, PUBLISHED, SUSPENDED, ARCHIVED
   ✅ 新状态已添加: READY_TO_PUBLISH, SUSPENDED

✅ 测试2: 检查 solutions 表升级字段
   找到的字段: upgraded_from_id, upgraded_from_version, upgrade_notes, is_upgrade
   ✅ 所有升级字段已添加

✅ 测试3: 检查 solution_publishing 表
   ✅ solution_publishing 表存在
   ✅ 关键字段完整

...

🎉 迁移验证通过！所有检查项都成功。
```

### 步骤 3: 生成 Prisma Client

```bash
npx prisma generate
```

### 步骤 4: 测试后端 API

#### 4.1 启动开发服务器

```bash
npm run dev
```

#### 4.2 运行 API 测试脚本

在另一个终端窗口：

```bash
node scripts/test-solution-lifecycle-api.js
```

**注意**: 这些测试需要：
- 服务器正在运行（`npm run dev`）
- 有效的认证 token（对于需要认证的 API）
- 测试数据（方案、用户等）

**预期输出**:
```
🔍 开始测试解决方案全周期管理流程 API...

📍 基础 URL: http://localhost:3000

⚠️  注意: 这些测试需要有效的认证和测试数据
   对于需要认证的 API，401/403 响应是预期的（如果未登录）

============================================================
📋 测试管理员 API
============================================================

📡 测试: 上架优化 API
   PUT /api/admin/solutions/test-solution-id/optimize
   ⚠️  状态码: 401
   错误: 未授权访问
   ⏭️  跳过 (需要认证): 上架优化 API: 需要认证（预期）

...

🎉 API 测试完成！

💡 提示:
   - 如果需要完整测试，请先登录并获取认证 token
   - 确保有测试数据（方案、用户等）
   - 检查服务器日志以获取更多信息
```

#### 4.3 手动测试 API（使用 Postman 或 curl）

##### 测试上架优化 API

```bash
# 需要管理员认证
curl -X PUT http://localhost:3000/api/admin/solutions/{solution-id}/optimize \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "publishDescription": "测试上架说明",
    "mediaLinks": [
      {
        "type": "VIDEO",
        "title": "演示视频",
        "url": "https://example.com/video.mp4"
      }
    ],
    "isFeatured": true
  }'
```

##### 测试方案升级 API

```bash
# 需要创作者认证
curl -X POST http://localhost:3000/api/solutions/{solution-id}/upgrade \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "title": "升级版本方案",
    "upgradeNotes": "基于原方案的升级版本",
    "upgradeAssets": true,
    "upgradeBom": true
  }'
```

## 🔍 验证清单

### 数据库验证

- [ ] SolutionStatus 枚举包含 `READY_TO_PUBLISH` 和 `SUSPENDED`
- [ ] `solutions` 表包含升级相关字段
- [ ] `solution_publishing` 表已创建
- [ ] 外键约束正确
- [ ] 索引已创建

### API 验证

- [ ] `PUT /api/admin/solutions/[id]/optimize` 端点存在
- [ ] `GET /api/admin/solutions/[id]/preview` 端点存在
- [ ] `POST /api/admin/solutions/batch-publish` 端点存在
- [ ] `POST /api/solutions/[id]/upgrade` 端点存在
- [ ] `GET /api/solutions/[id]/upgrade-history` 端点存在
- [ ] `POST /api/solutions/[id]/publish` 支持新状态转换

## 🐛 故障排除

### 问题 1: DATABASE_URL 未设置

**错误**: `Environment variable not found: DATABASE_URL`

**解决方案**:
```bash
# 检查 .env.local 文件
cat .env.local | grep DATABASE_URL

# 或手动设置
export DATABASE_URL="your-database-url"
node scripts/test-solution-lifecycle-migration.js
```

### 问题 2: 枚举值添加失败

**错误**: `ALTER TYPE ... ADD VALUE` 失败

**解决方案**:
- 确保数据库连接正常
- 检查是否有其他迁移正在执行
- 尝试手动执行 SQL 语句

### 问题 3: 表已存在错误

**错误**: `relation "solution_publishing" already exists`

**解决方案**:
- 检查表是否真的存在
- 如果存在但结构不同，先删除表再重新创建
- 或使用 `CREATE TABLE IF NOT EXISTS`

### 问题 4: API 返回 401/403

**原因**: 需要认证

**解决方案**:
- 确保已登录
- 检查认证 token 是否有效
- 验证用户角色（管理员/创作者）

### 问题 5: Prisma Client 类型错误

**错误**: `Type 'READY_TO_PUBLISH' is not assignable to type 'SolutionStatus'`

**解决方案**:
```bash
# 重新生成 Prisma Client
npx prisma generate

# 重启 TypeScript 服务器（在 VS Code 中）
# Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

### 问题 6: 服务器未运行

**错误**: `ECONNREFUSED` 或 `fetch failed`

**解决方案**:
```bash
# 确保开发服务器正在运行
npm run dev

# 检查端口是否正确
lsof -i :3000
```

## 📝 回滚

如果需要回滚迁移：

1. 在 Supabase Dashboard 的 SQL Editor 中执行：
   ```sql
   -- 复制 supabase/migrations/016_upgrade_solution_lifecycle_rollback.sql 的内容
   -- 粘贴并执行
   ```

2. 重新生成 Prisma Client：
   ```bash
   npx prisma generate
   ```

**⚠️ 警告**: 回滚会删除所有相关数据，请确保已备份！

## 🎯 下一步

迁移验证通过后，可以：

1. 继续实施前端页面
2. 编写单元测试和集成测试
3. 更新文档
4. 部署到生产环境

## 📚 相关文档

- [OpenSpec 提案](../openspec/changes/upgrade-solution-lifecycle/proposal.md)
- [设计文档](../openspec/changes/upgrade-solution-lifecycle/design.md)
- [任务清单](../openspec/changes/upgrade-solution-lifecycle/tasks.md)
