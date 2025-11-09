# OAuth提供商配置指南

## Google OAuth配置

### 1. 在Google Cloud Console中创建OAuth应用

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择或创建项目
3. 导航到 "APIs & Services" > "Credentials"
4. 点击 "+ CREATE CREDENTIALS" > "OAuth client ID"
5. 选择应用类型: "Web application"
6. 配置以下信息:
   - **名称**: OpenAero Web App
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000`
     - `https://your-production-domain.com`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback`
     - `https://your-production-domain.com/auth/callback`

### 2. 获取凭据

创建完成后，您将获得:
- **Client ID**: 以 `.apps.googleusercontent.com` 结尾
- **Client Secret**: 随机字符串

### 3. 在Supabase中配置

1. 访问 [Supabase Dashboard](https://cardynuoazvaytvinxvm.supabase.co)
2. 导航到 "Authentication" > "Providers"
3. 找到 "Google" 提供商并启用
4. 填入以下信息:
   - **Client ID**: 从Google获取的Client ID
   - **Client Secret**: 从Google获取的Client Secret
   - **Enabled**: 勾选

### 4. 环境变量配置

在 `.env.local` 中添加:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# 启用OAuth功能
FEATURE_OAUTH_PROVIDERS=true
```

## GitHub OAuth配置

### 1. 在GitHub中创建OAuth应用

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 "OAuth Apps" > "New OAuth App"
3. 填写应用信息:
   - **Application name**: OpenAero
   - **Homepage URL**: `http://localhost:3000` (开发环境)
   - **Authorization callback URL**: `http://localhost:3000/auth/callback`

### 2. 获取凭据

创建完成后，您将获得:
- **Client ID**: GitHub应用ID
- **Client Secret**: 点击"Generate a new client secret"生成

### 3. 在Supabase中配置

1. 访问 [Supabase Dashboard](https://cardynuoazvaytvinxvm.supabase.co)
2. 导航到 "Authentication" > "Providers"
3. 找到 "GitHub" 提供商并启用
4. 填入以下信息:
   - **Client ID**: 从GitHub获取的Client ID
   - **Client Secret**: 从GitHub获取的Client Secret
   - **Enabled**: 勾选

### 4. 环境变量配置

在 `.env.local` 中添加:

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## 验证配置

### 1. 检查配置状态

访问测试页面: `http://localhost:3000/test-supabase-auth.html`

### 2. 测试OAuth登录

1. 确保功能标志已启用:
   ```bash
   FEATURE_SUPABASE_AUTH=true
   FEATURE_OAUTH_PROVIDERS=true
   ```
2. 重启开发服务器
3. 访问登录页面
4. 点击 "Login with Google" 或 "Login with GitHub"
5. 完成OAuth流程

### 3. 验证用户创建

登录成功后，检查:
- 用户是否在 `auth.users` 表中创建
- 用户是否在 `users` 表中创建（通过触发器）
- 用户元数据是否正确保存

## 常见问题

### 1. "redirect_uri_mismatch" 错误

确保在OAuth提供商中配置的重定向URL与在Supabase中配置的完全一致。

### 2. "invalid_client" 错误

检查Client ID和Client Secret是否正确，没有多余的空格。

### 3. CORS错误

确保在OAuth提供商中配置了正确的JavaScript origins。

### 4. 用户创建失败

检查数据库触发器是否正确创建，用户表是否存在。

## 安全注意事项

1. **不要在前端代码中暴露Client Secret**
2. **在生产环境中使用HTTPS**
3. **定期轮换Client Secret**
4. **限制OAuth应用的作用域**
5. **监控异常登录活动**

## 下一步

配置完成后，可以:
1. 测试用户注册和登录流程
2. 配置邮件模板
3. 设置邮箱验证
4. 配置密码重置
5. 准备用户数据迁移

## 相关文档

- [Supabase Auth文档](https://supabase.com/docs/guides/auth)
- [Google OAuth文档](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth文档](https://docs.github.com/en/developers/apps/building-oauth-apps)