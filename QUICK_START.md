# 🚀 最简单的快速启动指南

> 适用于：数据库为空，从零开始的情况

---

## 第一步：修复数据库（1 分钟）

### 在 Supabase Dashboard 执行

1. 打开 https://app.supabase.com/project/YOUR_PROJECT/sql/new
2. 复制 `SIMPLE_FIX.sql` 的**全部内容**
3. 粘贴到 SQL Editor
4. 点击 **Run** ▶️

**预期结果**：
```
✅ 完成！
RLS 配置：2 张表启用，21 张表关闭
触发器已创建，新用户注册时会自动创建 profile
```

---

## 第二步：配置 Supabase（2 分钟）

### A. 配置 Redirect URLs

```
Dashboard → Authentication → URL Configuration
```

添加这两个 URL：
```
http://localhost:3000/**
http://localhost:3000/api/auth/callback
```

### B. 配置邮件模板

```
Dashboard → Authentication → Email Templates → Confirm signup
```

**Subject（主题）**:
```
Confirm your email / 确认您的邮箱
```

**Body（内容）**:
```html
<h2>Welcome to OpenAero / 欢迎加入 OpenAero 🎉</h2>

<p>Please click the button below to confirm your email:<br>
请点击下方按钮验证您的邮箱：</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}" 
     style="background-color: #4F46E5; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 6px;
            display: inline-block;
            font-weight: 600;">
    Confirm Email / 验证邮箱
  </a>
</p>

<p style="font-size: 12px; color: #666;">
If the button doesn't work, copy this link:<br>
如果按钮无效，请复制此链接：<br>
{{ .ConfirmationURL }}
</p>
```

### C. 确认 Email Provider 已启用

```
Dashboard → Authentication → Providers → Email
```

确保这些选项已打开：
- ✅ Enable Email Provider
- ✅ Confirm email

---

## 第三步：测试注册（3 分钟）

### 1. 清理浏览器

访问：http://localhost:3000/clear-cookies.html

### 2. 注册新用户

访问：http://localhost:3000/zh-CN/auth/register

```
邮箱：test@example.com
密码：Test123456!
```

**预期**：
- ✅ 页面显示 "请检查邮箱"
- ✅ 控制台无错误

### 3. 验证邮箱

1. 打开邮箱
2. 查看验证邮件
3. 点击 "Confirm Email / 验证邮箱" 按钮

**预期**：
- ✅ 自动跳转到 http://localhost:3000/zh-CN/auth/welcome
- ✅ 显示欢迎页面
- ✅ 已登录状态

### 4. 验证数据库

在 Supabase SQL Editor 执行：

```sql
SELECT 
  u.email,
  u.email_confirmed_at,
  p.display_name,
  p.roles,
  p.status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
ORDER BY u.created_at DESC
LIMIT 1;
```

**预期结果**：
```
email: test@example.com
email_confirmed_at: 2025-11-16 10:30:00
display_name: test
roles: {USER}
status: ACTIVE
```

---

## ✅ 成功标准

- [ ] 数据库 SQL 执行成功
- [ ] Redirect URLs 已配置
- [ ] 邮件模板已配置
- [ ] 注册成功（无报错）
- [ ] 收到验证邮件
- [ ] 验证链接可点击
- [ ] 自动登录到 welcome 页面
- [ ] 数据库中有 user 和 profile 记录

---

## 🆘 如果出错

### 错误 1: 注册时报 "Database error"

**原因**：触发器未创建或有错误

**解决**：
```sql
-- 检查触发器
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 如果没有，重新执行 SIMPLE_FIX.sql
```

### 错误 2: 没收到邮件

**检查**：
1. Supabase → Project Settings → Auth → SMTP Settings
2. 确认 SMTP 已配置
3. 检查垃圾邮件文件夹

### 错误 3: 验证链接点击后 404

**检查**：
1. Redirect URLs 是否包含 `http://localhost:3000/**`
2. `/api/auth/callback/route.ts` 文件是否存在

---

## 🎯 核心改变

### 之前（有问题）
```
❌ 24 张表都启用 RLS
❌ 22 张表无策略 → 会报错
❌ 没有自动创建 profile 的触发器
```

### 现在（已修复）
```
✅ 2 张表启用 RLS (user_profiles, creator_profiles)
✅ 21 张表关闭 RLS (所有业务表)
✅ 触发器自动创建 profile
```

---

## 📝 之后要做的

1. **开发新功能时**：
   - 新建的业务表**不要**启用 RLS
   - 权限检查在 API 层实现

2. **API 开发规范**：
   ```typescript
   // 每个 API 都要验证用户
   const authResult = await authenticateRequest(request);
   if (!authResult.success) {
     return createErrorResponse('Unauthorized', 401);
   }
   
   // 过滤数据
   const data = await prisma.order.findMany({
     where: { user_id: authResult.user.id }  // ✅ 只返回用户自己的
   });
   ```

3. **如果需要公开数据**：
   - 不需要 RLS，在 API 中直接返回
   - 例如：公开的产品列表、方案列表

---

## 总结

只需要 3 步，6 分钟：

1. ⏱️ 1 分钟 - 执行 `SIMPLE_FIX.sql`
2. ⏱️ 2 分钟 - 配置 Supabase
3. ⏱️ 3 分钟 - 测试注册流程

**就这么简单！** 🎉

其他复杂的文档（`DATABASE_ARCHITECTURE_ANALYSIS.md`, `FINAL_RLS_SOLUTION.md` 等）只是为了解释原理，**你不需要看**。

**现在就开始执行第一步吧！** 🚀
