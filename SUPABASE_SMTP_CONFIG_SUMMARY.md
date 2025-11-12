# Supabase Auth SMTP 配置总结

**项目:** OpenAero  
**更新时间:** 2025-11-12  
**配置状态:** ✅ 环境变量已配置

---

## 📋 当前配置信息

### 1. Supabase 项目信息

| 配置项 | 值 | 状态 |
|--------|-----|------|
| **项目 ID** | `cardynuoazvaytvinxvm` | ✅ 已设置 |
| **项目 URL** | `https://cardynuoazvaytvinxvm.supabase.co` | ✅ 已设置 |
| **Dashboard URL** | `https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/settings/auth` | 🔗 点击访问 |

### 2. SMTP 配置信息 (腾讯企业邮箱)

| 字段 | 值 | 说明 |
|-----|-----|-----|
| **Sender Name** | `OpenAero` | 邮件发件人显示名称 |
| **Sender Email** | `support@openaero.cn` | 发件人邮箱地址 |
| **Host** | `smtp.exmail.qq.com` | 腾讯企业邮箱 SMTP 服务器 |
| **Port** | `465` | SMTP 端口 (SSL/TLS) |
| **Username** | `support@openaero.cn` | SMTP 认证用户名 |
| **Password** | `zdM469e7q3ZU2gy7` | SMTP 认证密码 |
| **Enable SSL/TLS** | ✅ 启用 | 使用加密连接 |

### 3. 环境变量配置 (`.env.local`)

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://cardynuoazvaytvinxvm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_PROJECT_ID=cardynuoazvaytvinxvm

# SMTP 邮件服务配置
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=465
SMTP_USER=support@openaero.cn
SMTP_PASS=zdM469e7q3ZU2gy7
SMTP_SENDER_EMAIL=support@openaero.cn
SMTP_SENDER_NAME=OpenAero
SMTP_SECURE=true
```

**✅ 状态:** 所有环境变量已正确配置

---

## 🔧 Supabase Dashboard 配置步骤

### 步骤 1: 访问 Auth Settings

1. 打开浏览器访问: [Supabase Dashboard - Auth Settings](https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/settings/auth)
2. 登录您的 Supabase 账号

### 步骤 2: 启用 Custom SMTP

在 Auth Settings 页面中:

1. 滚动到 **"SMTP Settings"** 部分
2. 点击 **"Enable Custom SMTP"** 开关

### 步骤 3: 填写 SMTP 配置

按照以下信息填写表单:

```
┌─────────────────────────────────────────────────┐
│ Sender Name       │ OpenAero                    │
├─────────────────────────────────────────────────┤
│ Sender Email      │ support@openaero.cn        │
├─────────────────────────────────────────────────┤
│ Host              │ smtp.exmail.qq.com         │
├─────────────────────────────────────────────────┤
│ Port              │ 465                        │
├─────────────────────────────────────────────────┤
│ Username          │ support@openaero.cn        │
├─────────────────────────────────────────────────┤
│ Password          │ zdM469e7q3ZU2gy7           │
├─────────────────────────────────────────────────┤
│ Enable SSL/TLS    │ ✅ 勾选                    │
└─────────────────────────────────────────────────┘
```

### 步骤 4: 保存配置

1. 检查所有字段是否正确填写
2. 确保 **"Enable SSL/TLS"** 已勾选
3. 点击 **"Save"** 按钮保存配置

### 步骤 5: 验证配置

配置保存后:
- 等待 **1-2 分钟** 让配置生效
- Supabase 会自动验证 SMTP 连接
- 如果配置正确,状态应显示为 "Connected" 或 "Active"

---

## 🧪 测试 SMTP 配置

### 方法 1: 使用测试脚本

运行自动化测试脚本:

```bash
# 检查配置
node scripts/check-supabase-smtp.js

