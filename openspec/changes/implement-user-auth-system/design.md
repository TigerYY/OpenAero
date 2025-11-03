# 用户认证系统设计文档

## 架构决策

### 1. 认证方案选择
**决策**: 使用NextAuth.js + 自定义邮件认证提供者

**理由**:
- **NextAuth.js**: 成熟的认证解决方案，支持多种认证提供者
- **邮件认证**: 符合业务需求，支持邮箱注册和验证
- **可扩展性**: 未来可轻松添加社交登录等认证方式
- **安全性**: 内置CSRF保护、会话管理、密码哈希等安全功能

### 2. 数据库设计策略
**决策**: 使用Prisma ORM管理认证相关数据模型

**数据模型**:
- **User**: 用户基本信息、密码哈希、验证状态
- **Account**: 认证账户关联（支持多认证方式）
- **Session**: 用户会话管理
- **VerificationToken**: 邮箱验证和密码重置令牌

### 3. 邮件服务集成
**决策**: 使用QQ企业邮箱SMTP服务

**配置**:
```env
EMAIL_SERVER=smtp://support@openaero.cn:zdM469e7q3ZU2gy7@smtp.exmail.qq.com:465
EMAIL_FROM=support@openaero.cn
```

## 技术实现细节

### 1. 认证流程设计

#### 用户注册流程
```
1. 用户填写邮箱和密码 → 2. 发送验证邮件 → 3. 用户点击验证链接
4. 验证邮箱 → 5. 创建用户账户 → 6. 自动登录
```

#### 用户登录流程
```
1. 用户输入邮箱和密码 → 2. 验证凭证 → 3. 创建会话
4. 返回JWT令牌 → 5. 前端存储令牌 → 6. 访问受保护资源
```

### 2. 安全考虑

#### 密码安全
- 使用bcrypt进行密码哈希
- 最小密码长度要求（8位及以上）
- 密码强度验证
- 防止暴力破解的速率限制

#### 会话安全
- JWT令牌短期有效（24小时）
- 自动刷新令牌机制
- 安全的令牌存储（HttpOnly Cookie）
- 会话超时自动注销

### 3. 邮件模板设计

#### 邮箱验证邮件
```
主题：请验证您的OpenAero账户邮箱
内容：
尊敬的{username}，

感谢您注册OpenAero平台！请点击以下链接验证您的邮箱：
{verification_url}

此链接将在24小时后失效。
```

#### 密码重置邮件
```
主题：OpenAero密码重置请求
内容：
我们收到了您的密码重置请求。请点击以下链接重置密码：
{reset_url}

如果您没有请求重置密码，请忽略此邮件。
```

## 组件架构

### 1. 后端组件

#### 认证服务 (`/src/lib/auth.ts`)
- NextAuth.js配置
- 自定义邮件认证提供者
- JWT令牌管理
- 会话管理

#### 邮件服务 (`/src/lib/email.ts`)
- SMTP客户端配置
- 邮件模板管理
- 邮件发送队列
- 发送状态追踪

#### 用户服务 (`/src/lib/user.ts`)
- 用户CRUD操作
- 权限检查
- 个人信息管理
- 账户状态管理

### 2. 前端组件

#### 认证组件 (`/src/components/auth/`)
- LoginForm: 登录表单组件
- RegisterForm: 注册表单组件
- ResetPasswordForm: 密码重置表单
- AuthProvider: 认证状态管理

#### 页面组件 (`/src/app/auth/`)
- `/auth/login`: 登录页面
- `/auth/register`: 注册页面
- `/auth/verify-email`: 邮箱验证页面
- `/auth/reset-password`: 密码重置页面

## 部署配置

### 1. 环境变量配置

#### 开发环境
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-key
DATABASE_URL=postgresql://openaero:password@localhost:5432/openaero_dev
EMAIL_SERVER=smtp://support@openaero.cn:password@smtp.exmail.qq.com:465
```

#### 生产环境
```env
NEXTAUTH_URL=https://openaero.cn
NEXTAUTH_SECRET=production-secret-key-from-env
DATABASE_URL=postgresql://user:pass@prod-db:5432/openaero_prod
EMAIL_SERVER=smtp://support@openaero.cn:password@smtp.exmail.qq.com:465
```

### 2. 安全配置

#### JWT配置
- 令牌有效期：24小时
- 刷新令牌有效期：7天
- 签名算法：HS256

#### 会话配置
- Cookie安全设置：Secure、HttpOnly、SameSite=Strict
- 会话超时：24小时自动过期
- 并发会话限制：每个用户最多3个活跃会话

## 监控和运维

### 1. 健康检查
- 数据库连接状态监控
- 邮件服务可用性检查
- 认证API响应时间监控

### 2. 安全监控
- 登录失败次数统计
- 异常登录行为检测
- 密码重置请求频率监控

## 兼容性保证

### 1. API兼容性
- 保持RESTful API设计
- 版本化API端点（v1/auth/*）
- 向后兼容的错误响应格式

### 2. 数据迁移
- 用户数据迁移脚本
- 会话数据清理任务
- 历史数据归档策略