# 🔐 如何获取正确的Supabase数据库密码

## ⚠️ 当前状态

新密码 `Apollo202%@1419` 测试失败,这说明可能从错误的地方获取了密码。

## 📍 正确的密码位置

### 方法1: 从连接字符串中获取(推荐)

1. **访问**: https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/settings/database

2. **找到 "Connection string" 部分**

3. **选择正确的选项**:
   - 点击 **"URI"** 标签页
   - 在下拉菜单中选择 **"Connection pooling"** → **"Transaction"**

4. **查看连接字符串**,格式类似:
   ```
   postgresql://postgres.cardynuoazvaytvinxvm:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```

5. **复制 `[YOUR-PASSWORD]` 部分** - 这就是正确的密码!
   - 密码在 `:` 和 `@` 之间
   - 可能包含字母、数字、特殊字符
   - Supabase已经自动进行了URL编码

6. **复制完整的连接字符串** - 这样最保险!

### 方法2: 重置密码并立即复制

如果连接字符串中密码显示为 `[YOUR-PASSWORD]`:

1. **在同一页面找到 "Database Password" 部分**

2. **点击 "Reset Database Password" 按钮**

3. **Supabase会生成新密码并显示**:
   ```
   Your new database password is: xxxxxxxxxx
   ```

4. **立即复制这个密码!** (只显示一次)

5. **保存到安全的地方**

---

## 🎯 正确的操作流程

### 选项A: 直接复制完整连接字符串(最简单)

1. 访问 Database 设置页面
2. Connection string → URI → Connection pooling → Transaction
3. **复制完整的连接字符串**
4. 告诉我完整的连接字符串(我会帮你提取和配置)

### 选项B: 重置密码并手动配置

1. 点击 "Reset Database Password"
2. 复制显示的新密码
3. 告诉我新密码
4. 我帮你生成正确的连接字符串

---

## 🔍 常见错误

### ❌ 错误1: 复制了错误的密码

可能复制的是:
- ❌ Supabase Service Role Key (很长的JWT token)
- ❌ Supabase Anon Key
- ❌ API密钥
- ✅ **应该复制**: Database Password (通常是15-20个字符)

### ❌ 错误2: 密码被修改了

- 密码中多了空格
- 密码被截断了
- 复制时只复制了一部分

### ❌ 错误3: 使用了旧密码

- Supabase显示的是占位符 `[YOUR-PASSWORD]`
- 需要重置才能看到真实密码

---

## 📸 截图参考

在 Supabase Dashboard 的 Database 页面,你应该看到:

```
┌─────────────────────────────────────────────────────────┐
│ Connection string                                       │
├─────────────────────────────────────────────────────────┤
│ [PSQL] [URI] [JDBC] [.NET]                             │
│                                                         │
│ Mode: [Session ▼] or [Transaction ▼]                   │
│                                                         │
│ postgresql://postgres.xxx:[PASSWORD]@aws-0-...         │
│                                              [Copy]     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Database Password                                       │
├─────────────────────────────────────────────────────────┤
│ [YOUR-PASSWORD] or [●●●●●●●●●●●]                       │
│                           [Reset Database Password]     │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 下一步操作

请选择以下方式之一:

### 方式1: 提供完整连接字符串(推荐)

从Supabase复制完整的连接字符串,格式类似:
```
postgresql://postgres.cardynuoazvaytvinxvm:ABC123xyz@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

告诉我完整的字符串,我会自动提取密码并配置。

### 方式2: 提供密码(如果确定是正确的)

如果你确认密码是正确的,告诉我:
- 密码长度(多少个字符)
- 密码的前3个字符
- 密码的后3个字符
- 是否包含特殊字符(@, %, #, $等)

这样我可以验证格式是否正确。

### 方式3: 重新截图确认

如果不确定,可以截图Supabase Database设置页面(隐藏密码),我帮你确认操作位置。

---

## 💡 提示

**Supabase数据库密码的特点**:
- 通常是15-30个字符
- 包含大小写字母、数字
- 可能包含特殊字符
- 不是JWT token(那些是API密钥,不是数据库密码)

**如果密码显示为 `[YOUR-PASSWORD]`**:
- 这是占位符,不是真实密码
- 需要点击 "Reset Database Password" 才能看到真实密码
