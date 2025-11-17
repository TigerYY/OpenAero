# 🧪 简单验证测试指南

## ⚠️ 重要说明

**不要手动测试回调端点！**

Supabase 使用 PKCE（Proof Key for Code Exchange），验证链接包含：
- `code` - 授权码
- `code_verifier` - PKCE 验证器（自动生成，无法手动构造）

手动访问 `/api/auth/callback?code=test` 会失败，因为缺少 `code_verifier`。

---

## ✅ 正确的测试方法

### 方法 1: 完整注册流程（推荐）

这是**唯一可靠**的测试方法：

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **清理浏览器**
   ```bash
   open http://localhost:3000/clear-cookies.html
   ```

3. **配置 Supabase**（仅第一次需要）
   - Dashboard → Authentication → URL Configuration
   - Redirect URLs 添加: `http://localhost:3000/**`

4. **注册新用户**
   - 访问: `http://localhost:3000/zh-CN/auth/register`
   - 使用真实邮箱注册
   - 提交表单

5. **查看邮箱**
   - 收到验证邮件
   - 点击验证链接
   - **自动跳转到欢迎页面** ✅

---

## 🔍 验证代码逻辑是否正确

虽然不能手动测试，但可以检查代码：

### 检查 1: 回调文件是否正确

```bash
cat src/app/api/auth/callback/route.ts | grep "await createSupabaseServer"
```

**应该输出**:
```typescript
const supabase = await createSupabaseServer();
```

**如果没有 `await`**，说明文件没保存，重新保存。

### 检查 2: 语言检测逻辑

```bash
cat src/app/api/auth/callback/route.ts | grep "detectUserLocale"
```

**应该看到** `detectUserLocale` 函数定义。

### 检查 3: 路径修正逻辑

```bash
cat src/app/api/auth/callback/route.ts | grep "修复 welcome 路径"
```

**应该看到** 日志输出代码。

---

## 📋 执行检查清单

在开始注册测试前，确认：

### 代码层面
- [x] `src/app/api/auth/callback/route.ts` 已修复（加了 `await`）
- [x] `src/contexts/AuthContext.tsx` 的 `emailRedirectTo` 正确
- [x] `src/app/[locale]/(auth)/welcome/page.tsx` 存在
- [x] `src/app/welcome/page.tsx` 存在（兜底）

### 环境变量
- [ ] `.env.local` 有 `NEXT_PUBLIC_APP_URL=http://localhost:3000`
  ```bash
  cat .env.local | grep NEXT_PUBLIC_APP_URL
  ```

### 开发服务器
- [ ] 服务器正在运行
  ```bash
  npm run dev
  ```
- [ ] 可以访问 `http://localhost:3000`

### Supabase 配置
- [ ] Redirect URLs 添加了 `http://localhost:3000/**`
  - Dashboard → Authentication → URL Configuration
- [ ] Email Provider 已启用（默认启用）
- [ ] 邮件模板使用 `{{ .ConfirmationURL }}`（可选，默认模板也能用）

---

## 🚀 立即执行步骤

### 步骤 1: 检查环境变量

```bash
cat .env.local | grep NEXT_PUBLIC_APP_URL
```

**预期输出**:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**如果没有**，添加：
```bash
echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env.local
```

### 步骤 2: 重启开发服务器

```bash
# 按 Ctrl+C 停止
npm run dev
```

### 步骤 3: 配置 Supabase Redirect URLs

1. 打开 Supabase Dashboard
2. 进入你的项目
3. Authentication → URL Configuration
4. Redirect URLs → 点击 "Add URL"
5. 输入: `http://localhost:3000/**`
6. 保存

### 步骤 4: 注册测试

1. 清理 cookies: `open http://localhost:3000/clear-cookies.html`
2. 访问注册页面: `http://localhost:3000/zh-CN/auth/register`
3. 填写表单（使用真实邮箱）
4. 提交

### 步骤 5: 验证邮箱

1. 查看邮箱
2. 点击验证链接
3. **预期**: 自动跳转到 `http://localhost:3000/zh-CN/auth/welcome`

---

## 🐛 常见问题

### Q1: 为什么不能手动测试？

**A**: Supabase 使用 PKCE 安全机制，验证链接包含：
- `code` - 服务器生成的授权码
- `code_verifier` - 客户端生成的随机字符串（SHA256 哈希）

这两个必须匹配，无法手动构造。

### Q2: 如何知道代码是否正确？

**A**: 通过完整注册流程测试。如果：
- ✅ 收到验证邮件
- ✅ 点击链接后自动登录
- ✅ 跳转到欢迎页面

说明代码完全正确！

### Q3: 验证链接是什么样的？

**A**: 真实的验证链接格式：
```
https://cardynuoazvaytvinxvm.supabase.co/auth/v1/verify
  ?token=xxxxx                    ← 验证 token
  &type=signup                    ← 类型
  &redirect_to=http://localhost:3000/api/auth/callback?next=/welcome
```

点击后，Supabase 会：
1. 验证 token
2. 生成 `code` 和 `code_verifier`
3. 重定向到: `http://localhost:3000/api/auth/callback?code=xxx&next=/welcome`

### Q4: 如果收不到邮件怎么办？

**A**: 
1. 检查垃圾邮件文件夹
2. 使用不同邮箱（Gmail、Outlook、QQ 等）
3. 在 Supabase Dashboard 查看发送日志
   - Authentication → Logs

### Q5: 点击链接后报错怎么办？

**A**: 查看浏览器控制台（F12）和终端日志：

**常见错误**:
```
❌ invalid request: both auth code and code verifier should be non-empty
→ Redirect URLs 未配置，Supabase 拒绝跳转

❌ 404 Not Found
→ 开发服务器未运行或端口不对

❌ permission denied for table user_profiles
→ 执行 SIMPLE_FIX.sql 修复 RLS
```

---

## ✅ 成功标志

完整流程成功的标志：

1. ✅ 提交注册表单 → 显示"验证邮件已发送"
2. ✅ 收到邮件 → 包含验证链接
3. ✅ 点击链接 → 跳转到 Supabase
4. ✅ Supabase 验证 → 重定向到你的回调端点
5. ✅ 回调处理 → 交换 code 获取 session
6. ✅ 最终跳转 → 显示欢迎页面，已登录

**浏览器控制台日志**:
```
[Auth Callback] 收到回调请求: { code: 'exists', error: 'none', originalNext: '/welcome' }
[Auth Callback] 检测到的语言: zh-CN
[Auth Callback] 修复 welcome 路径: /zh-CN/auth/welcome
[Auth Callback] Session 交换成功，用户: xxx-xxx-xxx
[Auth Callback] 重定向到: http://localhost:3000/zh-CN/auth/welcome
```

---

## 🎯 现在立即执行

按照上面的**步骤 1-5** 执行完整注册流程！

**不要手动测试回调端点**，那样一定会失败！

祝你成功！🎉
