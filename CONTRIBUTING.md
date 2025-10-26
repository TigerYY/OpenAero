# Contributing to OpenAero

---
**Version:** 1.0.0  
**Last Update:** 2024-12-28  
**Status:** Active  
**Maintainer:** OpenAero Team  
**Purpose:** 开发贡献指南和流程规范

---

## Overview

欢迎为 OpenAero 项目做出贡献！本文档提供了参与项目开发的完整指南。

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x 或更高版本
- npm 或 yarn
- Git
- Docker (可选，用于本地开发)

### Development Setup

1. **Fork 并克隆仓库**
   ```bash
   git clone https://github.com/your-username/openaero.web.git
   cd openaero.web
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **设置环境变量**
   ```bash
   cp .env.example .env.local
   # 编辑 .env.local 文件，填入必要的环境变量
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

## 📋 Development Workflow

### 1. 创建功能分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

### 2. 开发规范

#### 代码风格
- 使用 ESLint 和 Prettier 进行代码格式化
- 运行 `npm run lint:fix` 自动修复格式问题
- 运行 `npm run format` 格式化代码

#### 提交规范
使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**类型 (Type):**
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

**示例:**
```
feat(auth): add OAuth2 login support

Add Google and GitHub OAuth2 authentication
- Implement OAuth2 flow
- Add user profile management
- Update login UI components

Closes #123
```

### 3. 质量检查

在提交前运行以下检查：

```bash
# 代码质量检查
npm run quality:check:enhanced

# 运行测试
npm run test:coverage:enhanced

# 类型检查
npm run type-check:enhanced
```

### 4. 创建 Pull Request

1. 推送分支到你的 fork
2. 创建 Pull Request
3. 填写 PR 模板
4. 等待代码审查

## 🧪 Testing Guidelines

### 测试类型

1. **单元测试** - 测试单个组件或函数
2. **集成测试** - 测试组件间的交互
3. **E2E 测试** - 测试完整的用户流程

### 测试要求

- 新功能必须包含测试
- 测试覆盖率不低于 85%
- 所有测试必须通过

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行 E2E 测试
npm run test:e2e

# 监视模式运行测试
npm run test:watch
```

## 📚 Documentation

### 文档要求

- 新功能需要更新相关文档
- API 变更需要更新 API 文档
- 重大变更需要更新 README

### 文档风格

遵循 [DOCS 风格指南](./DOCS/style-guide.md)：

- 使用清晰的标题结构
- 提供代码示例
- 包含元数据信息
- 使用一致的格式

## 🔍 Code Review Process

### 审查标准

1. **功能性** - 代码是否按预期工作
2. **可读性** - 代码是否清晰易懂
3. **性能** - 是否有性能问题
4. **安全性** - 是否存在安全隐患
5. **测试** - 测试是否充分

### 审查流程

1. 自动化检查通过
2. 至少一名维护者审查
3. 解决所有反馈意见
4. 合并到主分支

## 🚀 Release Process

### 版本管理

使用 [Semantic Versioning](https://semver.org/)：

- `MAJOR.MINOR.PATCH`
- 主版本：不兼容的 API 变更
- 次版本：向后兼容的功能性新增
- 修订版本：向后兼容的问题修正

### 发布流程

1. 创建 release 分支
2. 更新版本号和 CHANGELOG
3. 运行完整测试套件
4. 创建 release PR
5. 合并并打标签
6. 部署到生产环境

## 🛡️ Security

### 安全报告

如果发现安全漏洞，请：

1. **不要**在公开 issue 中报告
2. 发送邮件到 security@openaero.org
3. 提供详细的漏洞描述
4. 等待安全团队回应

### 安全最佳实践

- 不要提交敏感信息（密钥、密码等）
- 使用环境变量管理配置
- 定期更新依赖包
- 遵循 OWASP 安全指南

## 📞 Getting Help

### 社区支持

- **GitHub Issues** - 报告 bug 或请求功能
- **GitHub Discussions** - 一般讨论和问题
- **Discord** - 实时聊天和支持

### 联系方式

- **项目维护者**: maintainers@openaero.org
- **技术支持**: support@openaero.org
- **安全问题**: security@openaero.org

## 📄 License

通过贡献代码，您同意您的贡献将在与项目相同的许可证下授权。

---

感谢您对 OpenAero 项目的贡献！🚁✨