# Trae IDE 中使用 Spec-Kit 完整指南

## 🎯 概述

本指南将帮助您在 Trae IDE 中高效使用 GitHub Spec-Kit 进行规范驱动开发。Spec-Kit 已完全集成到您的 OpenAero 项目中，支持通过命令面板、键盘快捷键和终端命令三种方式使用。

## 🚀 快速开始

### 1. 验证安装状态

首先确认 Spec-Kit 已正确安装和配置：

```bash
# 检查 Specify CLI 是否可用
specify --help

# 检查项目配置状态
specify check

# 查看项目规范状态
./scripts/spec-kit.sh status
```

### 2. 三种使用方式

#### 方式一：命令面板（推荐）
1. 按 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（Mac）
2. 输入 `Tasks: Run Task`
3. 选择以 `speckit.` 开头的任务

#### 方式二：键盘快捷键
- `Ctrl+Shift+S A` - speckit.analyze（分析项目状态）
- `Ctrl+Shift+S C` - speckit.constitution（查看配置状态）
- `Ctrl+Shift+S S` - speckit.specify（创建功能规范）
- `Ctrl+Shift+S P` - speckit.plan（查看规范列表）
- `Ctrl+Shift+S T` - speckit.tasks（检查规范状态）
- `Ctrl+Shift+S I` - speckit.implement（初始化新规范）

#### 方式三：终端命令
```bash
# 直接使用脚本命令
./scripts/spec-kit.sh [command]

# 或使用 Specify CLI
specify [command]
```

## 📋 可用命令详解

### 核心命令

#### 1. speckit.analyze
**功能**：分析项目状态和工具可用性
**对应命令**：`specify check`
**用途**：检查所需工具是否安装，验证开发环境

#### 2. speckit.constitution
**功能**：查看项目配置和规范状态
**对应命令**：`./scripts/spec-kit.sh status`
**用途**：显示项目概览、规范统计和配置状态

#### 3. speckit.specify
**功能**：创建新的功能规范
**对应命令**：`./scripts/spec-kit.sh create`
**用途**：交互式创建新功能规范文档

#### 4. speckit.plan
**功能**：查看所有功能规范列表
**对应命令**：`./scripts/spec-kit.sh list`
**用途**：浏览项目中的所有规范及其完成状态

#### 5. speckit.tasks
**功能**：检查规范状态
**对应命令**：`./scripts/spec-kit.sh check`
**用途**：验证规范文件的完整性和一致性

#### 6. speckit.implement
**功能**：初始化新的规范项目
**对应命令**：`./scripts/spec-kit.sh init`
**用途**：设置新的规范开发环境

## 🔧 项目配置

### 当前配置状态
- **项目名称**：openaero.web
- **AI 助手**：cursor-agent
- **规范目录**：specs/
- **模板文件**：已配置完整的功能、计划和任务模板
- **工作流**：启用自动任务生成和计划更新

### 目录结构
```
.specify/
├── config.yaml          # 主配置文件
├── templates/           # 规范模板
│   ├── feature-template.md
│   ├── plan-template.md
│   └── task-template.md
└── scripts/            # 自动化脚本

specs/                  # 功能规范目录
├── 001-i18n-support/
├── 002-project-env-optimization/
├── 003-prd-document-enhancement/
├── 004-deployment-optimization/
└── ...

.vscode/
├── tasks.json          # VS Code 任务配置
└── keybindings.json    # 键盘快捷键配置
```

## 📊 当前项目状态

根据最新检查，您的项目包含以下规范：

1. **001-i18n-support** ✅ 完整
2. **001-minimal-i18n-setup** ✅ 完整
3. **002-project-env-optimization** ✅ 完整
4. **003-prd-document-enhancement** ✅ 完整
5. **004-deployment-optimization** ✅ 完整
6. **internationalization** ⚠️ 缺少计划和任务
7. **user-authentication** ✅ 完整
8. **支持** ✅ 完整

**总计**：9 个功能规范，其中 7 个完整，1 个需要补充

## 🎯 最佳实践

### 1. 规范驱动开发流程
1. **创建项目原则**：使用 `speckit.constitution` 查看项目配置
2. **定义功能规范**：使用 `speckit.specify` 创建新规范
3. **制定技术计划**：在规范基础上制定实施计划
4. **分解执行任务**：将计划分解为可执行的任务
5. **实施和验证**：按任务执行并验证结果

### 2. 日常使用建议
- 定期使用 `speckit.analyze` 检查环境状态
- 使用 `speckit.plan` 查看项目进展
- 创建新功能前先用 `speckit.specify` 定义规范
- 保持规范文档的及时更新

### 3. 团队协作
- 所有功能开发都应从规范开始
- 规范文档作为团队沟通的基础
- 定期同步规范状态和进展

## 🔍 故障排除

### 常见问题

#### 1. 命令不可用
```bash
# 检查 Specify CLI 安装
which specify

# 重新安装（如需要）
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
```

#### 2. 脚本权限问题
```bash
# 给脚本添加执行权限
chmod +x ./scripts/spec-kit.sh
```

#### 3. 配置文件问题
检查 `.specify/config.yaml` 文件是否存在且格式正确。

### 获取帮助
- 查看项目文档：`SPEC_KIT_README.md`
- 查看命令帮助：`SPECKIT_COMMANDS.md`
- 使用 `specify --help` 查看 CLI 帮助

## 🌟 高级功能

### 1. 自定义模板
您可以修改 `.specify/templates/` 中的模板文件来定制规范格式。

### 2. 工作流自动化
当前配置支持：
- 自动生成任务列表
- 自动更新计划文档
- 严格的规范验证

### 3. Git 集成
可以配置自动提交规范更改到版本控制系统。

## 📚 相关资源

- [GitHub Spec-Kit 官方仓库](https://github.com/github/spec-kit)
- [Spec-Driven Development 概念](https://github.com/github/spec-kit#what-is-spec-driven-development)
- 项目内文档：
  - `SPEC_KIT_README.md` - 基础使用指南
  - `VSCODE_SPECKIT_GUIDE.md` - VS Code 集成指南
  - `SPECKIT_COMMANDS.md` - 命令参考

---

**提示**：这个指南会随着项目发展持续更新。如有问题或建议，请及时反馈。