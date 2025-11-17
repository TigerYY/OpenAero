# OpenAero 邮件模板配置

## 📧 Confirm Signup 双语邮件模板（推荐）

### Subject 主题
```
Confirm Your Signup - OpenAero | 确认您的注册 - 开元空御
```

### HTML Template 模板
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      color: #2563eb;
      font-size: 28px;
      margin: 0;
    }
    .section {
      margin-bottom: 30px;
    }
    .divider {
      border-top: 1px solid #e5e7eb;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 10px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 20px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Logo -->
    <div class="logo">
      <h1>OpenAero | 开元空御</h1>
    </div>

    <!-- English Section -->
    <div class="section">
      <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
        🎉 Confirm Your Signup
      </h2>
      <p style="font-size: 16px; color: #4b5563;">
        Thank you for joining OpenAero! Click the button below to verify your email address and activate your account.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">
          Confirm Your Email
        </a>
      </div>
      <p style="font-size: 14px; color: #6b7280;">
        Or copy and paste this link into your browser:
      </p>
      <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
        {{ .ConfirmationURL }}
      </p>
    </div>

    <!-- Divider -->
    <div class="divider"></div>

    <!-- Chinese Section -->
    <div class="section">
      <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
        🎉 确认您的注册
      </h2>
      <p style="font-size: 16px; color: #4b5563;">
        感谢您加入开元空御！请点击下方按钮验证您的邮箱地址并激活账户。
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">
          确认邮箱地址
        </a>
      </div>
      <p style="font-size: 14px; color: #6b7280;">
        或者将以下链接复制到浏览器中打开：
      </p>
      <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
        {{ .ConfirmationURL }}
      </p>
    </div>

    <!-- Warning Section (Bilingual) -->
    <div class="warning">
      <strong>⚠️ Security Notice | 安全提示</strong><br>
      <span style="display: block; margin-top: 8px;">
        🇬🇧 If you didn't create an account, please ignore this email.<br>
        🇨🇳 如果您没有创建账户，请忽略此邮件。
      </span>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 5px 0;">
        <strong>OpenAero | 开元空御</strong>
      </p>
      <p style="margin: 5px 0;">
        Community-Driven Open Drone Solutions Platform<br>
        社区驱动的开放式无人机解决方案平台
      </p>
      <p style="margin: 15px 0 5px 0;">
        📧 support@openaero.cn | 🌐 https://openaero.cn
      </p>
      <p style="margin: 5px 0; color: #9ca3af;">
        © 2024 OpenAero. All rights reserved. | 保留所有权利
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 📧 Reset Password 双语邮件模板

### Subject 主题
```
Reset Your Password - OpenAero | 重置您的密码 - 开元空御
```

### HTML Template 模板
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      color: #2563eb;
      font-size: 28px;
      margin: 0;
    }
    .section {
      margin-bottom: 30px;
    }
    .divider {
      border-top: 1px solid #e5e7eb;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background-color: #dc2626;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 10px 0;
    }
    .button:hover {
      background-color: #b91c1c;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 20px 0;
      font-size: 14px;
    }
    .expiry {
      background-color: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 12px 16px;
      margin: 20px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Logo -->
    <div class="logo">
      <h1>OpenAero | 开元空御</h1>
    </div>

    <!-- English Section -->
    <div class="section">
      <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
        🔐 Reset Your Password
      </h2>
      <p style="font-size: 16px; color: #4b5563;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">
          Reset Password
        </a>
      </div>
      <p style="font-size: 14px; color: #6b7280;">
        Or copy and paste this link into your browser:
      </p>
      <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
        {{ .ConfirmationURL }}
      </p>
      <div class="expiry">
        <strong>⏱️ Link Expires Soon</strong><br>
        <span style="display: block; margin-top: 8px;">
          This password reset link will expire in 1 hour for security reasons.
        </span>
      </div>
    </div>

    <!-- Divider -->
    <div class="divider"></div>

    <!-- Chinese Section -->
    <div class="section">
      <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
        🔐 重置您的密码
      </h2>
      <p style="font-size: 16px; color: #4b5563;">
        我们收到了重置您密码的请求。请点击下方按钮创建新密码。
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">
          重置密码
        </a>
      </div>
      <p style="font-size: 14px; color: #6b7280;">
        或者将以下链接复制到浏览器中打开：
      </p>
      <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
        {{ .ConfirmationURL }}
      </p>
      <div class="expiry">
        <strong>⏱️ 链接即将过期</strong><br>
        <span style="display: block; margin-top: 8px;">
          出于安全考虑，此密码重置链接将在 1 小时后过期。
        </span>
      </div>
    </div>

    <!-- Warning Section (Bilingual) -->
    <div class="warning">
      <strong>⚠️ Security Notice | 安全提示</strong><br>
      <span style="display: block; margin-top: 8px;">
        🇬🇧 If you didn't request a password reset, please ignore this email or contact our support team.<br>
        🇨🇳 如果您没有请求重置密码，请忽略此邮件或联系我们的客服团队。
      </span>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 5px 0;">
        <strong>OpenAero | 开元空御</strong>
      </p>
      <p style="margin: 5px 0;">
        Community-Driven Open Drone Solutions Platform<br>
        社区驱动的开放式无人机解决方案平台
      </p>
      <p style="margin: 15px 0 5px 0;">
        📧 support@openaero.cn | 🌐 https://openaero.cn
      </p>
      <p style="margin: 5px 0; color: #9ca3af;">
        © 2024 OpenAero. All rights reserved. | 保留所有权利
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 📧 Magic Link 双语邮件模板

### Subject 主题
```
Your Magic Link - OpenAero | 您的魔法链接 - 开元空御
```

### HTML Template 模板
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      color: #2563eb;
      font-size: 28px;
      margin: 0;
    }
    .section {
      margin-bottom: 30px;
    }
    .divider {
      border-top: 1px solid #e5e7eb;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background-color: #059669;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 10px 0;
    }
    .button:hover {
      background-color: #047857;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 20px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Logo -->
    <div class="logo">
      <h1>OpenAero | 开元空御</h1>
    </div>

    <!-- English Section -->
    <div class="section">
      <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
        ✨ Your Magic Link is Ready
      </h2>
      <p style="font-size: 16px; color: #4b5563;">
        Click the button below to sign in to your OpenAero account. No password needed!
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">
          Sign In Now
        </a>
      </div>
      <p style="font-size: 14px; color: #6b7280;">
        Or copy and paste this link into your browser:
      </p>
      <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
        {{ .ConfirmationURL }}
      </p>
    </div>

    <!-- Divider -->
    <div class="divider"></div>

    <!-- Chinese Section -->
    <div class="section">
      <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
        ✨ 您的魔法链接已准备就绪
      </h2>
      <p style="font-size: 16px; color: #4b5563;">
        请点击下方按钮登录您的开元空御账户。无需密码！
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">
          立即登录
        </a>
      </div>
      <p style="font-size: 14px; color: #6b7280;">
        或者将以下链接复制到浏览器中打开：
      </p>
      <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
        {{ .ConfirmationURL }}
      </p>
    </div>

    <!-- Warning Section (Bilingual) -->
    <div class="warning">
      <strong>⚠️ Security Notice | 安全提示</strong><br>
      <span style="display: block; margin-top: 8px;">
        🇬🇧 This link expires in 1 hour. If you didn't request this, please ignore this email.<br>
        🇨🇳 此链接将在 1 小时后过期。如果您没有请求登录，请忽略此邮件。
      </span>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 5px 0;">
        <strong>OpenAero | 开元空御</strong>
      </p>
      <p style="margin: 5px 0;">
        Community-Driven Open Drone Solutions Platform<br>
        社区驱动的开放式无人机解决方案平台
      </p>
      <p style="margin: 15px 0 5px 0;">
        📧 support@openaero.cn | 🌐 https://openaero.cn
      </p>
      <p style="margin: 5px 0; color: #9ca3af;">
        © 2024 OpenAero. All rights reserved. | 保留所有权利
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 🎨 模板特点

### 1. **完全双语**
- ✅ 中英文内容同时展示
- ✅ 无需根据用户语言切换模板
- ✅ 确保所有用户都能看懂

### 2. **专业美观**
- ✅ 响应式设计（移动端友好）
- ✅ 品牌色彩（OpenAero 蓝色）
- ✅ 清晰的视觉层次

### 3. **安全提示**
- ✅ 双语安全警告
- ✅ 链接过期时间说明
- ✅ 异常情况处理指引

### 4. **用户体验**
- ✅ 大按钮易于点击
- ✅ 同时提供文本链接（防止按钮失效）
- ✅ 公司信息和联系方式

---

## 📋 Supabase Dashboard 配置步骤

### Step 1: 登录 Supabase Dashboard
访问: https://supabase.com/dashboard

### Step 2: 进入邮件模板设置
```
Project → Authentication → Email Templates
```

### Step 3: 配置 Confirm Signup 模板
1. 点击 **Confirm signup**
2. 将上面的 **Subject** 复制到主题栏
3. 将上面的 **HTML Template** 完整复制到模板编辑器
4. 点击 **Save** 保存

### Step 4: 配置 Reset Password 模板（可选）
1. 点击 **Reset password**
2. 使用上面的 Reset Password 模板
3. 点击 **Save** 保存

### Step 5: 配置 Magic Link 模板（可选）
1. 点击 **Magic Link**
2. 使用上面的 Magic Link 模板
3. 点击 **Save** 保存

---

## ✅ 测试建议

配置完成后，发送测试邮件：

```bash
# 在 Supabase Dashboard 中
Authentication → Email Templates → 点击 "Send test email"
```

检查邮件：
- [ ] 中英文内容都显示正常
- [ ] 按钮样式正确
- [ ] 链接可以点击
- [ ] 移动端显示正常
- [ ] 品牌信息清晰

---

## 🎯 优势对比

| 方案 | 单语言模板 | 双语模板（推荐） |
|------|-----------|----------------|
| **用户体验** | ⚠️ 可能看不懂 | ✅ 所有用户都能看懂 |
| **维护成本** | ⚠️ 需要维护多个版本 | ✅ 只需维护一个模板 |
| **实现复杂度** | ⚠️ 需要语言检测逻辑 | ✅ 无需额外逻辑 |
| **错误风险** | ⚠️ 语言检测可能失败 | ✅ 零失败风险 |
| **国际化友好** | ⚠️ 需要为每种语言创建模板 | ✅ 天然支持多语言 |

---

**推荐使用双语模板** 🎉

这样无论用户使用什么语言注册，都能看到中英文双语提示，用户体验更好，维护成本更低！
