# OpenAero 认证系统测试指南

> **目标**: 全面测试 Supabase Auth 认证系统的所有功能

---

## 📋 测试清单

### ✅ 已完成配置

- [x] Supabase 数据库迁移
- [x] 用户扩展表创建 (user_profiles, creator_profiles 等)
- [x] RLS 安全策略配置
- [x] 认证服务实现 (AuthService)
- [x] API 路由创建
- [x] SMTP 邮件服务配置
- [x] 邮件模板配置

### 🧪 待测试功能

- [ ] 用户注册
- [ ] 邮箱验证
- [ ] 用户登录
- [ ] 忘记密码
- [ ] 密码重置
- [ ] 用户信息获取
- [ ] 权限控制
- [ ] 登出功能

---

## 1️⃣ 用户注册测试

### 测试方式 A: 使用 API 测试

**使用 curl 命令:**

```bash
# 注册新用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "username": "testuser",
    "fullName": "测试用户"
  }'
```

**预期结果:**
```json
{
  "success": true,
  "message": "注册成功,请检查邮箱验证邮件",
  "data": {
    "user": {
      "id": "uuid...",
      "email": "test@example.com",
      "email_confirmed_at": null
    }
  }
}
```

**验证点:**
- ✅ 返回状态码 201
- ✅ 返回用户 ID
- ✅ 邮箱未验证 (email_confirmed_at 为 null)
- ✅ 在 Supabase Dashboard 的 Authentication → Users 中看到新用户
- ✅ 收到验证邮件

---

### 测试方式 B: 使用前端页面

1. 启动开发服务器:
   ```bash
   npm run dev
   ```

2. 访问注册页面:
   ```
   http://localhost:3000/register
   ```

3. 填写表单:
   - 邮箱: 使用真实邮箱
   - 密码: 至少 8 位,包含大小写字母和数字
   - 用户名: 唯一用户名
   - 姓名: 完整姓名

4. 点击注册按钮

**验证点:**
- ✅ 表单验证正常
- ✅ 注册成功后跳转到验证提示页
- ✅ 收到验证邮件
- ✅ 数据库中创建用户记录

---

## 2️⃣ 邮箱验证测试

### 步骤:

1. **检查邮箱**
   - 打开注册时使用的邮箱
   - 查找来自 `support@openaero.cn` 的邮件
   - 主题: "验证您的邮箱 - OpenAero"

2. **点击验证链接**
   - 邮件中点击 "验证邮箱地址" 按钮
   - 或复制链接到浏览器

3. **验证结果**
   - 跳转到成功页面
   - 显示 "邮箱验证成功"

**在 Supabase Dashboard 验证:**
```
Dashboard → Authentication → Users → 选择用户
```
查看 `email_confirmed_at` 字段应该有时间戳

**使用 API 验证:**
```bash
# 获取用户信息 (需要先登录获取 token)
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 3️⃣ 用户登录测试

### 测试方式 A: API 测试

```bash
# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!"
  }'
```

**预期结果:**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "uuid...",
      "email": "test@example.com",
      "role": "USER"
    },
    "session": {
      "access_token": "eyJ...",
      "refresh_token": "...",
      "expires_at": 1234567890
    }
  }
}
```

**验证点:**
- ✅ 返回 access_token
- ✅ 返回 refresh_token
- ✅ 返回用户信息
- ✅ session 写入 cookie (如果使用 cookie 模式)

---

### 测试方式 B: 前端页面

1. 访问登录页面:
   ```
   http://localhost:3000/login
   ```

2. 输入凭据:
   - 邮箱: test@example.com
   - 密码: Test123456!

3. 点击登录

**验证点:**
- ✅ 登录成功跳转到首页或 Dashboard
- ✅ 显示用户信息
- ✅ 可访问受保护的页面

---

## 4️⃣ 忘记密码测试

### 测试步骤:

1. **请求重置密码**

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**预期结果:**
```json
{
  "success": true,
  "message": "密码重置邮件已发送,请检查邮箱"
}
```

2. **检查邮箱**
   - 收到来自 `support@openaero.cn` 的邮件
   - 主题: "重置密码 - OpenAero"
   - 包含重置链接

3. **点击重置链接**
   - 跳转到重置密码页面
   - URL 包含 token 参数

4. **设置新密码**

```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_FROM_EMAIL",
    "password": "NewPassword123!"
  }'
```

5. **使用新密码登录**
   - 确认可以使用新密码登录
   - 旧密码无法登录

**验证点:**
- ✅ 收到重置邮件
- ✅ 重置链接有效
- ✅ 新密码设置成功
- ✅ 可用新密码登录
- ✅ 旧密码失效

---

## 5️⃣ 用户信息获取测试

### 测试步骤:

1. **先登录获取 token**

2. **获取当前用户信息**

