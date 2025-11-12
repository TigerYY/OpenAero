# Supabase数据库密码重置指南

## 当前状态
✅ Supabase Auth服务正常 (已有15个用户)  
❌ Prisma数据库连接失败 (密码错误)

## 解决方案: 重置数据库密码

### 步骤1: 访问Supabase Dashboard

1. 打开浏览器访问: https://supabase.com/dashboard/project/cardynuoazvaytvinxvm
2. 登录你的Supabase账号

### 步骤2: 进入数据库设置

1. 点击左侧菜单栏底部的 **⚙️ Settings** (设置图标)
2. 在设置菜单中选择 **Database** 选项卡

### 步骤3: 重置数据库密码

1. 找到 **Database Password** 部分
2. 点击 **Reset Database Password** 按钮
3. 系统会生成一个新的随机密码
4. **立即复制这个密码** (只显示一次!)
5. 保存到安全的地方

### 步骤4: 获取连接字符串

在同一个Database页面:

1. 找到 **Connection string** 部分
2. 选择 **URI** 模式
3. 你会看到类似这样的字符串:
   ```
   postgresql://postgres.cardynuoazvaytvinxvm:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
4. 复制这个完整的连接字符串

### 步骤5: 更新项目配置

替换 `.env.local` 文件中的DATABASE_URL:

```bash
# 编辑 .env.local 文件
code .env.local  # 或使用你喜欢的编辑器
```

找到并替换:

```env
# 旧的(错误的密码)
DATABASE_URL="postgresql://postgres.cardynuoazvaytvinxvm:Apollo202%251419@..."

# 新的(从Supabase复制的完整字符串)
DATABASE_URL="postgresql://postgres.cardynuoazvaytvinxvm:[NEW-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# 同时更新DIRECT_URL (Session模式,端口改为5432)
DIRECT_URL="postgresql://postgres.cardynuoazvaytvinxvm:[NEW-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

### 步骤6: 同步更新.env.supabase

同样更新 `.env.supabase` 文件中的DATABASE_URL。

### 步骤7: 测试连接

运行测试脚本:

```bash
node scripts/test-db-with-env.js
```

期待输出:
```
✅ 数据库连接成功!
✅ 所有测试通过!
```

### 步骤8: 重新生成Prisma Client

```bash
npx prisma generate
```

### 步骤9: 推送数据库Schema (如果需要)

如果数据库中还没有表:

```bash
npx prisma db push
```

### 步骤10: 启动开发服务器

```bash
npm run dev
```

## 重要提示

⚠️ **密码只显示一次**: 重置密码后,新密码只显示一次,请立即保存!

⚠️ **URL编码**: 如果新密码包含特殊字符,Supabase提供的连接字符串已经自动编码,直接复制使用即可。

⚠️ **旧密码失效**: 重置后,所有使用旧密码的连接都会失败,需要同步更新所有环境。

## 完成后验证

1. ✅ 数据库连接测试通过
2. ✅ Prisma查询正常
3. ✅ 开发服务器启动成功
4. ✅ 认证功能正常
5. ✅ 业务数据查询正常

## 需要帮助?

完成密码重置后,运行:

```bash
node scripts/verify-database-connection.js
```

如果仍有问题,请提供:
1. 错误信息的完整输出
2. 确认是否已复制了完整的连接字符串
3. 确认密码中是否有特殊字符
