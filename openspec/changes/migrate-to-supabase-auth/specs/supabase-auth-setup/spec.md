# Supabase Auth Setup

## ADDED Requirements

### Requirement: Enable Supabase Auth Service
系统SHALL配置Supabase Authentication服务，为OpenAero平台提供适当的设置。

#### Scenario: Admin enables Supabase Auth in dashboard
- **WHEN** 管理员访问Supabase Dashboard的Authentication部分
- **THEN** 系统SHALL启用具有默认设置的认证服务
- **AND** 系统SHALL为邮件服务配置SMTP
- **AND** 系统SHALL将站点URL配置为开发环境的`http://localhost:3000`
- **验证**: 认证服务启用成功，配置正确

### Requirement: Configure OAuth Providers
系统SHALL为Google和GitHub设置OAuth认证提供商。

#### Scenario: User authenticates with Google account
- **WHEN** 用户点击"Login with Google"按钮
- **THEN** 系统SHALL将用户重定向到Google认证
- **AND** 系统SHALL在成功认证后在Supabase中创建/更新用户
- **AND** 系统SHALL将用户重定向回应用程序并建立有效会话
- **验证**: Google OAuth流程正常工作

#### Scenario: User authenticates with GitHub account
- **WHEN** 用户点击"Login with GitHub"按钮
- **THEN** 系统SHALL将用户重定向到GitHub认证
- **AND** 系统SHALL在成功认证后在Supabase中创建/更新用户
- **AND** 系统SHALL将用户重定向回应用程序并建立有效会话
- **验证**: GitHub OAuth流程正常工作

### Requirement: Configure Email Templates
系统SHALL设置专业的邮件模板，用于用户验证和密码重置。

#### Scenario: New user registers with email
- **WHEN** 用户完成注册流程
- **THEN** 系统SHALL发送带有专业品牌的验证邮件
- **AND** 系统SHALL在邮件中包含清晰的验证说明
- **AND** 系统SHALL设置验证链接在24小时后过期
- **验证**: 验证邮件模板正确，链接有效

#### Scenario: User requests password reset
- **WHEN** 用户请求密码重置
- **THEN** 系统SHALL发送符合安全最佳实践的重置邮件
- **AND** 系统SHALL在邮件中包含清晰的重置说明
- **AND** 系统SHALL设置重置链接在1小时后过期
- **验证**: 重置邮件模板正确，安全有效

### Requirement: Implement Feature Flag for Auth System
系统SHALL创建功能标志，在自定义和Supabase认证之间切换。

#### Scenario: Development team tests migration
- **WHEN** 功能标志设置为'supabase'
- **THEN** 系统SHALL使用Supabase Auth Provider
- **WHEN** 功能标志设置为'custom'
- **THEN** 系统SHALL使用自定义AuthClient
- **AND** 系统SHALL允许在不重启应用程序的情况下进行切换
- **验证**: 功能标志切换正常工作

## MODIFIED Requirements

### Requirement: Update Environment Configuration
系统SHALL增强环境配置，支持Supabase Auth与现有设置并存。

#### Scenario: Application starts with Supabase configuration
- **WHEN** 应用程序初始化且Supabase环境变量正确设置
- **THEN** 系统SHALL正确配置Supabase客户端
- **AND** 系统SHALL使认证提供程序可用
- **AND** 系统SHALL不记录任何配置错误
- **验证**: 应用程序启动成功，配置正确

## REMOVED Requirements

None for this capability.

## Dependencies

- **Prerequisites**: Supabase项目访问权限和管理员权限
- **Related Capabilities**: 
  - [user-data-migration](../user-data-migration/spec.md)
  - [auth-api-replacement](../auth-api-replacement/spec.md)
- **Blocking**: None

## Acceptance Criteria

1. Supabase Auth启用且功能正常
2. OAuth提供商（Google、GitHub）配置正确且工作正常
3. 邮件模板专业且功能正常
4. 功能标志允许在认证系统间无缝切换
5. 所有配置安全并遵循最佳实践
6. 开发环境使用适当的localhost URL
7. 设置过程中不破坏现有功能