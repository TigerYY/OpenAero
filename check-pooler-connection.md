# Session Pooler 连接字符串检查

## 问题
你复制的连接字符串仍然是 Primary Database 的地址：
- Host: `aws-1-us-east-2.pooler.supabase.com`
- Port: `5432`

这不是 Session Pooler 的连接字符串。

## Session Pooler 的正确格式
Session Pooler 的连接字符串应该是：
- Host: `aws-1-us-east-2.pooler.supabase.net` (注意是 .net，不是 .com)
- Port: `6543` (不是 5432)

## 如何获取正确的连接字符串

### 方法 1: 在 Supabase Dashboard 中
1. 进入项目 → `Project Settings` → `Database`
2. 点击顶部的 **"Connection pooling"** 标签（不是 "Connection string"）
3. 在 "Connection pooling" 页面中，选择 **"Session"** 模式
4. 复制显示的连接字符串

### 方法 2: 手动构建
如果你知道数据库密码，可以手动构建：
```
postgresql://postgres.cardynuoazvaytvinxvm:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.net:6543/postgres
```

### 方法 3: 使用 Transaction Pooler（备选）
如果 Session pooler 不可用，可以尝试 Transaction pooler：
- Port: `6543`
- Host: `aws-1-us-east-2.pooler.supabase.net`

## 验证
更新后，连接字符串应该包含：
- ✅ `.supabase.net` (不是 .com)
- ✅ `6543` 端口 (不是 5432)
