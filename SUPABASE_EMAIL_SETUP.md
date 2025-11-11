# Supabase 邮件服务配置指南

## 📧 配置腾讯企业邮箱 SMTP

### 1. 在 Supabase Dashboard 中配置 SMTP

1. **登录 Supabase Dashboard**
   - 访问: https://supabase.com/dashboard/project/cardynuoazvaytvinxvm

2. **进入邮件设置**
   - 点击左侧菜单 **Settings** (齿轮图标)
   - 选择 **Auth** 选项卡
   - 滚动到 **SMTP Settings** 部分

3. **启用自定义 SMTP**
   - 点击 **Enable Custom SMTP**

4. **填写 SMTP 配置**
   ```
   Sender Email: support@openaero.cn
   Sender Name: OpenAero
   
   SMTP Host: smtp.exmail.qq.com
   SMTP Port: 465
   SMTP Username: support@openaero.cn
   SMTP Password: zdM469e7q3ZU2gy7
   
   Enable SSL/TLS: ✓ (勾选)
   ```

5. **保存配置**
   - 点击 **Save** 按钮

### 2. 配置邮件模板

在 **Auth** > **Email Templates** 中自定义邮件模板:

#### 2.1 确认邮箱模板 (Confirm Signup)

**主题:** 欢迎加入 OpenAero - 请验证您的邮箱

**内容:**
```html
<h2>欢迎加入 OpenAero! 🎉</h2>

<p>你好 {{ .Email }},</p>

<p>感谢您注册 OpenAero 平台！请点击下面的按钮验证您的邮箱:</p>

<p>
  <a href="{{ .ConfirmationURL }}" 
     style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">
    验证邮箱
  </a>
</p>

<p>或复制以下链接到浏览器:</p>
<p>{{ .ConfirmationURL }}</p>

<p>此链接将在 24 小时后过期。</p>

<p>如果您没有注册此账户，请忽略此邮件。</p>

<hr>
<p style="color: #666; font-size: 12px;">
  © 2025 OpenAero. All rights reserved.<br>
  contact@openaero.cn
</p>
```

#### 2.2 邀请用户模板 (Invite User)

**主题:** 您被邀请加入 OpenAero

**内容:**
```html
<h2>您被邀请加入 OpenAero</h2>

<p>你好,</p>

<p>您收到了 OpenAero 平台的邀请。点击下面的按钮接受邀请:</p>

<p>
  <a href="{{ .ConfirmationURL }}" 
     style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">
    接受邀请
  </a>
</p>

<p>或复制以下链接到浏览器:</p>
<p>{{ .ConfirmationURL }}</p>

<hr>
<p style="color: #666; font-size: 12px;">
  © 2025 OpenAero. All rights reserved.
</p>
```

#### 2.3 魔法链接模板 (Magic Link)

**主题:** OpenAero - 您的登录链接

**内容:**
```html
<h2>登录 OpenAero</h2>

<p>你好,</p>

<p>点击下面的按钮登录您的账户:</p>

<p>
  <a href="{{ .ConfirmationURL }}" 
     style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">
    登录账户
  </a>
</p>

<p>或复制以下链接到浏览器:</p>
<p>{{ .ConfirmationURL }}</p>

<p>此链接将在 1 小时后过期。</p>

<p>如果您没有请求此链接，请忽略此邮件。</p>

<hr>
<p style="color: #666; font-size: 12px;">
  © 2025 OpenAero. All rights reserved.
</p>
```

#### 2.4 更换邮箱模板 (Change Email)

**主题:** OpenAero - 确认邮箱变更

**内容:**
```html
<h2>确认邮箱变更</h2>

<p>你好,</p>

<p>您请求将账户邮箱更改为此地址。点击下面的按钮确认:</p>

<p>
  <a href="{{ .ConfirmationURL }}" 
     style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">
    确认变更
  </a>
</p>

<p>或复制以下链接到浏览器:</p>
<p>{{ .ConfirmationURL }}</p>

<p>如果您没有请求此变更，请立即联系我们的支持团队。</p>

<hr>
<p style="color: #666; font-size: 12px;">
  © 2025 OpenAero. All rights reserved.
</p>
```

