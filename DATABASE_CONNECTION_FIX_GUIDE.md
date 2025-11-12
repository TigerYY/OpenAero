# 数据库连接问题修复指南

## 问题诊断

当前遇到的错误: `FATAL: Tenant or user not found`

这个错误表明数据库密码或连接配置不正确。

## 解决方案

### 步骤1: 获取正确的数据库连接字符串

1. 访问 Supabase Dashboard: https://supabase.com/dashboard
2. 选择项目: `cardynuoazvaytvinxvm` (openaero)
3. 进入 **Project Settings** (左下角齿轮图标)
4. 点击 **Database** 选项卡
5. 找到 **Connection string** 部分

### 步骤2: 复制正确的连接字符串

有三种连接模式,推荐使用:

#### 选项A: Transaction Pooler (推荐用于Prisma)
```
postgresql://postgres.cardynuoazvaytvinxvm:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

#### 选项B: Session Pooler (用于直接查询)
```
postgresql://postgres.cardynuoazvaytvinxvm:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### 步骤3: 获取数据库密码

在Supabase Dashboard的Database设置页面:

1. 找到 **Database password** 部分
2. 点击 **Reset Database Password** (如果忘记了密码)
3. 复制新密码并保存到安全的地方

**重要**: 数据库密码重置后,原密码将立即失效!

### 步骤4: URL编码密码

如果密码中包含特殊字符(如 `@`, `#`, `%`, `/` 等),需要进行URL编码:

```javascript
// 在Node.js中编码密码
const password = 'your-actual-password';
const encoded = encodeURIComponent(password);
console.log(encoded);
```

或使用在线工具: https://www.urlencoder.org/

### 步骤5: 更新.env.local文件

将获取的连接字符串更新到 `.env.local` 文件:

```env
# 数据库连接(使用 Supabase PostgreSQL)
# Transaction模式 - 用于 Prisma Migrate
DATABASE_URL="postgresql://postgres.cardynuoazvaytvinxvm:[YOUR-ENCODED-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Session模式 - 用于直接查询
DIRECT_URL="postgresql://postgres.cardynuoazvaytvinxvm:[YOUR-ENCODED-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

**替换 `[YOUR-ENCODED-PASSWORD]` 为你的实际密码(经过URL编码)**

### 步骤6: 同步更新.env.supabase文件

为保持一致性,也更新 `.env.supabase` 文件中的DATABASE_URL。

### 步骤7: 测试连接

运行测试脚本验证连接:

```bash
node scripts/test-db-with-env.js
```

期待输出:
```
✅ 数据库连接成功!
✅ 所有测试通过!数据库连接正常。
```

### 步骤8: 运行数据库迁移(如果需要)

如果数据库中还没有表,运行Prisma迁移:

```bash
# 推送schema到数据库
npx prisma db push

# 或者使用迁移
npx prisma migrate dev --name init
```

## 常见问题

### Q1: 仍然显示 "Tenant or user not found"
A: 
- 确认密码是否正确
- 确认密码已正确进行URL编码
- 尝试重置数据库密码

### Q2: "Can't reach database server"
A:
- 检查网络连接
- 确认Supabase项目状态是否正常
- 检查防火墙设置

### Q3: 密码中有特殊字符怎么办?
A: 使用 `encodeURIComponent()` 进行编码,例如:
- `%` -> `%25`
- `@` -> `%40`
- `#` -> `%23`
- `/` -> `%2F`

## 当前配置信息

- **项目ID**: cardynuoazvaytvinxvm
- **区域**: aws-0-ap-southeast-1
- **主机**: aws-0-ap-southeast-1.pooler.supabase.com
- **Transaction端口**: 6543
- **Session端口**: 5432

## 下一步

完成数据库连接修复后:

1. ✅ 测试数据库连接
2. ✅ 运行Prisma迁移
3. ✅ 启动开发服务器
4. ✅ 测试认证功能
5. ✅ 测试业务数据查询

## 需要帮助?

如果按照以上步骤仍无法连接,请提供:

1. Supabase Dashboard中显示的连接字符串格式
2. 运行 `node scripts/test-supabase-connections.js` 的完整输出
3. 密码是否包含特殊字符及具体字符