# 测试 SMTP 连接
node scripts/test-smtp-config.js
```

### 方法 2: Supabase Dashboard 测试

1. 在 Auth Settings 页面
2. 找到 SMTP Settings 部分
3. 点击 **"Send Test Email"** 按钮
4. 输入您的邮箱地址
5. 检查是否收到测试邮件

### 方法 3: 实际注册测试

1. 访问: http://localhost:3000/register
2. 填写注册表单并提交
3. 检查注册邮箱是否收到验证邮件

**预期结果:**
- ✅ 收到来自 `OpenAero <support@openaero.cn>` 的邮件
- ✅ 邮件包含邮箱验证链接
- ✅ 点击链接可成功验证邮箱

---

## ⚠️ 常见问题

### 1. 邮件速率限制

**问题:** 测试时提示 "email rate limit exceeded"

**原因:** Supabase Auth 有默认的邮件发送速率限制

**解决方案:**
- 等待 1 小时后再试
- 在 Dashboard 的 "Rate Limits" 中调整限制
- 使用不同的测试邮箱

### 2. SMTP 连接失败

**问题:** Dashboard 显示 SMTP 连接失败

**可能原因:**
- SMTP 密码错误
- 端口配置错误(应使用 465)
- 未启用 SSL/TLS
- 防火墙阻止了连接

**解决步骤:**
1. 重新检查所有配置项
2. 确认密码正确: `zdM469e7q3ZU2gy7`
3. 确认端口: `465`
4. 确认 SSL/TLS 已启用

### 3. 收不到验证邮件

**问题:** 注册成功但没有收到邮件

**检查清单:**
- [ ] SMTP 配置是否已保存
- [ ] 是否等待了 1-2 分钟让配置生效
- [ ] 检查垃圾邮件文件夹
- [ ] 检查邮箱地址是否正确
- [ ] 在 Dashboard 查看 Auth Logs

**调试方法:**
```bash
# 查看详细日志
DEBUG_AUTH=true node scripts/test-smtp-config.js
```

### 4. 邮件被标记为垃圾邮件

**问题:** 邮件进入垃圾箱

**改进建议:**
1. 配置 SPF 记录
2. 配置 DKIM 记录
3. 配置 DMARC 记录
4. 使用专业的域名邮箱

---

## 📊 配置检查清单

### Supabase Dashboard

- [ ] 访问 Auth Settings 页面
- [ ] 启用 Custom SMTP
- [ ] 填写所有 SMTP 配置字段
- [ ] 启用 SSL/TLS
- [ ] 保存配置
- [ ] 等待 1-2 分钟
- [ ] 发送测试邮件
- [ ] 确认测试邮件收到

### 本地环境

- [x] `.env.local` 文件存在
- [x] `NEXT_PUBLIC_SUPABASE_URL` 已设置
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已设置
- [x] `SMTP_HOST` 已设置
- [x] `SMTP_PORT` 已设置
- [x] `SMTP_USER` 已设置
- [x] `SMTP_PASS` 已设置
- [x] `SMTP_SENDER_EMAIL` 已设置
- [x] `SMTP_SENDER_NAME` 已设置

### 应用功能

- [ ] 用户注册功能正常
- [ ] 邮箱验证邮件发送
- [ ] 密码重置邮件发送
- [ ] 邮件内容显示正确
- [ ] 邮件链接可正常点击

---

## 🔗 相关资源

### 文档

- [SMTP_CONFIGURATION_STEPS.md](./SMTP_CONFIGURATION_STEPS.md) - 详细配置步骤
- [QUICK_SMTP_SETUP.md](./QUICK_SMTP_SETUP.md) - 快速配置指南
- [SUPABASE_AUTH_COMPLETE.md](./SUPABASE_AUTH_COMPLETE.md) - 完整认证系统文档
- [AUTHENTICATION_TESTING_GUIDE.md](./AUTHENTICATION_TESTING_GUIDE.md) - 测试指南

### 测试脚本

- `scripts/check-supabase-smtp.js` - SMTP 配置检查
- `scripts/test-smtp-config.js` - SMTP 连接测试
- `scripts/test-auth-integration.js` - 认证系统集成测试

### 官方文档

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [腾讯企业邮箱帮助](https://service.exmail.qq.com/)

---

## 📞 支持

如果配置过程中遇到问题:

1. **检查日志:** 查看 Supabase Dashboard 的 Auth Logs
2. **运行测试:** 使用提供的测试脚本诊断问题
3. **查看文档:** 阅读相关配置文档
4. **联系支持:** support@openaero.cn

---

**最后更新:** 2025-11-12  
**维护者:** OpenAero Team  
**版本:** 1.0.0
