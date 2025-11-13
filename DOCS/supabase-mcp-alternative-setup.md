# Supabase MCP 替代配置方案

> 🔧 如果 Supabase Dashboard 中没有 "Access Tokens" 选项的配置方法

## 问题说明

如果您的 Supabase Dashboard 中没有找到 **Settings > Access Tokens** 选项，这可能是因为：
1. Personal Access Token 功能尚未在您的账户/组织中启用
2. Supabase 版本较旧，不支持此功能
3. 功能位置发生了变化

## ✅ 解决方案：使用现有 API Keys

Supabase MCP 服务器可以通过环境变量配置，**不一定需要 Personal Access Token**。

### 方案 1: 使用环境变量配置（推荐）

MCP 服务器可以通过环境变量自动读取配置，无需 Personal Access Token。

#### 步骤 1: 确保环境变量已设置

在 `.env.local` 文件中确保有以下变量：

```bash
# Supabase 项目配置（必需）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Personal Access Token（可选，如果可用）
SUPABASE_ACCESS_TOKEN=your-token-if-available
```

**获取这些密钥的位置**：
- 在 Supabase Dashboard 中
- 导航至: **Settings** > **API** > **API Keys**
- 复制 **anon** (public) key 和 **service_role** (secret) key

#### 步骤 2: 验证配置

运行设置脚本：

```bash
npm run mcp:setup
```

#### 步骤 3: 重启 Cursor IDE

完全关闭并重新打开 Cursor IDE。

### 方案 2: 尝试在账户级别查找 Access Token

Personal Access Token 可能在账户设置中，而不是项目设置中：

1. 点击 Supabase Dashboard **右上角的头像**
2. 选择 **Account Settings** 或 **账户设置**
3. 查找 **Access Tokens** 或 **API Tokens** 选项
4. 如果找到，生成新的 Token

### 方案 3: 联系 Supabase 支持

如果以上方法都不行：

1. 访问 [Supabase Support](https://supabase.com/support)
2. 询问如何启用 Personal Access Token 功能
3. 或询问 MCP 服务器的替代配置方法

## 🔍 验证配置是否工作

配置完成后，在 Cursor 中尝试：

1. 使用 Supabase MCP 工具
2. 或运行测试命令：
   ```bash
   npm run mcp:test
   ```

## 📝 当前配置说明

当前的 `.cursor/mcp.json` 配置已经设置为：

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"],
      "env": {
        "SUPABASE_URL": "${NEXT_PUBLIC_SUPABASE_URL}",
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}",
        "SUPABASE_ANON_KEY": "${NEXT_PUBLIC_SUPABASE_ANON_KEY}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

**注意**：
- `SUPABASE_ACCESS_TOKEN` 是可选的（如果未设置，MCP 服务器会尝试使用其他方式）
- 其他环境变量是必需的
- Cursor 会自动从 `.env.local` 读取这些变量

## 🎯 快速检查清单

- [ ] `.env.local` 中已设置 `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `.env.local` 中已设置 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `.env.local` 中已设置 `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `.cursor/mcp.json` 文件存在
- [ ] 已运行 `npm run mcp:setup`
- [ ] 已重启 Cursor IDE

如果以上都完成了，MCP 应该可以工作，即使没有 Personal Access Token。

## 💡 提示

如果 MCP 仍然无法工作，可以尝试：

1. **检查 Supabase MCP 服务器版本**：
   ```bash
   npm run mcp:test
   ```

2. **查看 Cursor 的 MCP 日志**：
   - 在 Cursor 中查看开发者工具或日志输出
   - 查找 MCP 相关的错误信息

3. **手动测试 MCP 服务器**：
   ```bash
   npx -y @supabase/mcp-server-supabase@latest
   ```

