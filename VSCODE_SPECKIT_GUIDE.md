# VS Code Spec-Kit 集成指南

## 🎯 概述

现在您可以在 VS Code 中直接使用 `speckit.` 命令，就像您在另一个项目中看到的那样！

## 🚀 使用方法

### 方法1: 命令面板（推荐）

1. 按 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（Mac）打开命令面板
2. 输入 `speckit.` 查看所有可用命令
3. 选择您需要的命令执行

### 方法2: 键盘快捷键

- `Ctrl+Shift+S A` - speckit.analyze
- `Ctrl+Shift+S C` - speckit.checklist  
- `Ctrl+Shift+S H` - speckit.clarify
- `Ctrl+Shift+S O` - speckit.constitution
- `Ctrl+Shift+S I` - speckit.implement
- `Ctrl+Shift+S P` - speckit.plan
- `Ctrl+Shift+S S` - speckit.specify
- `Ctrl+Shift+S T` - speckit.tasks
- `Ctrl+Shift+S U` - speckit.setup
- `Ctrl+Shift+S L` - speckit.load

### 方法3: 任务运行器

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 `Tasks: Run Task`
3. 选择 `speckit.` 开头的任务

## 📋 可用命令

### 基本命令
- **speckit.analyze** - 分析项目状态和规范
- **speckit.checklist** - 显示功能规范清单
- **speckit.clarify** - 显示 Spec-Kit 帮助信息
- **speckit.constitution** - 检查 Spec-Kit 配置和状态

### 创建命令（交互式）
- **speckit.implement** - 创建新的功能规范实现
- **speckit.plan** - 创建技术实施计划
- **speckit.specify** - 创建功能规范文档
- **speckit.tasks** - 创建任务清单

### 设置命令
- **speckit.setup** - 设置 Spec-Kit 命令别名
- **speckit.load** - 加载 Spec-Kit 命令别名

## 🔧 交互式命令使用

当您运行创建类命令时（如 `speckit.specify`），系统会提示您输入功能名称：

```
🚀 创建功能实现...
请输入功能名称: user-management
```

然后系统会自动创建相应的规范文件。

## 📁 文件结构

```
.vscode/
├── tasks.json          # VS Code 任务配置
├── keybindings.json    # 键盘快捷键配置
└── snippets.json       # 代码片段配置

scripts/
└── speckit-interactive.sh  # 交互式命令脚本
```

## 🎨 自定义配置

### 修改快捷键

编辑 `.vscode/keybindings.json` 文件来自定义快捷键：

```json
{
  "key": "ctrl+alt+s s",
  "command": "workbench.action.tasks.runTask",
  "args": "speckit.specify"
}
```

### 添加新命令

在 `.vscode/tasks.json` 中添加新任务：

```json
{
  "label": "speckit.new-command",
  "type": "shell",
  "command": "./scripts/speckit-interactive.sh",
  "args": ["new-command"],
  "group": "build",
  "presentation": {
    "echo": true,
    "reveal": "always",
    "focus": false,
    "panel": "shared"
  },
  "problemMatcher": [],
  "detail": "新命令描述"
}
```

## 🐛 故障排除

### 命令未显示
1. 确保 `.vscode/tasks.json` 文件存在且格式正确
2. 重启 VS Code
3. 检查文件路径是否正确

### 交互式命令不工作
1. 确保 `scripts/speckit-interactive.sh` 有执行权限
2. 检查脚本路径是否正确
3. 在终端中手动测试脚本

### 快捷键不工作
1. 检查 `.vscode/keybindings.json` 文件格式
2. 确保快捷键没有冲突
3. 重启 VS Code

## 💡 提示

1. **首次使用**: 建议先运行 `speckit.setup` 设置永久别名
2. **快速访问**: 使用 `Ctrl+Shift+P` 然后输入 `speckit.` 快速找到所有命令
3. **自定义**: 可以根据需要修改快捷键和命令配置
4. **团队协作**: 将 `.vscode/` 目录提交到版本控制，团队成员可以共享配置

## 🎉 开始使用

现在您可以：

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 `speckit.` 查看所有可用命令
3. 选择 `speckit.specify` 创建新的功能规范
4. 按照提示输入功能名称
5. 开始您的规范驱动开发！

享受使用 Spec-Kit 的便利！🚀