```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**预期结果:**
```json
{
  "success": true,
  "data": {
    "id": "uuid...",
    "email": "test@example.com",
    "username": "testuser",
    "fullName": "测试用户",
    "role": "USER",
    "status": "ACTIVE",
    "emailVerified": true,
    "profile": {
      "avatar": null,
      "bio": null,
      "phoneNumber": null
    }
  }
}
```

**验证点:**
- ✅ 返回完整的用户信息
- ✅ 包含 profile 扩展信息
- ✅ 角色信息正确
- ✅ 未授权请求返回 401

---

## 6️⃣ 权限控制测试

### 测试场景 A: 普通用户访问管理员资源

```bash
# 普通用户 token 访问管理员 API
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer USER_TOKEN"
```

**预期结果:**
```json
{
  "success": false,
  "error": "权限不足"
}
```

---

### 测试场景 B: 创建管理员并测试

1. **在 Supabase Dashboard 手动提升用户权限:**

```sql
-- 在 SQL Editor 中执行
UPDATE public.user_profiles 
SET role = 'ADMIN' 
WHERE user_id = 'USER_UUID';
```

2. **重新登录获取新 token**

3. **访问管理员资源:**

```bash
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**验证点:**
- ✅ 管理员可以访问管理资源
- ✅ 普通用户被拒绝
- ✅ 未登录用户返回 401

---

## 7️⃣ 登出功能测试

### 测试步骤:

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**预期结果:**
```json
{
  "success": true,
  "message": "登出成功"
}
```

**验证点:**
- ✅ Session 被删除
- ✅ Cookie 被清除
- ✅ 使用旧 token 访问 API 返回 401
- ✅ 在 user_sessions 表中 is_active 设为 false

---

## 8️⃣ 数据库检查

### 检查用户表

```sql
-- 查看所有用户
SELECT * FROM auth.users;

-- 查看用户扩展信息
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.username,
  p.full_name,
  p.role,
  p.status,
  p.created_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id;
```

### 检查会话日志

```sql
-- 查看最近的会话
SELECT * FROM public.user_sessions 
ORDER BY created_at DESC 
LIMIT 10;
```

### 检查审计日志

```sql
-- 查看最近的操作日志
SELECT * FROM public.audit_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## 9️⃣ 安全性测试

### 测试 A: SQL 注入防护

```bash
# 尝试 SQL 注入
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com OR 1=1--",
    "password": "anything"
  }'
```

**预期结果:** 登录失败,没有异常错误

---

### 测试 B: XSS 防护

```bash
# 尝试 XSS
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "username": "<script>alert(1)</script>",
    "fullName": "Test"
  }'
```

**预期结果:** 输入被转义或拒绝

---

### 测试 C: 暴力破解防护

```bash
# 尝试多次错误登录
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "wrongpassword'$i'"
    }'
done
```

**预期结果:** 
- 多次失败后账号被锁定
- 或触发验证码要求

---

## 🔟 性能测试

### 并发登录测试

使用 Apache Bench:

```bash
# 安装 ab
brew install apache2

# 创建测试数据文件
cat > login.json << EOF
{
  "email": "test@example.com",
  "password": "Test123456!"
}
EOF

# 并发测试
ab -n 100 -c 10 -p login.json -T application/json \
  http://localhost:3000/api/auth/login
```

**关注指标:**
- 平均响应时间 < 500ms
- 成功率 > 99%
- 无内存泄漏

---

## 📊 测试报告模板

完成所有测试后,填写以下报告:

```markdown
# OpenAero 认证系统测试报告

**测试日期:** YYYY-MM-DD
**测试人员:** 姓名
**环境:** 开发/生产

## 功能测试结果

| 功能 | 状态 | 备注 |
|-----|------|------|
| 用户注册 | ✅/❌ | |
| 邮箱验证 | ✅/❌ | |
| 用户登录 | ✅/❌ | |
| 忘记密码 | ✅/❌ | |
| 密码重置 | ✅/❌ | |
| 用户信息 | ✅/❌ | |
| 权限控制 | ✅/❌ | |
| 登出功能 | ✅/❌ | |

## 安全测试结果

| 测试项 | 状态 | 备注 |
|-------|------|------|
| SQL注入防护 | ✅/❌ | |
| XSS防护 | ✅/❌ | |
| CSRF防护 | ✅/❌ | |
| 暴力破解防护 | ✅/❌ | |

## 性能测试结果

- 平均响应时间: ___ ms
- 并发处理能力: ___ req/s
- 成功率: ____%

## 发现的问题

1. 问题描述
   - 严重程度: 高/中/低
   - 复现步骤: ...
   - 建议修复: ...

## 总体评价

[ ] 通过 - 可以上线
[ ] 需修复 - 有问题需要解决
[ ] 重大问题 - 不建议上线
```

---

## 🚀 快速测试脚本

我已经为您创建了自动化测试脚本:

```bash
# 运行完整测试套件
npm run test:auth

# 或单独运行
node scripts/test-auth-flow.js
```

---

## 📞 需要帮助?

遇到问题时:

1. 查看日志:
   ```bash
   # 应用日志
   tail -f logs/app.log
   
   # Supabase 日志
   Dashboard → Logs
   ```

2. 检查数据库:
   ```
   Dashboard → SQL Editor
   ```

3. 联系支持:
   - Email: support@openaero.cn
   - 技术文档: /DOCS

---

**祝测试顺利!** 🎉
