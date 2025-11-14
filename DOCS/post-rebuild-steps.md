# 数据库重建后的后续步骤

## ✅ 数据库重建已完成

数据库结构已成功重建，现在需要完成以下步骤以确保系统正常运行。

## 📋 步骤 1: 验证数据库结构

### 1.1 检查 Supabase Dashboard

1. 打开 [Supabase Dashboard](https://app.supabase.com)
2. 选择您的项目
3. 进入 **Table Editor**
4. 验证以下关键表是否存在：

**必需的表：**
- ✅ `user_profiles` - 用户资料表
- ✅ `creator_profiles` - 创作者资料表
- ✅ `solutions` - 解决方案表
- ✅ `products` - 产品表
- ✅ `orders` - 订单表
- ✅ `order_items` - 订单项表
- ✅ `solution_reviews` - 方案审核表
- ✅ `product_reviews` - 产品评价表
- ✅ `audit_logs` - 审计日志表

### 1.2 检查枚举类型

在 **SQL Editor** 中执行：

```sql
SELECT typname 
FROM pg_type 
WHERE typtype = 'e' 
AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY typname;
```

应该看到以下枚举：
- `UserRole`
- `UserStatus`
- `SolutionStatus`
- `OrderStatus`
- `PaymentStatus`
- `ProductStatus`
- `ReviewStatus`
- `ReviewDecision`
- 等等...

## 🔐 步骤 2: 应用 RLS 策略

### 2.1 使用 Supabase Dashboard（推荐）

1. 打开 Supabase Dashboard
2. 进入 **SQL Editor**
3. 按顺序执行以下迁移文件：

**执行顺序：**

1. **用户资料 RLS 修复**
   ```sql
   -- 文件: supabase/migrations/004_fix_user_profiles_rls_recursion.sql
   ```
   - 修复 RLS 递归问题
   - 创建 SECURITY DEFINER 函数

2. **存储策略**
   ```sql
   -- 文件: supabase/migrations/005_create_avatars_storage_policies.sql
   ```
   - 配置头像存储桶的 RLS 策略

### 2.2 使用脚本（辅助）

运行 RLS 策略检查脚本：

```bash
npm run db:rls
```

这个脚本会：
- 显示需要执行的迁移文件
- 检查 RLS 策略状态
- 提供手动执行指南

### 2.3 验证 RLS 策略

在 **SQL Editor** 中执行：

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## 🧪 步骤 3: 测试应用功能

### 3.1 启动开发服务器

```bash
npm run dev
```

### 3.2 测试用户注册/登录

1. 访问 `http://localhost:3000/zh-CN/register`
2. 创建测试账户
3. 验证邮箱（如果需要）
4. 登录账户

### 3.3 测试个人资料

1. 访问 `http://localhost:3000/zh-CN/profile`
2. 查看个人资料页面
3. 尝试编辑个人信息
4. 上传头像

### 3.4 测试 API 端点

```bash
# 测试用户 API
curl http://localhost:3000/api/users/me

# 测试解决方案 API
curl http://localhost:3000/api/solutions

# 测试产品 API
curl http://localhost:3000/api/products
```

### 3.5 测试数据库连接

```bash
# 运行数据库连接测试
node scripts/test-database-connection.js
```

## 🔍 步骤 4: 验证关键功能

### 4.1 用户管理功能

- [ ] 用户注册
- [ ] 用户登录
- [ ] 密码重置
- [ ] 邮箱验证
- [ ] 个人资料编辑
- [ ] 头像上传

### 4.2 创作者功能

- [ ] 创作者申请
- [ ] 创作者仪表盘
- [ ] 方案创建
- [ ] 收益统计

### 4.3 管理员功能

- [ ] 用户管理
- [ ] 方案审核
- [ ] 系统监控

### 4.4 商城功能

- [ ] 产品浏览
- [ ] 产品搜索
- [ ] 产品评价
- [ ] 订单创建
- [ ] 支付流程

## 🐛 故障排除

### 问题 1: RLS 策略错误

**错误**: `permission denied for table`

**解决方案**:
1. 检查 RLS 策略是否正确应用
2. 确认用户有正确的权限
3. 运行 RLS 迁移文件

### 问题 2: 枚举类型不存在

**错误**: `type "xxx" does not exist`

**解决方案**:
1. 运行 `npx prisma db push`
2. 或手动创建枚举（参考迁移文件）

### 问题 3: 表不存在

**错误**: `Table 'xxx' does not exist`

**解决方案**:
1. 重新运行 `npm run db:rebuild`
2. 检查 Prisma schema 是否正确

### 问题 4: 外键约束错误

**错误**: `foreign key constraint fails`

**解决方案**:
1. 检查关联表是否存在
2. 确认外键关系正确
3. 检查数据完整性

## 📝 检查清单

完成以下检查清单：

- [ ] ✅ 数据库结构已重建
- [ ] ✅ 所有关键表已创建
- [ ] ✅ 枚举类型已创建
- [ ] ✅ RLS 策略已应用
- [ ] ✅ 存储策略已配置
- [ ] ✅ 用户注册/登录功能正常
- [ ] ✅ API 端点正常工作
- [ ] ✅ 前端页面正常显示
- [ ] ✅ 数据库连接正常

## 🎉 完成

如果所有步骤都已完成，您的数据库已准备就绪！

现在可以：
- 开始使用应用
- 创建测试数据
- 进行功能开发
- 部署到生产环境

## 📚 相关文档

- [数据库设置指南](./DATABASE_SETUP.md)
- [数据库重建指南](./database-rebuild-guide.md)
- [迁移指南](./MIGRATION_GUIDE.md)

