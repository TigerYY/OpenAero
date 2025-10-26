# OpenAero 开发环境标准化指南

**版本**: 1.0.0  
**最后更新**: 2025-01-25  
**状态**: 🟢 已发布  
**维护者**: OpenAero 开发团队  
**目的**: 提供标准化的开发环境配置和问题解决方案

## 概述

本文档提供 OpenAero 项目的开发环境配置指南，包括工作目录管理、开发命令、常见问题解决方案等，确保开发环境的一致性和稳定性。

## 🚨 **重要：工作目录问题**

### 问题描述
由于项目路径包含特殊字符和空格，容易导致工作目录错误：
```
错误路径: /Users/yangyang/scripts/clean-ports.js
正确路径: /Users/yangyang/Library/Mobile Documents/com~apple~CloudDocs/YYicode/OpenAero/openaero.web/scripts/clean-ports.js
```

### 解决方案

#### 1. **使用标准化启动脚本**
```bash
# 推荐方式：使用项目根目录的启动脚本
./start-dev.sh
```

#### 2. **手动确保正确目录**
```bash
# 检查当前目录
pwd

# 如果不在项目目录，切换到正确目录
cd "/Users/yangyang/Library/Mobile Documents/com~apple~CloudDocs/YYicode/OpenAero/openaero.web"

# 验证在正确目录
ls package.json
```

#### 3. **使用环境检查脚本**
```bash
# 自动检查和修复环境
./scripts/check-environment.sh
```

## 🛠️ **开发命令**

### 启动开发服务器
```bash
# 方式1：使用启动脚本（推荐）
./start-dev.sh

# 方式2：使用npm脚本
npm run dev:3000

# 方式3：直接运行
node scripts/clean-ports.js && next dev -p 3000
```

### 环境检查
```bash
# 检查开发环境
./scripts/check-environment.sh

# 验证端口清理
node scripts/clean-ports.js
```

## 📁 **项目结构**

```
openaero.web/
├── start-dev.sh              # 标准化启动脚本
├── openaero.code-workspace   # VS Code工作区配置
├── scripts/
│   ├── check-environment.sh  # 环境检查脚本
│   ├── clean-ports.js        # 端口清理脚本
│   └── validate-env.js       # 环境验证脚本
├── src/                      # 源代码
├── messages/                 # 翻译文件
└── package.json             # 项目配置
```

## 🔧 **VS Code 配置**

### 使用工作区文件
1. 打开 `openaero.code-workspace`
2. 确保终端在正确目录启动
3. 使用内置任务启动开发服务器

### 推荐扩展
- Tailwind CSS IntelliSense
- Prettier
- TypeScript Importer
- JSON Tools

## ⚠️ **常见问题**

### 1. 端口被占用
```bash
# 清理端口
node scripts/clean-ports.js

# 或手动清理
lsof -ti:3000 | xargs kill -9
```

### 2. 工作目录错误
```bash
# 检查当前目录
pwd

# 切换到项目目录
cd "/Users/yangyang/Library/Mobile Documents/com~apple~CloudDocs/YYicode/OpenAero/openaero.web"
```

### 3. 依赖问题
```bash
# 重新安装依赖
npm install

# 清理缓存
npm run clean
```

## 🎯 **最佳实践**

1. **始终使用 `./start-dev.sh` 启动项目**
2. **定期运行 `./scripts/check-environment.sh` 检查环境**
3. **使用 VS Code 工作区文件进行开发**
4. **遇到问题先检查工作目录是否正确**

## 📞 **技术支持**

如果遇到问题：
1. 运行环境检查脚本
2. 检查工作目录是否正确
3. 查看终端错误信息
4. 参考本文档的常见问题部分