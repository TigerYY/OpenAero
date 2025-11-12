# 从Supabase获取完整连接字符串

## 🎯 目标
直接从Supabase Dashboard复制完整的、包含密码的连接字符串,避免手动拼接错误。

## 📋 操作步骤

### 步骤1: 访问数据库设置
1. 打开 https://supabase.com/dashboard/project/cardynuoazvaytvinxvm
2. 点击左侧菜单 **"Database"** (不是Settings下的)
3. 点击页面上的 **"Connection string"** 或 **"Connect"** 按钮

### 步骤2: 选择连接类型
你会看到几个标签/选项:
- **URI** ← 选择这个
- **PSQL** 
- **JDBC**
- 等等

在URI标签下,会有:
- **Connection pooling** (推荐)
  - Transaction mode ← **首选这个**
  - Session mode
- **Direct connection**

### 步骤3: 复制连接字符串

#### 方法A: 使用Connection Pooling (推荐)
1. 选择 **Connection pooling**
2. 选择 **Transaction mode**
3. 你会看到类似这样的字符串:
   ```
   postgresql://postgres.cardynuoazvaytvinxvm:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
4. **复制整个字符串**
5. **手动替换** `[YOUR-PASSWORD]` 为: `4gPPhKf90F6ayAka`
6. 最终字符串应该是:
   ```
   postgresql://postgres.cardynuoazvaytvinxvm:4gPPhKf90F6ayAka@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

#### 方法B: 直接获取带密码的字符串
某些Supabase版本会有一个选项可以直接显示密码:
1. 查找 **"Show password"** 或 **"Reveal password"** 按钮
2. 点击后,连接字符串会自动填充密码
3. 直接复制完整字符串

### 步骤4: 提供给我
将完整的连接字符串(包含密码)发送给我,格式类似:
```
postgresql://postgres.xxx:密码@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## 🔍 常见问题

### Q1: 找不到 "Connection string" 按钮?
**A**: 在Database页面顶部,可能有以下位置:
- 右上角的 "Connect" 按钮
- 页面中间的 "Connection Info" 卡片
- "Database settings" 中的 "Connection string" 部分

### Q2: 连接字符串显示 [YOUR-PASSWORD]?
**A**: 这是占位符,需要手动替换为你的实际密码: `4gPPhKf90F6ayAka`

### Q3: 不确定哪个连接模式?
**A**: 优先级顺序:
1. **Connection Pooling > Transaction mode** (最推荐,端口6543)
2. Connection Pooling > Session mode (端口5432)
3. Direct connection (最后选择)

### Q4: 密码中有特殊字符怎么办?
**A**: 你的新密码 `4gPPhKf90F6ayAka` 只包含字母和数字,不需要URL编码,直接使用即可。

## 📸 参考截图位置
根据你之前的截图:
- 主Database页面 → 顶部应该有 "Connect" 或 "Connection Info"
- 或者查看页面中的 "Connection string" 部分

## ⚡ 快速验证
拿到连接字符串后,我会:
1. 立即测试连接
2. 更新 `.env.local`
3. 重新生成 Prisma Client
4. 验证业务数据查询

## 🎯 期待的输出格式
```
DATABASE_URL=postgresql://postgres.cardynuoazvaytvinxvm:4gPPhKf90F6ayAka@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

或者只提供完整的连接字符串,我会自动处理。