#### 2.5 重置密码模板 (Reset Password)

**主题:** OpenAero - 重置密码请求

**内容:**
```html
<h2>🔐 重置密码</h2>

<p>你好,</p>

<p>我们收到了重置您账户密码的请求。点击下面的按钮重置密码:</p>

<p>
  <a href="{{ .ConfirmationURL }}" 
     style="display: inline-block; padding: 12px 30px; background: #f44336; color: white; text-decoration: none; border-radius: 5px;">
    重置密码
  </a>
</p>

<p>或复制以下链接到浏览器:</p>
<p>{{ .ConfirmationURL }}</p>

<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
  <strong>⚠️ 安全提示:</strong>
  <ul>
    <li>此链接将在 1 小时后过期</li>
    <li>如果您没有请求重置密码，请忽略此邮件</li>
    <li>不要与任何人分享此链接</li>
  </ul>
</div>

<hr>
<p style="color: #666; font-size: 12px;">
  © 2025 OpenAero. All rights reserved.
</p>
```

### 3. 配置重定向 URL

在 **Auth** > **URL Configuration** 中配置:

```
Site URL: http://localhost:3000 (开发环境)
         https://openaero.cn (生产环境)

Redirect URLs (每行一个):
http://localhost:3000/**
https://openaero.cn/**
http://localhost:3000/auth/callback
https://openaero.cn/auth/callback
```

### 4. 邮件发送速率限制

在 **Auth** > **Rate Limits** 中配置:

```
Email Limit: 4 emails per hour (防止滥用)
```

### 5. 测试邮件配置

#### 方法 1: 使用 Supabase Dashboard

1. 在 **Auth** > **SMTP Settings** 中
2. 点击 **Send Test Email** 按钮
3. 输入测试邮箱地址
4. 检查是否收到测试邮件

#### 方法 2: 使用代码测试

创建测试脚本 `scripts/test-email.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testEmail() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'TestPassword123!',
  });

  if (error) {
    console.error('❌ 错误:', error.message);
  } else {
    console.log('✅ 注册成功! 请检查邮箱:', data.user?.email);
  }
}

testEmail();
```

运行测试:
```bash
node scripts/test-email.js
```

## 📝 注意事项

1. **腾讯企业邮箱限制**
   - 每天发送限制: 1000 封/天
   - 每小时限制: 100 封/小时
   - 建议在生产环境监控发送量

2. **安全建议**
   - 不要在客户端代码中暴露 SMTP 密码
   - 定期更换 SMTP 密码
   - 启用 SMTP 登录日志监控

3. **备用方案**
   - 如果腾讯企业邮箱遇到问题，可以考虑:
     - SendGrid (免费额度: 100封/天)
     - AWS SES (成本低)
     - Mailgun (前 5000 封免费)

## ✅ 配置完成检查清单

- [ ] SMTP 设置已保存
- [ ] 邮件模板已自定义
- [ ] 重定向 URL 已配置
- [ ] 速率限制已设置
- [ ] 测试邮件发送成功
- [ ] 注册流程测试通过
- [ ] 密码重置流程测试通过

## 🔧 故障排查

### 问题1: 邮件发送失败

**可能原因:**
- SMTP 密码错误
- 端口被防火墙阻止
- 腾讯企业邮箱 SMTP 未启用

**解决方法:**
1. 检查 SMTP 配置是否正确
2. 在腾讯企业邮箱管理后台启用 SMTP
3. 尝试使用端口 25 或 587

### 问题2: 邮件进入垃圾箱

**解决方法:**
1. 配置 SPF 记录
2. 配置 DKIM 签名
3. 配置 DMARC 策略

### 问题3: 发送频率超限

**解决方法:**
1. 实现邮件队列系统
2. 使用多个 SMTP 账户轮询
3. 升级到更高级别的邮件服务

## 📞 支持

如有问题，请联系:
- 技术支持: contact@openaero.cn
- 文档: https://supabase.com/docs/guides/auth/auth-smtp
