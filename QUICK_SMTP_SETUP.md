# ⚡ SMTP 快速配置指南

## 🎯 3 分钟完成配置

### 步骤 1: 访问 Supabase Dashboard (30秒)

直接访问配置页面:
```
https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/settings/auth
```

### 步骤 2: 启用并配置 SMTP (1分钟)

找到 **SMTP Settings** 部分，点击 **Enable Custom SMTP**，然后复制粘贴以下配置:

```yaml
Sender Name:     OpenAero
Sender Email:    support@openaero.cn
Host:            smtp.exmail.qq.com
Port:            465
Username:        support@openaero.cn
Password:        zdM469e7q3ZU2gy7
SSL/TLS:         ✅ 启用
```

点击 **Save** 保存。

### 步骤 3: 测试配置 (30秒)

在终端运行:
```bash
cd /Users/yangyang/Documents/YYCode/OpenAero/openaero.web
node scripts/test-smtp-config.js
```

如果看到 "✅ SMTP 配置测试完成!"，说明配置成功！

### 步骤 4: 配置邮件模板 (1分钟)

访问邮件模板页面:
```
https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/auth/templates
```

对于每个模板 (Confirm Signup, Reset Password, Magic Link, Change Email):

1. 点击模板名称
2. 复制 `SMTP_CONFIGURATION_STEPS.md` 中对应的 HTML 内容
3. 粘贴到 **Body (HTML)** 字段
4. 更新主题为中文
5. 点击 **Save**

## ✅ 完成!

配置完成后，您的认证系统将:
- ✅ 发送欢迎邮件
- ✅ 发送邮箱验证链接
- ✅ 发送密码重置邮件
- ✅ 使用专业的邮件模板
- ✅ 使用腾讯企业邮箱发送

## 🧪 验证

注册一个测试账户:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

检查邮箱，应该收到验证邮件！

## 📞 遇到问题?

查看详细文档: `SMTP_CONFIGURATION_STEPS.md`
