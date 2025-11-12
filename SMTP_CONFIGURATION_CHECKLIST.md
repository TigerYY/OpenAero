# ✅ Supabase SMTP 配置检查清单

**项目:** OpenAero 用户认证系统  
**更新时间:** 2025-11-12  
**配置方式:** Supabase Auth Settings

---

## 📋 配置信息总览

### Supabase 项目信息
- **项目 ID:** `cardynuoazvaytvinxvm`
- **项目 URL:** `https://cardynuoazvaytvinxvm.supabase.co`
- **Dashboard:** [点击访问 Auth Settings](https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/settings/auth)

### SMTP 配置 (腾讯企业邮箱)

| 字段 | 值 |
|-----|-----|
| **Sender Name** | `OpenAero` |
| **Sender Email** | `support@openaero.cn` |
| **Host** | `smtp.exmail.qq.com` |
| **Port** | `465` |
| **Username** | `support@openaero.cn` |
| **Password** | `zdM469e7q3ZU2gy7` |
| **Enable SSL/TLS** | ✅ 启用 |

---

## ✅ 配置检查清单

### 第一步: 本地环境变量检查

**文件位置:** `.env.local`

- [x] **NEXT_PUBLIC_SUPABASE_URL** = `https://cardynuoazvaytvinxvm.supabase.co`
- [x] **NEXT_PUBLIC_SUPABASE_ANON_KEY** = 已设置
- [x] **SUPABASE_PROJECT_ID** = `cardynuoazvaytvinxvm`
- [x] **SMTP_HOST** = `smtp.exmail.qq.com`
- [x] **SMTP_PORT** = `465`
- [x] **SMTP_USER** = `support@openaero.cn`
- [x] **SMTP_PASS** = `zdM469e7q3ZU2gy7`
- [x] **SMTP_SENDER_EMAIL** = `support@openaero.cn`
- [x] **SMTP_SENDER_NAME** = `OpenAero`
- [x] **SMTP_SECURE** = `true`

**✅ 状态:** 所有环境变量已正确配置

---

### 第二步: Supabase Dashboard 配置

**访问地址:** https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/settings/auth

#### 配置步骤:

- [ ] **1. 访问 Dashboard**
  - 登录 Supabase 账号
  - 进入项目 `cardynuoazvaytvinxvm`
  - 点击 Settings → Auth

- [ ] **2. 启用 Custom SMTP**
  - 滚动到 "SMTP Settings" 部分
  - 点击 "Enable Custom SMTP" 开关

- [ ] **3. 填写配置信息**
  - Sender Name: `OpenAero`
  - Sender Email: `support@openaero.cn`
  - Host: `smtp.exmail.qq.com`
  - Port: `465`
  - Username: `support@openaero.cn`
  - Password: `zdM469e7q3ZU2gy7`

- [ ] **4. 启用 SSL/TLS**
  - ✅ 勾选 "Enable SSL/TLS"

- [ ] **5. 保存配置**
  - 点击 "Save" 按钮
  - 等待 1-2 分钟让配置生效

- [ ] **6. 验证配置**
  - 查看状态是否显示 "Connected"
  - 点击 "Send Test Email" 测试

---

### 第三步: 功能测试

#### 自动化测试

```bash
# 1. 检查配置
node scripts/check-supabase-smtp.js

# 2. 测试 SMTP 连接
node scripts/test-smtp-config.js

# 3. 完整集成测试
node scripts/test-auth-integration.js
```

**检查项:**
- [ ] 所有配置检查通过
- [ ] SMTP 连接测试成功
- [ ] 集成测试通过率 > 80%

#### 浏览器测试

**测试页面:**
- `check-smtp-config.html` - 配置检查页面
- `test-auth-ui.html` - 认证功能测试页面

**测试流程:**
1. [ ] 打开 http://localhost:3000
2. [ ] 点击 "注册" 按钮
3. [ ] 填写注册信息并提交
4. [ ] 检查邮箱是否收到验证邮件
5. [ ] 点击邮件中的验证链接
6. [ ] 验证是否成功激活账号

**预期结果:**
- [ ] 收到来自 `OpenAero <support@openaero.cn>` 的邮件
- [ ] 邮件主题包含 "验证您的邮箱" 或类似内容
- [ ] 邮件中包含可点击的验证链接
- [ ] 点击链接后成功验证邮箱

---

### 第四步: Dashboard 测试

- [ ] **1. 登录 Dashboard**
  - 访问 Auth Settings 页面

- [ ] **2. 发送测试邮件**
  - 在 SMTP Settings 找到 "Send Test Email"
  - 输入您的邮箱地址
  - 点击 "Send" 发送

- [ ] **3. 检查测试邮件**
  - 查看邮箱(包括垃圾邮件文件夹)
  - 确认收到测试邮件
  - 验证发件人显示为 "OpenAero <support@openaero.cn>"

- [ ] **4. 查看 Auth Logs**
  - 在 Dashboard 找到 "Logs" 或 "Auth Logs"
  - 查看邮件发送记录
  - 确认没有错误日志

---

## 🔍 配置验证工具

### 工具 1: 命令行检查

```bash
# 快速检查
cd /Users/yangyang/Documents/YYCode/OpenAero/openaero.web
node scripts/check-supabase-smtp.js
```

