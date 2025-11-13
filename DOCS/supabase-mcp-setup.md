# Supabase MCP 集成指南

> 📚 如何在 OpenAero 项目中配置和使用 Supabase MCP (Model Context Protocol)

**最后更新**: 2025-01-27  
**状态**: ✅ 可用

---

## 🎯 什么是 MCP?

Model Context Protocol (MCP) 是一个标准化协议，允许 AI 助手（如 Cursor、Claude 等）通过安全的方式与外部工具和服务进行交互。

Supabase MCP 服务器提供了以下功能：
- 🔍 查询数据库表结构和数据
- 📊 执行 SQL 查询
- 🔐 管理认证用户
- 📝 查看和管理数据库迁移
- 🔌 查看 API 端点信息

---

## 🚀 快速开始

### 步骤 1: 获取 Supabase Personal Access Token（可选）

**注意**: Personal Access Token 是可选的。如果您的 Dashboard 中没有此选项，请参考 [替代配置方案](supabase-mcp-alternative-setup.md)。

如果可用，按以下步骤获取：

1. 登录 [Supabase 控制台](https://supabase.com/dashboard)
2. 点击右上角头像，选择 **Account Settings**（账户设置）
3. 查找 **Access Tokens** 或 **API Tokens** 选项
4. 如果找到，点击 **Generate New Token**
5. 为 Token 命名（例如: "MCP Server Access"）
6. 复制生成的 Token（**注意**: Token 只会显示一次，请妥善保存）

**如果找不到 Access Tokens**：
- 这是正常的，MCP 服务器可以通过其他方式配置
- 请确保已设置 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY`
- 这些密钥可以在 **Settings** > **API** > **API Keys** 中找到

### 步骤 2: 配置环境变量

在 `.env.local` 文件中添加以下变量：

```bash
# Supabase 配置（如果还没有）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# MCP 需要的 Personal Access Token（可选，如果可用）
# 如果 Dashboard 中没有 Access Tokens 选项，可以留空
SUPABASE_ACCESS_TOKEN=your-personal-access-token
```

### 步骤 3: 运行设置脚本

```bash
npm run mcp:setup
```

这个脚本会：
- ✅ 检查必需的环境变量
- ✅ 创建 `.cursor/mcp.json` 配置文件
- ✅ 测试 MCP 服务器连接

### 步骤 4: 重启 Cursor IDE

1. 完全关闭 Cursor IDE
2. 重新打开 Cursor IDE
3. Cursor 会自动加载 `.cursor/mcp.json` 配置

### 步骤 5: 验证配置

在 Cursor 中，您可以：
- 尝试使用 Supabase MCP 工具
- 或运行测试命令: `npm run mcp:test`

---

## 📁 配置文件说明

### `.cursor/mcp.json`

这是 Cursor IDE 的 MCP 配置文件，位于项目根目录的 `.cursor` 文件夹中：

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "${SUPABASE_ACCESS_TOKEN}"
      ],
      "env": {
        "SUPABASE_URL": "${NEXT_PUBLIC_SUPABASE_URL}",
        "SUPABASE_ANON_KEY": "${NEXT_PUBLIC_SUPABASE_ANON_KEY}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

**注意**: 
- 环境变量使用 `${VAR_NAME}` 格式，Cursor 会自动从 `.env.local` 读取
- 如果环境变量未设置，MCP 服务器可能无法正常工作

### `mcp-config.json`

这是项目根目录的备用配置文件，可以用于其他支持 MCP 的工具。

---

## 🛠️ 可用命令

### 设置 MCP

```bash
npm run mcp:setup
```

运行设置脚本，自动配置 MCP 服务器。

### 测试 MCP 连接

```bash
npm run mcp:test
```

测试 MCP 服务器包是否可用。

### 手动测试 MCP 服务器

```bash
npx -y @supabase/mcp-server-supabase@latest --access-token=YOUR_TOKEN
```

---

## 💡 使用示例

配置完成后，您可以在 Cursor 中通过自然语言与 Supabase 交互：

### 示例 1: 查询数据库表结构

```
"显示 user_profiles 表的结构"
```

### 示例 2: 执行 SQL 查询

```
"查询最近注册的10个用户"
```

### 示例 3: 查看认证用户

```
"列出所有认证用户"
```

### 示例 4: 查看 API 端点

```
"显示所有可用的 API 端点"
```

---

## 🔧 故障排除

### 问题 1: MCP 服务器无法启动

**症状**: Cursor 中无法使用 Supabase MCP 工具

**解决方案**:
1. 检查环境变量是否正确设置
2. 确认 `SUPABASE_ACCESS_TOKEN` 有效
3. 运行 `npm run mcp:test` 验证连接
4. 重启 Cursor IDE

### 问题 2: 环境变量未加载

**症状**: MCP 配置中的环境变量显示为 `${VAR_NAME}`

**解决方案**:
1. 确认 `.env.local` 文件存在且包含所有必需变量
2. 检查变量名是否正确（区分大小写）
3. 重启 Cursor IDE

### 问题 3: Access Token 无效

**症状**: MCP 服务器返回认证错误

**解决方案**:
1. 在 Supabase 控制台重新生成 Access Token
2. 更新 `.env.local` 中的 `SUPABASE_ACCESS_TOKEN`
3. 重启 Cursor IDE

### 问题 4: MCP 工具不可见

**症状**: 在 Cursor 中看不到 Supabase MCP 工具

**解决方案**:
1. 确认 `.cursor/mcp.json` 文件存在且格式正确
2. 检查 Cursor 版本是否支持 MCP（需要较新版本）
3. 查看 Cursor 的设置中是否启用了 MCP
4. 重启 Cursor IDE

---

## 📚 相关文档

- [Supabase MCP 服务器文档](https://github.com/supabase/mcp-server-supabase)
- [Model Context Protocol 规范](https://modelcontextprotocol.io/)
- [Cursor IDE MCP 文档](https://docs.cursor.com/mcp)

---

## 🔒 安全注意事项

1. **不要提交 Access Token**: 
   - `SUPABASE_ACCESS_TOKEN` 应该只在 `.env.local` 中
   - 确保 `.env.local` 在 `.gitignore` 中

2. **Token 权限**:
   - Personal Access Token 具有与您的 Supabase 账户相同的权限
   - 仅在受信任的环境中使用

3. **定期轮换 Token**:
   - 建议每 90 天更新一次 Access Token
   - 如果 Token 泄露，立即在 Supabase 控制台撤销

---

## ✅ 检查清单

配置完成后，请确认：

- [ ] Supabase Personal Access Token 已创建并添加到 `.env.local`
- [ ] 所有必需的环境变量已设置
- [ ] `.cursor/mcp.json` 文件已创建
- [ ] `npm run mcp:setup` 运行成功
- [ ] `npm run mcp:test` 测试通过
- [ ] Cursor IDE 已重启
- [ ] 可以在 Cursor 中使用 Supabase MCP 工具

---

## 🆘 获取帮助

如果遇到问题：

1. 检查本文档的故障排除部分
2. 查看 [Supabase MCP GitHub Issues](https://github.com/supabase/mcp-server-supabase/issues)
3. 查看 [Cursor IDE 文档](https://docs.cursor.com)

---

**配置完成后，您就可以在 Cursor 中通过自然语言与 Supabase 数据库交互了！** 🎉

