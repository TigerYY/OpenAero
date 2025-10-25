# OpenAero PM2 部署指南

## 概述

PM2 是一个强大的 Node.js 进程管理器，提供生产环境所需的功能，如自动重启、负载均衡、监控等。相比 Docker，PM2 部署更简单、更稳定。

## 优势

- ✅ **简单易用**: 无需容器化，直接运行 Node.js
- ✅ **稳定可靠**: 自动重启、错误恢复
- ✅ **性能优秀**: 无容器开销，直接运行
- ✅ **易于调试**: 直接访问日志和进程
- ✅ **资源占用少**: 比 Docker 更轻量

## 部署步骤

### 1. 快速部署（推荐）

从本地机器执行：

```bash
# 给脚本执行权限
chmod +x deployment/production/quick-pm2-deploy.sh

# 执行快速部署
./deployment/production/quick-pm2-deploy.sh
```

### 2. 手动部署

如果需要手动控制每个步骤：

```bash
# 1. 连接到服务器
ssh root@openaero.cn

# 2. 执行部署脚本
cd /opt/openaero-web-deploy/production
chmod +x pm2-deploy.sh
./pm2-deploy.sh
```

## 部署后配置

### 1. 配置环境变量

编辑生产环境配置：

```bash
nano /opt/openaero-web/.env.production
```

填入正确的配置值：

```env
NODE_ENV=production
NEXTAUTH_URL=https://openaero.cn
NEXTAUTH_SECRET=your-actual-secret-key
DATABASE_URL=your-actual-database-url
```

### 2. 重启应用

```bash
pm2 restart openaero-web
```

## 常用管理命令

### 查看应用状态
```bash
pm2 status
pm2 list
```

### 查看日志
```bash
# 查看实时日志
pm2 logs openaero-web

# 查看最近100行日志
pm2 logs openaero-web --lines 100

# 清空日志
pm2 flush openaero-web
```

### 重启应用
```bash
# 重启应用
pm2 restart openaero-web

# 重载应用（零停机时间）
pm2 reload openaero-web

# 停止应用
pm2 stop openaero-web

# 删除应用
pm2 delete openaero-web
```

### 监控
```bash
# 实时监控
pm2 monit

# 查看详细信息
pm2 show openaero-web
```

## 更新部署

### 1. 更新代码
```bash
cd /opt/openaero-web
git pull origin 003-prd-document-enhancement
npm ci --production
npm run build
pm2 restart openaero-web
```

### 2. 回滚到备份
```bash
# 查看备份
ls /opt/openaero-web-backup/

# 回滚到指定备份
cp -r /opt/openaero-web-backup/backup_20241201_143000/* /opt/openaero-web/
pm2 restart openaero-web
```

## 故障排除

### 1. 应用无法启动
```bash
# 查看错误日志
pm2 logs openaero-web --err

# 检查端口占用
netstat -tlnp | grep :3000

# 检查环境变量
pm2 show openaero-web
```

### 2. 性能问题
```bash
# 查看资源使用
pm2 monit

# 查看进程信息
pm2 show openaero-web
```

### 3. 内存泄漏
```bash
# 设置内存限制
pm2 restart openaero-web --max-memory-restart 1G
```

## 监控和日志

### 1. 设置日志轮转
```bash
# 安装日志轮转模块
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 2. 设置开机自启
```bash
# 保存当前 PM2 进程列表
pm2 save

# 生成启动脚本
pm2 startup

# 按照提示执行命令
```

## 安全建议

### 1. 防火墙配置
```bash
# 只允许必要端口
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

### 2. 定期备份
```bash
# 创建备份脚本
cat > /opt/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /opt/backups/openaero_$DATE.tar.gz /opt/openaero-web
find /opt/backups -name "openaero_*.tar.gz" -mtime +7 -delete
EOF

chmod +x /opt/backup.sh

# 设置定时任务
crontab -e
# 添加：0 2 * * * /opt/backup.sh
```

## 性能优化

### 1. 启用集群模式
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'openaero-web',
    script: 'npm',
    args: 'start',
    instances: 'max', // 使用所有CPU核心
    exec_mode: 'cluster'
  }]
};
```

### 2. 内存优化
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'openaero-web',
    script: 'npm',
    args: 'start',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

## 总结

PM2 部署方案相比 Docker 有以下优势：

1. **更简单**: 无需处理容器化复杂性
2. **更稳定**: 避免 Docker Hub 服务问题
3. **更快速**: 直接运行，无容器开销
4. **更易调试**: 直接访问进程和日志
5. **更轻量**: 资源占用更少

推荐使用 PM2 方案进行生产环境部署。