### 工具 2: 可视化检查页面

打开浏览器访问:
- `file:///Users/yangyang/Documents/YYCode/OpenAero/openaero.web/check-smtp-config.html`

### 工具 3: 完整测试页面

打开浏览器访问:
- `file:///Users/yangyang/Documents/YYCode/OpenAero/openaero.web/test-auth-ui.html`

---

## ⚠️ 常见问题排查

### 问题 1: 邮件速率限制

**症状:** 提示 "email rate limit exceeded"

**解决方案:**
- [ ] 等待 1 小时后重试
- [ ] 在 Dashboard → Settings → Auth 中调整 Rate Limits
- [ ] 使用不同的测试邮箱地址

### 问题 2: SMTP 连接失败

**症状:** Dashboard 显示连接失败

**检查清单:**
- [ ] 密码是否正确: `zdM469e7q3ZU2gy7`
- [ ] 端口是否正确: `465`
- [ ] SSL/TLS 是否启用: ✅
- [ ] 主机地址是否正确: `smtp.exmail.qq.com`
- [ ] 用户名是否正确: `support@openaero.cn`

### 问题 3: 收不到验证邮件

**检查清单:**
- [ ] SMTP 配置是否已保存并生效
- [ ] 检查邮箱垃圾邮件文件夹
- [ ] 在 Dashboard 查看 Auth Logs
- [ ] 确认邮箱地址拼写正确
- [ ] 检查邮箱服务商是否有拦截

### 问题 4: 邮件进入垃圾箱

**改进措施:**
- [ ] 配置 SPF 记录
- [ ] 配置 DKIM 签名
- [ ] 配置 DMARC 策略
- [ ] 使用企业域名邮箱

---

## 📊 配置完成标准

### 必须完成项 (Critical)

- [x] ✅ 本地环境变量配置正确
- [ ] ⏳ Supabase Dashboard SMTP 配置完成
- [ ] ⏳ SMTP 连接测试通过
- [ ] ⏳ 能够成功发送验证邮件

### 应该完成项 (Important)

- [ ] Dashboard 测试邮件发送成功
- [ ] 用户注册流程完整测试
- [ ] 密码重置邮件测试
- [ ] Auth Logs 无错误记录

### 可选完成项 (Nice to Have)

- [ ] 配置 SPF/DKIM/DMARC
- [ ] 邮件模板自定义
- [ ] 邮件内容优化
- [ ] 多语言邮件支持

---

## 🎯 下一步行动

### 立即执行

1. **访问 Supabase Dashboard**
   - 地址: https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/settings/auth
   - 完成 SMTP 配置

2. **运行配置检查**
   ```bash
   node scripts/check-supabase-smtp.js
   ```

3. **测试 SMTP 连接**
   ```bash
   node scripts/test-smtp-config.js
   ```

### 验证测试

4. **浏览器测试**
   - 打开 `check-smtp-config.html`
   - 逐项检查配置
   - 运行功能测试

5. **实际注册测试**
   - 访问 http://localhost:3000/register
   - 完成注册流程
   - 验证邮件接收

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| `SUPABASE_SMTP_CONFIG_SUMMARY.md` | SMTP 配置总结 |
| `SMTP_CONFIGURATION_STEPS.md` | 详细配置步骤 |
| `SUPABASE_AUTH_COMPLETE.md` | 完整认证系统文档 |
| `AUTH_TESTING_REPORT.md` | 测试报告 |
| `AUTHENTICATION_TESTING_GUIDE.md` | 测试指南 |

## 🛠️ 测试脚本

| 脚本 | 功能 |
|------|------|
| `scripts/check-supabase-smtp.js` | 配置检查 |
| `scripts/test-smtp-config.js` | SMTP 连接测试 |
| `scripts/test-auth-integration.js` | 集成测试 |

## 🌐 测试页面

| 页面 | 功能 |
|------|------|
| `check-smtp-config.html` | 可视化配置检查 |
| `test-auth-ui.html` | 认证功能测试 |

---

## ✅ 配置完成确认

当以下所有项目都打勾时,说明 SMTP 配置已完成:

### Dashboard 配置
- [ ] 访问了 Supabase Dashboard Auth Settings
- [ ] 启用了 Custom SMTP
- [ ] 填写了所有 SMTP 配置字段
- [ ] 启用了 SSL/TLS
- [ ] 保存了配置
- [ ] 等待了 1-2 分钟让配置生效

### 功能测试
- [ ] 命令行配置检查通过
- [ ] SMTP 连接测试成功
- [ ] Dashboard 测试邮件发送成功
- [ ] 用户注册验证邮件发送成功
- [ ] 密码重置邮件发送成功

### 验收标准
- [ ] 能够成功发送邮件
- [ ] 邮件发件人显示正确
- [ ] 邮件内容格式正确
- [ ] 验证链接可正常点击
- [ ] Auth Logs 无错误

---

**配置负责人签字:** _______________  
**完成日期:** _______________  
**验收人签字:** _______________  
**验收日期:** _______________

---

**支持联系:** support@openaero.cn  
**项目地址:** https://github.com/TigerYY/OpenAero  
**文档版本:** 1.0.0
