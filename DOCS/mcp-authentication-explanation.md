# Supabase MCP 认证说明

## 🔑 API Keys vs Personal Access Token

### API Keys（已配置 ✅）

您已经配置了两种 API Keys：

1. **Anon Key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - 用途：客户端访问数据库和 Auth API
   - 权限：受 Row Level Security (RLS) 限制
   - 位置：Settings > API > API Keys > anon (public)

2. **Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY`)
   - 用途：服务器端完全权限访问
   - 权限：绕过 RLS，可以访问所有数据
   - 位置：Settings > API > API Keys > service_role (secret)

**这些 API Keys 可以用于**：
- ✅ 数据库查询和操作
- ✅ 用户认证和管理
- ✅ 项目内的所有数据操作

### Personal Access Token（可选 ⚠️）

**Personal Access Token** 用于访问 **Supabase Management API**：

- 用途：项目管理、迁移、配置等操作
- 权限：账户级别的管理权限
- 位置：Account Settings > Access Tokens（如果可用）

**Personal Access Token 用于**：
- 🔧 项目管理操作
- 🔧 数据库迁移管理
- 🔧 项目配置更改
- 🔧 MCP 服务器的某些高级功能

## 🤔 为什么 MCP 需要 Personal Access Token？

Supabase MCP 服务器需要 Personal Access Token 是因为：

1. **访问 Management API**：MCP 需要调用 Supabase Management API 来执行项目管理操作
2. **跨项目操作**：PAT 允许访问您账户下的所有项目
3. **高级功能**：某些 MCP 功能（如迁移管理、项目配置）需要 Management API 权限

## ✅ 当前配置状态

您的当前配置：

```json
{
  "mcpServers": {
    "supabase": {
      "env": {
        "SUPABASE_URL": "${NEXT_PUBLIC_SUPABASE_URL}",
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}",  // 可选
        "SUPABASE_ANON_KEY": "${NEXT_PUBLIC_SUPABASE_ANON_KEY}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

**状态**：
- ✅ API Keys 已配置
- ⚠️ Personal Access Token 未配置（可选）

## 💡 解决方案

### 方案 1: 使用 API Keys 进行数据库操作（推荐）

对于大多数数据库查询操作，您可以直接使用项目代码：

```bash
# 查询最近注册的用户
node scripts/query-recent-users.js

# 或通过 API
curl http://localhost:3000/api/admin/users
```

### 方案 2: 获取 Personal Access Token（如果可用）

如果您的 Supabase Dashboard 中有 Access Tokens 选项：

1. 点击右上角头像
2. 选择 Account Settings
3. 查找 Access Tokens
4. 生成新的 Token
5. 添加到 `.env.local`：
   ```bash
   SUPABASE_ACCESS_TOKEN=your_token_here
   ```

### 方案 3: 使用 Service Role Key 进行数据库操作

Service Role Key 已经可以用于所有数据库操作，包括：
- 查询用户
- 管理数据
- 执行 SQL

**示例**：
```javascript
const supabase = createClient(url, serviceRoleKey);
const { data } = await supabase.from('users').select('*');
```

## 📊 功能对比

| 功能 | API Keys | Personal Access Token |
|------|----------|----------------------|
| 数据库查询 | ✅ | ✅ |
| 用户认证 | ✅ | ✅ |
| 数据操作 | ✅ | ✅ |
| 项目管理 | ❌ | ✅ |
| 迁移管理 | ❌ | ✅ |
| MCP 完整功能 | ⚠️ 部分 | ✅ 完整 |

## 🎯 建议

**对于当前项目**：
- ✅ 使用 API Keys 进行所有数据库操作（已配置）
- ✅ 使用项目脚本和 API 进行查询和管理
- ⚠️ Personal Access Token 是可选的，主要用于 MCP 的高级功能

**如果 MCP 功能受限**：
- 可以使用项目代码和脚本替代
- 或联系 Supabase 支持获取 Personal Access Token

## 🔍 验证配置

检查当前配置：

```bash
# 检查环境变量
npm run mcp:setup

# 测试数据库连接
node scripts/query-recent-users.js
```

