# Spec-Kit 命令使用指南

## 🚀 快速开始

### 1. 设置命令别名（一次性）
```bash
npm run spec:setup
```
这将把 Spec-Kit 命令别名添加到您的 shell 配置文件中。

### 2. 重新加载 shell 配置
```bash
source ~/.zshrc  # 如果使用 zsh
# 或
source ~/.bashrc  # 如果使用 bash
```

### 3. 开始使用命令
现在您可以在任何地方使用以下命令：

## 📋 可用命令

### 基本命令
```bash
speckit-check          # 检查 Spec-Kit 状态
speckit-help           # 显示 specify 帮助
speckit-init           # 初始化项目
```

### 项目管理命令
```bash
speckit-list           # 列出所有功能规范
speckit-status         # 显示项目状态
speckit-create <名称>  # 创建新功能规范
speckit_new <名称>     # 创建新功能规范（函数）
speckit_view <名称>    # 查看功能规范文件
speckit_help_full      # 显示完整帮助
```

## 🎯 常用操作示例

### 创建新功能规范
```bash
speckit_new user-management
speckit_new payment-system
speckit_new notification-service
```

### 查看现有规范
```bash
speckit-list
speckit_view user-authentication
```

### 检查系统状态
```bash
speckit-status
speckit-check
```

## 🔧 临时使用（无需永久设置）

如果您不想永久设置别名，可以临时加载：

```bash
# 在项目目录中
npm run spec:load

# 然后使用命令
speckit-check
speckit-list
```

## 📁 项目结构

```
openaero.web/
├── .specify-aliases.sh    # 命令别名定义
├── setup-speckit.sh      # 设置脚本
├── specs/                # 功能规范目录
│   └── user-authentication/
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
└── scripts/
    └── spec-kit.sh       # 管理脚本
```

## 🆘 故障排除

### 命令未找到
```bash
# 检查 specify 是否安装
which specify

# 如果未安装，运行
pipx install specify
```

### 别名未加载
```bash
# 手动加载别名
source .specify-aliases.sh

# 或重新运行设置
npm run spec:setup
```

### 查看帮助
```bash
speckit_help_full
```

## 💡 提示

1. **首次使用**: 运行 `npm run spec:setup` 设置永久别名
2. **临时使用**: 运行 `npm run spec:load` 临时加载别名
3. **查看帮助**: 使用 `speckit_help_full` 查看所有命令
4. **创建规范**: 使用 `speckit-new <名称>` 快速创建新功能规范

现在您可以在任何地方使用 `speckit-*` 命令了！🎉
