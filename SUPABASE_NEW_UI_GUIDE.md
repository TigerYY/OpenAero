# Supabase新版界面 - 获取连接字符串指南

## 📍 当前位置
你现在在: **Settings > Database** 页面

## 🔍 获取连接字符串的正确位置

在Supabase新版界面中,连接字符串不在Database Settings页面,而是在:

### 方法1: 通过Project Settings获取

1. **点击左侧边栏的 "Project Settings"** (齿轮图标)
2. 选择 **"Database"** 标签页
3. 向下滚动找到 **"Connection string"** 部分
4. 你会看到不同的连接模式:
   - **Session mode** (Direct connection)
   - **Transaction mode** (Connection pooling)
   
### 方法2: 通过Database页面获取

1. 在左侧边栏点击 **"Database"** (不是Settings)
2. 查找 **"Connection info"** 或 **"Connect"** 按钮
3. 应该会显示连接字符串

### 方法3: 手动构建连接字符串

既然你已经有了密码 `Apollo202%@1419`,我们可以手动构建。

根据你的项目信息:
- 项目ID: `cardynuoazvaytvinxvm`
- 区域: `aws-0-ap-southeast-1`
- 密码: `Apollo202%@1419` (URL编码后: `Apollo202%25%401419`)

标准连接字符串格式:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[REGION].pooler.supabase.com:[PORT]/postgres
```

## 🎯 请执行以下操作

### 选项A: 查找连接字符串页面

1. 在Supabase Dashboard左侧,点击 **"Database"** (不是Settings下的Database)
2. 或者在顶部搜索框搜索 "connection"
3. 找到显示连接字符串的地方
4. 复制完整的连接字符串给我

### 选项B: 提供Host信息

如果你能在Dashboard找到以下信息,请告诉我:
- **Host**: (应该类似 `aws-0-ap-southeast-1.pooler.supabase.com` 或 `db.cardynuoazvaytvinxvm.supabase.co`)
- **Port**: (通常是 5432 或 6543)
- **Database**: (通常是 `postgres`)

### 选项C: 尝试强制SSL连接

我注意到你的截图显示 "Enforce SSL on incoming connections" 是开启的。
让我测试使用SSL的连接。
