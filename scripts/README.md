# OpenAero 启动脚本说明

## 🚀 服务启动脚本

### 基本启动命令

```bash
# 开发服务器 (自动清理端口 + 默认端口3000)
npm run dev

# 开发服务器 (自动清理端口 + 指定端口)
npm run dev:3000    # 端口3000
npm run dev:3001    # 端口3001
npm run dev:3002    # 端口3002

# 生产服务器
npm run start       # 默认端口3000
npm run start:3000  # 端口3000
npm run start:3001  # 端口3001
```

### 端口清理脚本

```bash
# 清理所有常用端口 (3000-3005)
npm run clean-ports

# 直接运行清理脚本
node scripts/clean-ports.js
./scripts/clean-ports.sh    # Linux/Mac
scripts/clean-ports.bat     # Windows
```

## 🔧 脚本功能

### 端口清理功能
- **自动检测**: 检查端口3000-3005的使用情况
- **智能关闭**: 先尝试优雅关闭，再强制关闭
- **跨平台支持**: 支持Windows、Linux、macOS
- **详细日志**: 显示清理过程和结果

### 启动流程
1. **端口清理**: 自动清理可能占用的端口
2. **服务启动**: 在指定端口启动Next.js服务
3. **状态检查**: 验证服务是否正常启动

## 📋 支持的端口

| 端口 | 用途 | 脚本命令 |
|------|------|----------|
| 3000 | 默认开发端口 | `npm run dev:3000` |
| 3001 | 备用开发端口 | `npm run dev:3001` |
| 3002 | 测试端口 | `npm run dev:3002` |
| 3003-3005 | 其他服务端口 | 自动清理 |

## 🛠️ 故障排除

### 端口被占用
```bash
# 手动清理端口
npm run clean-ports

# 查看端口使用情况
lsof -ti:3000        # Linux/Mac
netstat -ano | findstr :3000  # Windows
```

### 服务启动失败
```bash
# 检查Node.js版本
node --version

# 检查依赖
npm install

# 清理缓存
npm run clean
```

### 权限问题
```bash
# 设置脚本执行权限 (Linux/Mac)
chmod +x scripts/clean-ports.sh
chmod +x scripts/clean-ports.js
```

## 📊 脚本特性

### 智能端口管理
- ✅ 自动检测端口占用
- ✅ 优雅关闭进程
- ✅ 强制关闭顽固进程
- ✅ 跨平台兼容
- ✅ 详细状态报告

### 开发体验优化
- ✅ 一键启动服务
- ✅ 自动端口清理
- ✅ 多端口支持
- ✅ 错误处理
- ✅ 彩色日志输出

## 🎯 最佳实践

1. **开发时**: 使用 `npm run dev` 自动清理并启动
2. **测试时**: 使用 `npm run dev:3001` 避免冲突
3. **生产时**: 使用 `npm run start` 启动生产服务
4. **调试时**: 使用 `npm run clean-ports` 清理端口

## 🔍 监控命令

```bash
# 查看所有Node.js进程
ps aux | grep node

# 查看端口使用情况
netstat -tulpn | grep :3000

# 查看Next.js进程
ps aux | grep next
```

---

*最后更新: 2024年10月17日*
