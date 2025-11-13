# Supabase MCP 快速开始指南

> ⚡ 5分钟快速配置 Supabase MCP 服务器

## 🚀 快速步骤

### 1. 确保 Supabase API Keys 已配置

在 `.env.local` 文件中确保有以下变量：

```bash
# 必需配置（在 Settings > API > API Keys 中获取）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 可选配置（如果 Dashboard 中有 Access Tokens 选项）
SUPABASE_ACCESS_TOKEN=your-token-if-available
```

**获取 API Keys**：
- 在 Supabase Dashboard: **Settings** > **API** > **API Keys**
- 复制 **anon** (public) key 和 **service_role** (secret) key

**注意**: Personal Access Token 是可选的。如果找不到，MCP 仍可通过 API Keys 工作。

### 3. 运行设置脚本

```bash
npm run mcp:setup
```

### 4. 重启 Cursor IDE

完全关闭并重新打开 Cursor IDE，MCP 配置会自动加载。

### 5. 验证配置

在 Cursor 中尝试使用 Supabase MCP 工具，或运行：

```bash
npm run mcp:test
```

## ✅ 完成！

现在您可以在 Cursor 中通过自然语言与 Supabase 数据库交互了！

**示例**:
- "显示 user_profiles 表的结构"
- "查询最近注册的10个用户"
- "列出所有认证用户"

## 📚 详细文档

查看完整文档: [DOCS/supabase-mcp-setup.md](DOCS/supabase-mcp-setup.md)

## 🆘 遇到问题？

### 找不到 Access Tokens？
- 这是正常的！MCP 可以通过 API Keys 工作
- 查看 [替代配置方案](DOCS/supabase-mcp-alternative-setup.md)

### 其他问题？
1. 检查环境变量是否正确设置（至少需要 URL、Anon Key、Service Role Key）
2. 重启 Cursor IDE
3. 查看 [故障排除指南](DOCS/supabase-mcp-setup.md#故障排除)

