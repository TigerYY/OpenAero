# OpenAero SMTP 配置详细步骤指南

> **目标**: 在 Supabase 中配置腾讯企业邮箱 SMTP,实现自动发送注册验证、密码重置等邮件

---

## 📋 目录

1. [前置准备](#前置准备)
2. [配置 SMTP 服务器](#配置-smtp-服务器)
3. [配置邮件模板](#配置邮件模板)
4. [测试邮件发送](#测试邮件发送)
5. [故障排查](#故障排查)
6. [常见问题](#常见问题)

---

## 1️⃣ 前置准备

### ✅ 已准备的资源

- **企业邮箱**: `support@openaero.cn`
- **SMTP 服务器**: `smtp.exmail.qq.com`
- **SMTP 端口**: `465` (SSL/TLS)
- **邮箱密码**: `zdM469e7q3ZU2gy7`

### 📌 注意事项

- 确保您有 Supabase 项目的管理员权限
- 确保企业邮箱已激活且可正常发送邮件
- 建议在非工作时间配置,避免影响现有用户

---

## 2️⃣ 配置 SMTP 服务器

### 步骤 1: 访问 Supabase 项目设置

1. **打开 Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/cardynuoazvaytvinxvm
   ```

2. **进入 Authentication 设置**
   - 点击左侧菜单的 **Authentication**
   - 选择 **Settings** 子菜单
   - 或直接访问: https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/settings/auth

### 步骤 2: 启用自定义 SMTP

在 **Auth Settings** 页面中,向下滚动找到 **SMTP Settings** 部分:

1. **启用自定义 SMTP**
   - 找到 "Enable Custom SMTP" 开关
   - 点击开关,将其设置为 **ON** (绿色)

2. **填写 SMTP 配置信息**

   | 字段 | 值 | 说明 |
   |-----|-----|-----|
   | **Sender Name** | `OpenAero` | 邮件发件人显示名称 |
   | **Sender Email** | `support@openaero.cn` | 发件人邮箱地址 |
   | **Host** | `smtp.exmail.qq.com` | 腾讯企业邮箱 SMTP 服务器 |
   | **Port** | `465` | SMTP 端口 (SSL/TLS) |
   | **Username** | `support@openaero.cn` | SMTP 认证用户名 |
   | **Password** | `zdM469e7q3ZU2gy7` | SMTP 认证密码 |

3. **启用 SSL/TLS**
   - 找到 "Enable SSL/TLS" 选项
   - 勾选此选项 ✅

4. **保存配置**
   - 检查所有信息是否正确
   - 点击页面底部的 **Save** 按钮
   - 等待提示 "Settings saved successfully"

### 步骤 3: 验证配置

1. **发送测试邮件** (如果页面提供此功能)
   - 在 SMTP Settings 部分找到 "Send Test Email" 按钮
   - 输入您的个人邮箱地址
   - 点击发送
   - 检查邮箱是否收到测试邮件

2. **检查状态**
   - 确保 SMTP 状态显示为 "Connected" 或 "Active"
   - 如果显示错误,请参考 [故障排查](#故障排查) 部分

---

## 3️⃣ 配置邮件模板

### 步骤 1: 访问邮件模板设置

1. **进入 Email Templates**
   - 在 Authentication 菜单中
   - 选择 **Email Templates**
   - 或直接访问: https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/auth/templates

### 步骤 2: 配置各类邮件模板

Supabase 提供 4 种邮件模板,您需要为每种模板配置自定义内容:

#### 📧 A. Confirm Signup (邮箱验证)

**用途**: 新用户注册时发送验证邮件

1. 点击 **Confirm Signup** 模板
2. 在编辑器中替换为以下 HTML:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>验证您的邮箱 - OpenAero</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">OpenAero</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px;">创作者社区平台</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">欢迎加入 OpenAero!</h2>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                感谢您注册 OpenAero 账号。请点击下方按钮验证您的邮箱地址,以完成注册流程。
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{ .ConfirmationURL }}" 
                   style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                  验证邮箱地址
                </a>
              </div>
              
              <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                如果按钮无法点击,请复制以下链接到浏览器地址栏访问:<br>
                <a href="{{ .ConfirmationURL }}" style="color: #667eea; word-break: break-all;">{{ .ConfirmationURL }}</a>
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee;">
                <p style="margin: 0; color: #999999; font-size: 14px;">
                  <strong>注意:</strong> 此链接将在 24 小时后失效。
                </p>
                <p style="margin: 10px 0 0 0; color: #999999; font-size: 14px;">
                  如果您未注册 OpenAero 账号,请忽略此邮件。
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                © 2025 OpenAero. All rights reserved.
              </p>
              <p style="margin: 0; color: #cccccc; font-size: 12px;">
                如有疑问,请联系: <a href="mailto:support@openaero.cn" style="color: #667eea; text-decoration: none;">support@openaero.cn</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

3. **设置邮件主题**
   - Subject: `验证您的邮箱 - OpenAero`

4. 点击 **Save** 保存

---

#### 🔑 B. Reset Password (密码重置)

**用途**: 用户忘记密码时发送重置链接

1. 点击 **Reset Password** 模板
2. 替换为以下 HTML:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>重置密码 - OpenAero</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🔐 密码重置</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">重置您的密码</h2>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                我们收到了您的密码重置请求。点击下方按钮设置新密码。
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{ .ConfirmationURL }}" 
                   style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                  重置密码
                </a>
              </div>
              
              <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                如果按钮无法点击,请复制以下链接到浏览器:<br>
                <a href="{{ .ConfirmationURL }}" style="color: #f5576c; word-break: break-all;">{{ .ConfirmationURL }}</a>
              </p>
              
              <div style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>⚠️ 安全提示:</strong>
                </p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #856404; font-size: 14px;">
                  <li>此链接将在 1 小时后失效</li>
                  <li>如果您未请求重置密码,请忽略此邮件</li>
                  <li>如有异常,请立即联系我们</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                © 2025 OpenAero. All rights reserved.
              </p>
              <p style="margin: 0; color: #cccccc; font-size: 12px;">
                联系我们: <a href="mailto:support@openaero.cn" style="color: #f5576c; text-decoration: none;">support@openaero.cn</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

3. **设置邮件主题**
   - Subject: `重置密码 - OpenAero`

4. 点击 **Save** 保存

---

#### ✨ C. Magic Link (魔法链接登录)

**用途**: 用户使用无密码登录时发送

1. 点击 **Magic Link** 模板
2. 替换为以下 HTML:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录链接 - OpenAero</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">✨ 快捷登录</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">您的登录链接</h2>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                点击下方按钮即可登录 OpenAero,无需输入密码。
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{ .ConfirmationURL }}" 
                   style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                  一键登录
                </a>
              </div>
              
              <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                如果按钮无法点击,请复制以下链接:<br>
                <a href="{{ .ConfirmationURL }}" style="color: #4facfe; word-break: break-all;">{{ .ConfirmationURL }}</a>
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee;">
                <p style="margin: 0; color: #999999; font-size: 14px;">
                  <strong>注意:</strong> 此链接仅可使用一次,有效期 15 分钟。
                </p>
                <p style="margin: 10px 0 0 0; color: #999999; font-size: 14px;">
                  如果您未请求登录,请忽略此邮件。
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                © 2025 OpenAero. All rights reserved.
              </p>
              <p style="margin: 0; color: #cccccc; font-size: 12px;">
                联系我们: <a href="mailto:support@openaero.cn" style="color: #4facfe; text-decoration: none;">support@openaero.cn</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

3. **设置邮件主题**
   - Subject: `您的登录链接 - OpenAero`

4. 点击 **Save** 保存

---

#### 📧 D. Change Email (更换邮箱)

**用途**: 用户更换邮箱时验证新邮箱

1. 点击 **Change Email** 模板
2. 替换为以下 HTML:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>确认邮箱更换 - OpenAero</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: bold;">📧 确认邮箱更换</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">验证新邮箱地址</h2>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                我们收到了您更换邮箱的请求。请点击下方按钮确认此邮箱地址属于您。
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{ .ConfirmationURL }}" 
                   style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                  确认更换邮箱
                </a>
              </div>
              
              <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                如果按钮无法点击,请复制以下链接:<br>
                <a href="{{ .ConfirmationURL }}" style="color: #667eea; word-break: break-all;">{{ .ConfirmationURL }}</a>
              </p>
              
              <div style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>⚠️ 重要提示:</strong>
                </p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #856404; font-size: 14px;">
                  <li>确认后,您的账号将绑定至此邮箱</li>
                  <li>旧邮箱将无法再用于登录</li>
                  <li>如非本人操作,请立即联系客服</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                © 2025 OpenAero. All rights reserved.
              </p>
              <p style="margin: 0; color: #cccccc; font-size: 12px;">
                联系我们: <a href="mailto:support@openaero.cn" style="color: #667eea; text-decoration: none;">support@openaero.cn</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

3. **设置邮件主题**
   - Subject: `确认邮箱更换 - OpenAero`

4. 点击 **Save** 保存

---

## 4️⃣ 测试邮件发送

### 方式 1: 使用测试脚本

由于存在速率限制,建议等待一段时间后运行:

```bash
cd /Users/yangyang/Documents/YYCode/OpenAero/openaero.web
node scripts/test-smtp-config.js
```

### 方式 2: 通过注册流程测试

1. 访问您的应用注册页面
2. 使用真实邮箱注册新账号
3. 检查邮箱是否收到验证邮件
4. 点击验证链接确认功能正常

### 方式 3: 在 Dashboard 手动测试

某些 Supabase 版本提供 "Send Test Email" 功能:

1. 在 SMTP Settings 页面
2. 找到测试邮件功能
3. 输入邮箱地址发送测试

---

## 5️⃣ 故障排查

### ❌ 问题: 无法保存 SMTP 配置

**可能原因:**
- 用户名或密码错误
- SMTP 服务器地址或端口错误
- SSL/TLS 设置不匹配

**解决方案:**
1. 确认腾讯企业邮箱是否已开启 SMTP 服务
2. 登录 https://exmail.qq.com 检查邮箱状态
3. 确认密码是否为独立密码(而非登录密码)
4. 联系腾讯企业邮箱管理员确认配置

---

### ❌ 问题: 测试邮件未收到

**可能原因:**
- 邮件在垃圾箱中
- SMTP 配置延迟生效
- 速率限制

**解决方案:**
1. 检查垃圾邮件文件夹
2. 等待 5-10 分钟后重试
3. 检查 Supabase 日志:
   ```
   Dashboard → Logs → Edge Functions
   ```
4. 使用以下命令检查状态:
   ```bash
   node scripts/check-smtp-status.js
   ```

---

### ❌ 问题: Rate Limit Exceeded

**错误信息:**
```
Email rate limit exceeded
```

**解决方案:**
- Supabase 限制邮件发送频率
- 免费版: 每小时 3-4 封邮件
- 付费版: 根据套餐不同
- 等待 1 小时后重试,或升级套餐

---

### ❌ 问题: Authentication Failed

**错误信息:**
```
535 Error: authentication failed
```

**解决方案:**
1. 确认用户名是完整的邮箱地址: `support@openaero.cn`
2. 确认密码正确: `zdM469e7q3ZU2gy7`
3. 确认端口和 SSL/TLS 设置匹配:
   - 端口 465 → SSL/TLS: 启用
   - 端口 587 → STARTTLS: 启用

---

## 6️⃣ 常见问题

### Q1: 为什么使用 465 端口而不是 587?

**A:** 
- **465**: SSL/TLS 加密,直接建立安全连接,推荐使用
- **587**: STARTTLS,先建立普通连接再升级,部分环境可能不稳定

腾讯企业邮箱两者都支持,但 465 更稳定。

---

### Q2: SMTP 配置后多久生效?

**A:** 
- 通常立即生效
- 部分情况可能需要 5-10 分钟
- 如超过 30 分钟未生效,请检查配置或联系 Supabase 支持

---

### Q3: 可以使用其他邮箱服务吗?

**A:** 
可以!常见 SMTP 配置:

| 服务商 | SMTP 服务器 | 端口 | SSL |
|-------|------------|------|-----|
| 腾讯企业邮 | smtp.exmail.qq.com | 465 | ✅ |
| Gmail | smtp.gmail.com | 465/587 | ✅ |
| Outlook | smtp-mail.outlook.com | 587 | ✅ |
| 阿里企业邮 | smtp.mxhichina.com | 465 | ✅ |
| SendGrid | smtp.sendgrid.net | 587 | ✅ |

---

### Q4: 如何查看邮件发送日志?

**A:** 
1. Supabase Dashboard → **Logs** → **Edge Functions**
2. 搜索关键词: `email`, `smtp`, `mailer`
3. 查看详细错误信息

---

### Q5: 邮件被标记为垃圾邮件怎么办?

**A:** 
1. **配置 SPF 记录**:
   ```
   v=spf1 include:spf.mail.qq.com -all
   ```

2. **配置 DKIM**:
   - 登录腾讯企业邮箱管理后台
   - 开启 DKIM 签名
   - 添加 DNS 记录

3. **配置 DMARC**:
   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@openaero.cn
   ```

4. **发件人信誉**:
   - 确保发件人邮箱有良好的发送历史
   - 避免短时间内大量发送
   - 提供退订链接

---

## 📊 配置检查清单

完成配置后,请确认以下各项:

- [ ] ✅ SMTP 服务器地址: `smtp.exmail.qq.com`
- [ ] ✅ SMTP 端口: `465`
- [ ] ✅ 用户名: `support@openaero.cn`
- [ ] ✅ 密码: `zdM469e7q3ZU2gy7`
- [ ] ✅ SSL/TLS: 已启用
- [ ] ✅ Sender Email: `support@openaero.cn`
- [ ] ✅ Sender Name: `OpenAero`
- [ ] ✅ 4 个邮件模板已配置
- [ ] ✅ 测试邮件发送成功
- [ ] ✅ 邮件未进垃圾箱

---

## 📞 需要帮助?

如果遇到任何问题:

1. **查看日志**:
   ```bash
   node scripts/check-smtp-status.js
   ```

2. **联系技术支持**:
   - Email: support@openaero.cn
   - Supabase Support: https://supabase.com/support

3. **参考文档**:
   - [Supabase SMTP 官方文档](https://supabase.com/docs/guides/auth/auth-smtp)
   - [腾讯企业邮箱帮助中心](https://service.exmail.qq.com/)

---

**配置完成后,您的 OpenAero 认证系统将完全可用!** 🎉
