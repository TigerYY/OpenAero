# OpenAero 工作目录标准化指南

## 🎯 **工作目录定义的根本原理**

### 1. **工作目录的定义源头**

#### Shell层面
- **默认目录**: `/Users/yangyang` (用户主目录)
- **定义位置**: Shell配置文件 (`~/.zshrc`, `~/.bashrc`)
- **启动方式**: 终端启动时的工作目录

#### VS Code层面
- **工作区目录**: 项目根目录
- **终端设置**: `"terminal.integrated.cwd": "${workspaceFolder}"`
- **任务配置**: 在 `tasks.json` 中定义

#### Node.js层面
- **模块解析**: 从 `process.cwd()` 开始
- **相对路径**: 基于当前工作目录
- **绝对路径**: 使用 `__dirname` 和 `path.resolve()`

### 2. **问题根源分析**

#### ❌ **错误做法**
```bash
# 从用户主目录启动
cd /Users/yangyang
node scripts/start-dev.js  # 错误：找不到脚本
```

#### ✅ **正确做法**
```bash
# 从项目目录启动
cd "/Users/yangyang/Library/Mobile Documents/com~apple~CloudDocs/YYicode/OpenAero/openaero.web"
node scripts/start-dev.js  # 正确：找到脚本
```

### 3. **标准化解决方案**

#### 方案1：项目专用启动脚本
```bash
# 使用项目启动脚本
./start-project.sh
```

#### 方案2：VS Code任务
```bash
# 在VS Code中按 Cmd+Shift+P
# 选择 "Tasks: Run Task"
# 选择 "启动开发服务器"
```

#### 方案3：正确的Shell命令
```bash
# 确保在项目目录
cd "/Users/yangyang/Library/Mobile Documents/com~apple~CloudDocs/YYicode/OpenAero/openaero.web"
npm run dev
```

### 4. **工作目录验证**

#### 检查当前目录
```bash
pwd
# 应该显示: /Users/yangyang/Library/Mobile Documents/com~apple~CloudDocs/YYicode/OpenAero/openaero.web
```

#### 检查必要文件
```bash
ls package.json next.config.js tsconfig.json
# 应该显示这三个文件
```

#### 检查Node.js模块解析
```bash
node -e "console.log(require.resolve.paths('.'))"
# 应该显示项目目录路径
```

### 5. **最佳实践**

#### ✅ **推荐做法**
1. **始终从项目目录启动**
2. **使用相对路径脚本**
3. **依赖正确的工作目录**
4. **在脚本中验证目录**

#### ❌ **避免做法**
1. **硬编码绝对路径**
2. **依赖特定工作目录**
3. **复杂的路径处理**
4. **忽略工作目录验证**

### 6. **故障排除**

#### 问题：找不到脚本
```bash
Error: Cannot find module '/Users/yangyang/scripts/start-dev.js'
```
**解决**: 确保在项目目录下运行

#### 问题：找不到package.json
```bash
Error: Cannot find module './package.json'
```
**解决**: 检查当前工作目录

#### 问题：端口被占用
```bash
Error: listen EADDRINUSE: address already in use :::3000
```
**解决**: 使用端口清理脚本

### 7. **自动化解决方案**

#### 创建项目别名
```bash
# 在 ~/.zshrc 中添加
alias openaero='cd "/Users/yangyang/Library/Mobile Documents/com~apple~CloudDocs/YYicode/OpenAero/openaero.web"'
```

#### 使用项目启动脚本
```bash
# 创建 start-project.sh
# 确保始终在正确目录启动
```

#### VS Code工作区配置
```json
{
  "terminal.integrated.cwd": "${workspaceFolder}",
  "tasks": {
    "version": "2.0.0",
    "tasks": [
      {
        "label": "启动开发服务器",
        "type": "shell",
        "command": "npm run dev",
        "options": {
          "cwd": "${workspaceFolder}"
        }
      }
    ]
  }
}
```

## 🚀 **使用指南**

### 开发环境启动
```bash
# 方式1：使用项目启动脚本（推荐）
./start-project.sh

# 方式2：确保在正确目录后启动
cd "/Users/yangyang/Library/Mobile Documents/com~apple~CloudDocs/YYicode/OpenAero/openaero.web"
npm run dev

# 方式3：使用VS Code任务
# Cmd+Shift+P -> Tasks: Run Task -> 启动开发服务器
```

### 环境检查
```bash
# 检查工作目录
pwd

# 检查项目文件
ls package.json

# 检查Node.js环境
node -v && npm -v
```

## 📋 **总结**

工作目录问题的根本原因是**Shell默认目录与项目目录不一致**。正确的解决方案是：

1. **在源头定义正确的工作目录**
2. **使用项目专用启动脚本**
3. **在脚本中验证工作目录**
4. **依赖标准的相对路径**

这样既符合行业标准，又解决了根本问题。
