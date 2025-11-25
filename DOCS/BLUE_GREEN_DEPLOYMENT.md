# 蓝绿部署指南

## 📋 目录

- [概述](#概述)
- [架构设计](#架构设计)
- [部署方案](#部署方案)
- [使用方法](#使用方法)
- [访问方式](#访问方式)
- [回退操作](#回退操作)
- [故障排查](#故障排查)

---

## 概述

蓝绿部署是一种零停机时间的部署策略，通过维护两个完全相同的生产环境（蓝色和绿色）来实现快速切换和回退。

**优势**：

- ✅ 零停机时间部署
- ✅ 快速回退（秒级）
- ✅ 降低部署风险
- ✅ 便于测试新版本

---

## 架构设计

### 基于目录的蓝绿部署 ✅ 已实施

**目录结构**：

```
/opt/
├── openaero-web-blue/   (蓝环境 - 稳定版本)
├── openaero-web-green/  (绿环境 - 新版本)
└── openaero-web -> /opt/openaero-web-green  (符号链接，指向当前活动环境)
```

**工作原理**：

1. 两个独立的应用目录（blue 和 green）
2. 通过符号链接 `/opt/openaero-web` 指向当前活动环境
3. PM2 进程管理应用，工作目录使用符号链接
4. Nginx 反向代理到 `localhost:3000`
5. 部署时自动检测当前活动环境，部署到非活动环境
6. 部署完成后切换符号链接并重启 PM2

---

## 部署方案

### 方案 2：基于目录的蓝绿部署 ✅ 已实施

**架构设计**:

```
/opt/openaero-web-blue/  (蓝环境)
/opt/openaero-web-green/ (绿环境)
/opt/openaero-web -> /opt/openaero-web-green (符号链接)
```

**实现方式**:

- 两个独立的应用目录
- 通过符号链接切换当前运行目录
- PM2 配置指向符号链接

**部署脚本**:

- `scripts/deploy-blue-green-directory.sh` - 自动部署到非活动环境并切换
- `scripts/rollback-blue-green-directory.sh` - 快速回退到上一个环境

**使用方法**:

```bash
# 部署新版本
./scripts/deploy-blue-green-directory.sh

# 回退到上一个版本
./scripts/rollback-blue-green-directory.sh
```

---

## 使用方法

### 部署新版本

```bash
# 在项目根目录执行
./scripts/deploy-blue-green-directory.sh
```

**部署流程**：

1. 检测当前活动环境（blue/green）
2. 上传代码到非活动环境
3. 在服务器上安装依赖
4. 构建 Next.js 应用
5. 健康检查
6. 切换符号链接
7. 重启 PM2 应用
8. 最终健康检查

### 回退到上一个版本

```bash
# 在项目根目录执行
./scripts/rollback-blue-green-directory.sh
```

**回退流程**：

1. 检测当前活动环境
2. 切换到另一个环境
3. 重启 PM2 应用
4. 健康检查

---

## 访问方式

### 在线访问

**生产环境访问地址**：

- **主域名**: https://openaero.cn
- **所有路径**: https://openaero.cn/zh-CN/*

**说明**：

- 当前活动环境（green）通过符号链接 `/opt/openaero-web` 访问
- Nginx 反向代理到 `localhost:3000`
- 所有用户访问的都是当前活动环境

### 服务器本地测试

```bash
# SSH 登录服务器
ssh root@openaero.cn

# 测试当前活动环境
curl http://localhost:3000/zh-CN

# 查看当前活动环境
readlink -f /opt/openaero-web
```

### 环境标识

**如何确认当前访问的是哪个环境**：

```bash
# 方法 1: 查看符号链接
ssh root@openaero.cn 'readlink -f /opt/openaero-web'

# 方法 2: 查看 PM2 状态
ssh root@openaero.cn 'pm2 list | grep openaero-web'

# 方法 3: 查看应用日志（包含环境信息）
ssh root@openaero.cn 'pm2 logs openaero-web --lines 20'
```

---

## 回退操作

### 快速回退

如果新版本出现问题，可以快速回退：

```bash
./scripts/rollback-blue-green-directory.sh
```

**回退时间**：通常 5-10 秒

### 手动回退

如果需要手动回退：

```bash
ssh root@openaero.cn << 'EOF'
# 停止当前应用
pm2 stop openaero-web

# 切换符号链接（假设当前是 green，回退到 blue）
ln -sfn /opt/openaero-web-blue /opt/openaero-web

# 重启应用
cd /opt/openaero-web
pm2 restart openaero-web

# 验证
curl http://localhost:3000/zh-CN
EOF
```

---

## 故障排查

### 问题 1: 部署后应用无法访问

**检查步骤**：

```bash
# 1. 检查 PM2 状态
ssh root@openaero.cn 'pm2 list | grep openaero-web'

# 2. 检查应用日志
ssh root@openaero.cn 'pm2 logs openaero-web --lines 50'

# 3. 检查符号链接
ssh root@openaero.cn 'readlink -f /opt/openaero-web'

# 4. 检查端口监听
ssh root@openaero.cn 'netstat -tlnp | grep 3000'

# 5. 检查 Nginx 配置
ssh root@openaero.cn 'nginx -t && systemctl status nginx'
```

### 问题 2: PM2 工作目录不正确

**症状**：PM2 的 PWD 显示旧环境，但符号链接已切换

**解决方法**：

```bash
ssh root@openaero.cn << 'EOF'
# 删除并重新创建 PM2 进程
pm2 delete openaero-web
cd /opt/openaero-web
pm2 start npm --name openaero-web -- start
pm2 save
EOF
```

### 问题 3: 构建失败

**检查步骤**：

```bash
# 1. 检查服务器上的构建日志
ssh root@openaero.cn 'cd /opt/openaero-web-green && tail -50 npm-debug.log'

# 2. 检查环境变量
ssh root@openaero.cn 'cd /opt/openaero-web-green && [ -f .env.production ] && echo "✅ .env.production 存在" || echo "❌ .env.production 不存在"'

# 3. 手动测试构建
ssh root@openaero.cn 'cd /opt/openaero-web-green && npm run build'
```

### 问题 4: 健康检查失败

**解决方法**：

```bash
# 检查应用是否正常启动
ssh root@openaero.cn 'curl -f http://localhost:3000/api/health || echo "健康检查端点不存在或失败"'

# 检查应用响应
ssh root@openaero.cn 'curl -I http://localhost:3000/zh-CN'
```

---

## 最佳实践

### 1. 部署前检查

```bash
# 本地构建测试
npm run build

# 检查代码质量
npm run lint

# 运行测试（如果有）
npm test
```

### 2. 部署后验证

```bash
# 检查应用状态
ssh root@openaero.cn 'pm2 list | grep openaero-web'

# 测试关键页面
curl https://openaero.cn/zh-CN
curl https://openaero.cn/zh-CN/solutions
curl https://openaero.cn/zh-CN/shop/products

# 检查日志
ssh root@openaero.cn 'pm2 logs openaero-web --lines 20'
```

### 3. 监控和告警

建议设置监控来检测：

- 应用响应时间
- 错误率
- 服务器资源使用
- PM2 进程状态

### 4. 版本管理

- 每次部署前创建 Git 标签
- 记录部署时间和版本号
- 保留部署日志

---

## 常见问题

### Q: 如何同时访问两个环境进行对比测试？

**A**: 当前架构不支持同时访问两个环境。如果需要对比测试，可以：

1. 临时启动另一个环境在不同端口（如 3001）
2. 配置 Nginx 添加测试路由
3. 使用不同的子域名

### Q: 部署需要多长时间？

**A**: 通常 5-10 分钟，取决于：

- 代码上传速度
- 依赖安装时间
- 构建时间
- 网络状况

### Q: 回退会影响用户吗？

**A**: 不会。回退过程只需要几秒钟，用户几乎感觉不到。

### Q: 如何清理旧环境？

**A**: 建议保留至少一个旧版本作为备份。如果需要清理：

```bash
ssh root@openaero.cn 'rm -rf /opt/openaero-web-blue'  # 谨慎操作！
```

---

## 总结

基于目录的蓝绿部署方案已经成功实施，提供了：

- ✅ 零停机部署
- ✅ 快速回退能力
- ✅ 自动化部署流程
- ✅ 简单易用的脚本

**当前状态**：

- 活动环境：green
- 备份环境：blue
- 访问地址：https://openaero.cn

---

_最后更新：2025-11-24_
