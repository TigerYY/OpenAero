# OpenAero

OpenAero 是一个基于 Next.js + Supabase 的航空航天解决方案平台。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问
http://localhost:3000
```

## 核心文档

### 开发相关
- [开发指南](DEVELOPMENT.md) - 开发环境配置和工作流程
- [项目结构](PROJECT_STRUCTURE.md) - 代码组织和架构说明
- [项目规范](PROJECT_STANDARDS.md) - 代码规范和最佳实践
- [技术框架标准](tech-framework-standards.md) - 技术栈和框架选择

### 数据库和认证
- [Supabase 集成](README_SUPABASE.md) - Supabase 配置和使用指南
- [Supabase MCP 设置](DOCS/supabase-mcp-setup.md) - Supabase MCP 服务器配置指南
- [数据库设置](DATABASE_SETUP.md) - 数据库初始化和迁移
- [数据迁移指南](MIGRATION_GUIDE.md) - 数据库迁移流程

### 部署和运维
- [生产环境清单](PRODUCTION-CHECKLIST.md) - 上线前检查清单
- [监控](MONITORING.md) - 系统监控和日志

### 其他
- [贡献指南](CONTRIBUTING.md) - 如何参与项目开发
- [PRD](PRDV2.md) - 产品需求文档

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth
- **样式**: Tailwind CSS
- **国际化**: next-intl

## 环境变量

复制 `.env.example` 到 `.env.local` 并配置：

```bash
cp .env.example .env.local
```

必填配置：
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥
- `SUPABASE_ACCESS_TOKEN` - Supabase Personal Access Token (用于 MCP)
- `DATABASE_URL` - 数据库连接字符串

## 主要功能

- 用户认证和授权
- 解决方案管理
- 创作者平台
- 订单系统
- 支付集成
- 多语言支持 (中文/英文)

## 开发工具

### 数据库修复工具
```bash
# 修复缺少 profile 的用户
node scripts/fix-database.js
```

### 快速诊断
访问 `http://localhost:3000/quick-auth-check.html` 进行认证系统诊断。

### Supabase MCP 设置
```bash
# 设置 Supabase MCP 服务器（用于 Cursor IDE）
npm run mcp:setup

# 测试 MCP 连接
npm run mcp:test
```

详细说明请参考 [Supabase MCP 设置指南](DOCS/supabase-mcp-setup.md)。

## License

[添加许可证信息]
