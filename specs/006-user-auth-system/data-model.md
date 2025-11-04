# Data Model: User Authentication System

## Core Entities

### User Entity
**Description**: 平台用户，包含认证和基本信息

**Fields**:
- `id` (String, @id) - 用户唯一标识
- `email` (String, @unique) - 邮箱地址（登录用户名）
- `password` (String) - 密码哈希（bcrypt加密）
- `firstName` (String?) - 名字
- `lastName` (String?) - 姓氏
- `avatar` (String?) - 头像URL
- `role` (UserRole) - 用户角色：USER, CREATOR, ADMIN, SUPER_ADMIN
- `emailVerified` (Boolean) - 邮箱验证状态
- `createdAt` (DateTime) - 创建时间
- `updatedAt` (DateTime) - 更新时间

**Relationships**:
- `creatorProfile` (CreatorProfile?) - 创作者档案（一对一）
- `sessions` (UserSession[]) - 用户会话（一对多）
- `emailVerifications` (EmailVerification[]) - 邮箱验证记录（一对多）

### UserSession Entity
**Description**: 用户会话管理，支持多设备登录

**Fields**:
- `id` (String, @id) - 会话ID
- `userId` (String) - 关联用户ID
- `token` (String, @unique) - 会话令牌（JWT）
- `deviceInfo` (Json?) - 设备信息（浏览器、操作系统等）
- `ipAddress` (String?) - 登录IP地址
- `lastUsedAt` (DateTime) - 最后使用时间
- `expiresAt` (DateTime) - 过期时间
- `createdAt` (DateTime) - 创建时间

**Relationships**:
- `user` (User) - 关联用户（多对一）

### EmailVerification Entity
**Description**: 邮箱验证和密码重置令牌管理

**Fields**:
- `id` (String, @id) - 记录ID
- `userId` (String?) - 关联用户ID（可为空，用于密码重置）
- `email` (String) - 目标邮箱
- `token` (String, @unique) - 验证令牌
- `type` (EmailVerificationType) - 类型：REGISTRATION, PASSWORD_RESET, EMAIL_CHANGE
- `expiresAt` (DateTime) - 过期时间
- `usedAt` (DateTime?) - 使用时间
- `createdAt` (DateTime) - 创建时间

**Relationships**:
- `user` (User?) - 关联用户（多对一，可为空）

## Enums

### UserRole Enum
```typescript
enum UserRole {
  USER        // 普通用户
  CREATOR     // 创作者
  ADMIN       // 管理员
  SUPER_ADMIN // 超级管理员
}
```

### EmailVerificationType Enum
```typescript
enum EmailVerificationType {
  REGISTRATION    // 注册验证
  PASSWORD_RESET // 密码重置
  EMAIL_CHANGE    // 邮箱变更
}
```

## Validation Rules

### User Validation
- 邮箱格式必须有效（RFC 5322标准）
- 密码最小长度8字符
- 邮箱地址必须唯一
- 角色必须为预定义值

### Session Validation
- 会话令牌必须唯一
- 过期时间必须晚于创建时间
- 设备信息格式验证

### Email Verification Validation
- 令牌必须唯一
- 过期时间验证
- 类型必须为预定义值

## State Transitions

### User Registration Flow
1. **Pending Verification**: 用户注册 → 邮箱未验证状态
2. **Verified**: 点击验证链接 → 邮箱已验证状态
3. **Active**: 邮箱验证后 → 账户激活状态

### Password Reset Flow
1. **Requested**: 用户请求密码重置 → 生成重置令牌
2. **Token Sent**: 发送重置邮件 → 令牌有效期内
3. **Completed**: 用户设置新密码 → 令牌标记为已使用

### Session Lifecycle
1. **Active**: 会话创建 → 有效期内
2. **Expired**: 超过24小时 → 自动过期
3. **Revoked**: 用户主动注销 → 手动撤销

## Integration with Existing Models

### CreatorProfile Integration
- 用户申请成为创作者时，创建CreatorProfile记录
- 申请批准后，用户角色从USER更新为CREATOR
- 保持现有CreatorProfile模型结构不变

### AuditLog Integration
- 所有认证相关操作记录审计日志
- 包括：登录、注册、密码重置、权限变更等
- 使用现有AuditLog模型记录

## Security Considerations

### Data Protection
- 密码字段使用bcrypt哈希存储
- 会话令牌使用JWT签名验证
- 敏感操作记录审计日志

### Access Control
- 基于用户角色的权限控制
- API端点权限验证
- 会话有效期管理