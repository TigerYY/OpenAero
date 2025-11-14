# 邮箱验证邮件问题排查指南

## 问题描述
新用户注册后未能收到验证邮件。

## 可能的原因

### 1. Supabase SMTP 未配置
Supabase Auth 默认使用 Supabase 的邮件服务，但需要配置 SMTP 才能发送邮件。

### 2. 邮件被标记为垃圾邮件
验证邮件可能被邮件服务商标记为垃圾邮件。

### 3. 邮箱地址错误
用户输入的邮箱地址可能有误。

### 4. 邮件服务限制
Supabase 免费版有邮件发送限制。

## 检查步骤

### 步骤 1: 检查 Supabase Dashboard 配置

1. 登录 Supabase Dashboard
2. 进入项目设置 > Authentication > Email Templates
3. 检查以下配置：
   - **SMTP Settings**: 是否已配置 SMTP 服务器
   - **Email Templates**: 确认邮件模板是否正确
   - **Site URL**: 确认 `NEXT_PUBLIC_APP_URL` 是否正确

### 步骤 2: 检查环境变量

确保 `.env.local` 文件中包含：
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 步骤 3: 检查 Supabase Auth 设置

在 Supabase Dashboard > Authentication > Settings 中检查：
- **Enable Email Signup**: 已启用
- **Enable Email Confirmations**: 已启用
- **SMTP Settings**: 已配置（如果使用自定义 SMTP）

### 步骤 4: 测试邮件发送

可以使用以下 API 端点测试邮件发送：
- `POST /api/auth/resend-verification` - 重新发送验证邮件
- `POST /api/admin/test-email` - 测试邮件服务（管理员）

## 解决方案

### 方案 1: 配置 Supabase SMTP（推荐）

1. 在 Supabase Dashboard > Settings > Auth > SMTP Settings
2. 配置 SMTP 服务器：
   - Host: `smtp.exmail.qq.com`
   - Port: `465`
   - Username: `support@openaero.cn`
   - Password: `your-password`
   - Sender email: `support@openaero.cn`
   - Sender name: `OpenAero`

### 方案 2: 使用 Supabase 默认邮件服务

如果使用 Supabase 默认邮件服务：
- 检查邮件是否在垃圾邮件文件夹
- 确认邮箱地址正确
- 检查 Supabase 项目是否超过免费邮件发送限制

### 方案 3: 临时禁用邮箱验证（仅开发环境）

在 Supabase Dashboard > Authentication > Settings：
- 将 **Enable Email Confirmations** 设置为 **OFF**
- 注意：这仅适用于开发环境，生产环境必须启用

## 验证邮件模板配置

检查 `supabase/email-templates.json` 中的模板配置是否正确。

## 相关文件

- `src/lib/auth/auth-service.ts` - 注册逻辑
- `src/contexts/AuthContext.tsx` - 前端注册流程
- `src/app/api/auth/resend-verification/route.ts` - 重新发送验证邮件 API
- `supabase/email-templates.json` - 邮件模板配置

## 下一步

1. 检查 Supabase Dashboard 中的 SMTP 配置
2. 测试邮件发送功能
3. 检查邮件是否在垃圾邮件文件夹
4. 如果问题持续，联系 Supabase 支持

