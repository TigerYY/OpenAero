# Auth API Replacement

## ADDED Requirements

### Requirement: Replace Login API Endpoint
系统SHALL用Supabase认证SDK替换自定义登录API。

#### Scenario: User logs in with email and password
- **WHEN** Supabase Auth已配置且用户提交登录表单
- **THEN** 系统SHALL调用Supabase signInWithPassword()
- **AND** 系统SHALL正确处理认证响应
- **AND** 系统SHALL使用Supabase客户端存储用户会话
- **AND** 系统SHALL显示适当的错误消息
- **验证**: 登录流程正常，会话建立成功

#### Scenario: Login error handling
- **WHEN** Supabase返回错误且认证失败
- **THEN** 系统SHALL将错误映射为用户友好的消息
- **AND** 系统SHALL记录错误用于调试
- **AND** 系统SHALL提供关于失败原因的清晰反馈
- **验证**: 错误处理正确，用户消息清晰

### Requirement: Replace Registration API Endpoint
系统SHALL用Supabase signUp方法替换自定义注册API。

#### Scenario: New user registers account
- **WHEN** 注册表单被提交且Supabase signUp()被调用
- **THEN** 系统SHALL在auth.users表中创建用户
- **AND** 系统SHALL正确设置用户元数据
- **AND** 系统SHALL自动发送验证邮件
- **AND** 系统SHALL向用户显示成功确认
- **验证**: 注册流程正常，验证邮件发送

#### Scenario: Registration with existing email
- **WHEN** 邮箱已存在于系统中且注册被尝试
- **THEN** 系统SHALL显示适当的错误消息
- **AND** 系统SHALL将用户引导到登录页面
- **AND** 系统SHALL不创建重复账户
- **验证**: 重复邮箱处理正确

### Requirement: Implement Session Management
系统SHALL用Supabase会话管理替换自定义会话处理。

#### Scenario: User session is checked
- **WHEN** 用户访问受保护页面且检查认证状态
- **THEN** 系统SHALL使用Supabase getSession()
- **AND** 系统SHALL验证会话有效性
- **AND** 系统SHALL处理自动令牌刷新
- **AND** 系统SHALL适当重定向用户
- **验证**: 会话管理正常，自动刷新工作

#### Scenario: User logs out
- **WHEN** 用户点击登出按钮且Supabase signOut()被调用
- **THEN** 系统SHALL清除用户会话
- **AND** 系统SHALL清理本地存储
- **AND** 系统SHALL将用户重定向到登录页面
- **AND** 系统SHALL重置所有认证状态
- **验证**: 登出流程正常，状态清理完全

### Requirement: Replace Password Reset API
系统SHALL实施Supabase密码重置功能。

#### Scenario: User requests password reset
- **WHEN** 用户输入邮箱进行密码重置且Supabase resetPasswordForEmail()被调用
- **THEN** 系统SHALL向用户发送重置邮件
- **AND** 系统SHALL显示成功消息
- **AND** 系统SHALL提供清晰的说明
- **验证**: 密码重置邮件发送成功

#### Scenario: User completes password reset
- **WHEN** 用户从邮件点击重置链接并设置新密码
- **THEN** 系统SHALL调用Supabase updateUser()
- **AND** 系统SHALL成功更新密码
- **AND** 系统SHALL允许用户使用新密码登录
- **验证**: 密码重置完成，新密码工作

### Requirement: Integrate OAuth Authentication
系统SHALL用Supabase OAuth提供商替换自定义OAuth。

#### Scenario: User authenticates with Google
- **WHEN** Google OAuth已配置且用户点击"Login with Google"
- **THEN** 系统SHALL调用Supabase signInWithOAuth()
- **AND** 系统SHALL将用户重定向到Google
- **AND** 系统SHALL在返回时建立用户会话
- **AND** 系统SHALL导入用户个人资料数据
- **验证**: Google OAuth流程正常

#### Scenario: User authenticates with GitHub
- **WHEN** GitHub OAuth已配置且用户点击"Login with GitHub"
- **THEN** 系统SHALL调用Supabase signInWithOAuth()
- **AND** 系统SHALL将用户重定向到GitHub
- **AND** 系统SHALL在返回时建立用户会话
- **AND** 系统SHALL导入用户个人资料数据
- **验证**: GitHub OAuth流程正常

## MODIFIED Requirements

### Requirement: Update Authentication Middleware
系统SHALL修改中间件以使用Supabase会话验证。

#### Scenario: Protected route is accessed
- **WHEN** 中间件拦截请求且需要认证
- **THEN** 系统SHALL验证Supabase会话
- **AND** 系统SHALL从元数据检查用户角色
- **AND** 系统SHALL做出适当的授权决策
- **AND** 系统SHALL正确处理请求或重定向
- **验证**: 中间件认证正常工作

### Requirement: Update Frontend Authentication Components
系统SHALL修改React组件以使用Supabase Auth Provider。

#### Scenario: Authentication state is accessed
- **WHEN** 组件需要用户认证状态且useSupabaseAuth() hook被调用
- **THEN** 系统SHALL返回当前用户和会话
- **AND** 系统SHALL正确处理加载状态
- **AND** 系统SHALL使认证方法可用
- **验证**: 认证状态访问正常

## REMOVED Requirements

### Requirement: Remove Custom AuthClient Class
系统SHALL消除自定义认证客户端实现。

#### Scenario: Legacy AuthClient usage
- **WHEN** 迁移完成且代码引用AuthClient类
- **THEN** 系统SHALL移除所有AuthClient引用
- **AND** 系统SHALL用Supabase等效项替换功能
- **AND** 系统SHALL确保不丢失认证功能
- **验证**: AuthClient完全移除，功能保持

### Requirement: Remove Custom Auth API Routes
系统SHALL消除自定义认证API端点。

#### Scenario: Legacy auth API endpoints
- **WHEN** 迁移完成且/api/auth/*路由存在
- **THEN** 系统SHALL移除所有自定义认证路由
- **AND** 系统SHALL使Supabase SDK处理所有认证
- **AND** 系统SHALL减少API表面积
- **验证**: 自定义API路由移除，Supabase接管

## Dependencies

- **Prerequisites**: 用户数据迁移完成，Supabase Auth已配置
- **Related Capabilities**: 
  - [user-data-migration](../user-data-migration/spec.md)
  - [auth-cleanup](../auth-cleanup/spec.md)
- **Blocking**: 在API替换完成之前无法进行清理

## Acceptance Criteria

1. 所有认证流程与Supabase SDK一起工作
2. 会话管理健壮且自动
3. OAuth提供商功能正确
4. 错误处理全面且用户友好
5. 性能保持或改善
6. 所有自定义认证API被替换
7. 前端组件使用Supabase Auth Provider
8. 中间件正确验证Supabase会话
9. 迁移中不丢失认证功能