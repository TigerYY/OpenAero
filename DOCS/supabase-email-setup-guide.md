# Supabase 邮箱验证配置指南

## 问题描述
新用户注册后未能收到验证邮件。

## 根本原因
Supabase Auth 默认使用 Supabase 的邮件服务，但需要配置 SMTP 才能正常发送邮件。

## 解决方案

### 方案 1: 配置 Supabase SMTP（推荐）

#### 步骤 1: 登录 Supabase Dashboard
访问：https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/settings/auth

#### 步骤 2: 配置 SMTP Settings
1. 找到 **"SMTP Settings"** 部分
2. 点击 **"Enable Custom SMTP"** 按钮
3. 填写以下配置信息：

```
Host: smtp.exmail.qq.com
Port: 465
Username: support@openaero.cn
Password: zdM469e7q3ZU2gy7
Sender email: support@openaero.cn
Sender name: OpenAero
```

**注意**：
- 端口 465 默认使用 SSL/TLS 加密，Supabase 会自动处理
- 如果 Supabase 界面中没有 "Enable SSL/TLS" 选项，这是正常的
- 端口 465 = SSL/TLS，端口 587 = STARTTLS（Supabase 会根据端口自动选择）

4. 点击 **"Save"** 保存配置

#### 步骤 3: 检查 Email Settings
在 **"Email"** 部分确认：
- ✅ **Enable Email Signup**: ON
- ✅ **Enable Email Confirmations**: ON
- ✅ **Site URL**: `http://localhost:3000` (开发环境) 或 `https://your-domain.com` (生产环境)

#### 步骤 4: 配置 Email Templates（可选）
在 **"Email Templates"** 部分可以自定义邮件模板，或使用默认模板。

### 方案 2: 临时禁用邮箱验证（仅开发环境）

⚠️ **警告**: 此方案仅适用于开发环境，生产环境必须启用邮箱验证。

1. 在 Supabase Dashboard > Authentication > Settings
2. 将 **"Enable Email Confirmations"** 设置为 **OFF**
3. 保存配置

这样用户注册后可以直接登录，无需验证邮箱。

## 验证配置

### 方法 1: 使用诊断脚本
```bash
npx tsx scripts/check-email-config.ts
```

### 方法 2: 手动测试注册
1. 访问注册页面
2. 使用真实邮箱地址注册
3. 检查邮箱（包括垃圾邮件文件夹）
4. 如果未收到，检查 Supabase Dashboard 中的邮件日志

### 方法 3: 检查 Supabase Dashboard
1. 进入 **Authentication > Users**
2. 查看新注册的用户
3. 检查用户的 **Email Confirmed** 状态
4. 如果为 `false`，说明验证邮件未发送或未点击

## 常见问题

### Q1: 配置 SMTP 后仍然收不到邮件？
**A**: 检查以下项目：
1. SMTP 配置是否正确（特别是密码）
2. 邮件是否在垃圾邮件文件夹
3. Supabase 项目是否超过免费邮件发送限制
4. 检查 Supabase Dashboard > Logs > Auth Logs 查看错误信息

### Q2: 如何查看邮件发送日志？
**A**: 
1. 进入 Supabase Dashboard > Logs > Auth Logs
2. 查看最近的认证日志
3. 查找邮件发送相关的错误信息

### Q3: 免费版 Supabase 有邮件限制吗？
**A**: 是的，Supabase 免费版有邮件发送限制。如果超过限制，需要：
- 升级到付费计划
- 配置自定义 SMTP（推荐）

### Q4: 可以使用其他 SMTP 服务吗？
**A**: 可以，支持任何标准的 SMTP 服务，例如：
- SendGrid
- Mailgun
- Amazon SES
- Gmail（开发环境）

## 相关文件

- `src/contexts/AuthContext.tsx` - 注册流程
- `src/lib/auth/auth-service.ts` - 认证服务
- `src/app/api/auth/resend-verification/route.ts` - 重新发送验证邮件 API
- `scripts/check-email-config.ts` - 邮箱配置检查脚本
- `supabase/email-templates.json` - 邮件模板配置

## 下一步

1. ✅ 配置 Supabase SMTP（如果未配置）
2. ✅ 测试注册流程
3. ✅ 检查邮件是否收到
4. ✅ 如果问题持续，查看 Supabase Dashboard 日志

