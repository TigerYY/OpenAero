# OpenAero 直接 Node.js 部署指南

## 概述

直接 Node.js 部署是最简单、最直接的部署方式，使用系统原生的 systemd 服务管理，无需额外的进程管理器。

## 方案对比

| 特性 | 直接 Node.js | PM2 | Docker |
|------|-------------|-----|--------|
| **复杂度** | ⭐ 最简单 | ⭐⭐ 简单 | ⭐⭐⭐ 复杂 |
| **性能** | ⭐⭐⭐ 最佳 | ⭐⭐⭐ 最佳 | ⭐⭐ 良好 |
| **资源占用** | ⭐⭐⭐ 最少 | ⭐⭐ 较少 | ⭐ 较多 |
| **调试难度** | ⭐ 最容易 | ⭐⭐ 容易 | ⭐⭐⭐ 困难 |
| **依赖管理** | ⭐ 最少 | ⭐⭐ 较少 | ⭐⭐⭐ 最多 |
| **稳定性** | ⭐⭐⭐ 最稳定 | ⭐⭐⭐ 稳定 | ⭐⭐ 一般 |

## 优势

- ✅ **最简单**: 直接运行 `npm start`，无需额外工具
- ✅ **最稳定**: 使用系统原生服务管理
- ✅ **性能最佳**: 无任何中间层开销
- ✅ **资源最少**: 只运行必要的 Node.js 进程
- ✅ **调试最容易**: 直接访问进程和日志
- ✅ **依赖最少**: 只需要 Node.js 和 npm

## 部署步骤

### 1. 快速部署（推荐）

从本地机器执行：

```bash
# 给脚本执行权限
chmod +x deployment/production/quick-direct-deploy.sh

# 执行快速部署
./deployment/production/quick-direct-deploy.sh
```

### 2. 手动部署

如果需要手动控制每个步骤：

```bash
# 1. 连接到服务器
ssh root@openaero.cn

# 2. 执行部署脚本
cd /opt/openaero-web-deploy/production
chmod +x direct-node-deploy.sh
./direct-node-deploy.sh
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
PORT=3000
```

### 2. 重启服务

```bash
openaero-restart
# 或者
systemctl restart openaero-web
```

## 常用管理命令

### 查看服务状态
```bash
# 使用便捷命令
openaero-status

# 或使用系统命令
systemctl status openaero-web
systemctl is-active openaero-web
systemctl is-enabled openaero-web
```

### 查看日志
```bash
# 使用便捷命令（实时日志）
openaero-logs

# 或使用系统命令
journalctl -u openaero-web -f
journalctl -u openaero-web --since "1 hour ago"
journalctl -u openaero-web --lines 100
```

### 重启服务
```bash
# 使用便捷命令
openaero-restart

# 或使用系统命令
systemctl restart openaero-web
systemctl reload openaero-web  # 重载配置
```

### 停止/启动服务
```bash
systemctl stop openaero-web
systemctl start openaero-web
systemctl enable openaero-web   # 开机自启
systemctl disable openaero-web  # 取消开机自启
```

## 更新部署

### 1. 更新代码
```bash
cd /opt/openaero-web
git pull origin 003-prd-document-enhancement
npm ci --production
npm run build
openaero-restart
```

### 2. 回滚到备份
```bash
# 查看备份
ls /opt/openaero-web-backup/

# 回滚到指定备份
cp -r /opt/openaero-web-backup/backup_20241201_143000/* /opt/openaero-web/
openaero-restart
```

## 故障排除

### 1. 服务无法启动
```bash
# 查看详细错误信息
systemctl status openaero-web -l

# 查看启动日志
journalctl -u openaero-web --since "10 minutes ago"

# 检查端口占用
netstat -tlnp | grep :3000
ss -tlnp | grep :3000
```

### 2. 权限问题
```bash
# 检查文件权限
ls -la /opt/openaero-web/

# 修复权限
chown -R www-data:www-data /opt/openaero-web/
chmod +x /opt/openaero-web/server.js
```

### 3. 环境变量问题
```bash
# 检查环境变量
systemctl show openaero-web --property=Environment
systemctl show openaero-web --property=EnvironmentFile

# 重载环境变量
systemctl daemon-reload
systemctl restart openaero-web
```

### 4. 内存问题
```bash
# 查看内存使用
free -h
ps aux --sort=-%mem | head

# 查看服务资源使用
systemctl status openaero-web
```

## 监控和日志

### 1. 设置日志轮转
```bash
# 创建日志轮转配置
cat > /etc/logrotate.d/openaero-web << 'EOF'
/var/log/syslog {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    postrotate
        systemctl reload rsyslog
    endscript
}
EOF
```

### 2. 设置监控脚本
```bash
# 创建健康检查脚本
cat > /opt/openaero-web/health-check.sh << 'EOF'
#!/bin/bash
if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "Health check failed, restarting service..."
    systemctl restart openaero-web
fi
EOF

chmod +x /opt/openaero-web/health-check.sh

# 设置定时任务
crontab -e
# 添加：*/5 * * * * /opt/openaero-web/health-check.sh
```

## 性能优化

### 1. 系统级优化
```bash
# 增加文件描述符限制
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# 优化内核参数
cat >> /etc/sysctl.conf << 'EOF'
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 10
EOF

sysctl -p
```

### 2. Node.js 优化
```bash
# 在 .env.production 中添加
cat >> /opt/openaero-web/.env.production << 'EOF'
NODE_OPTIONS=--max-old-space-size=1024
UV_THREADPOOL_SIZE=16
EOF
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

## 总结

**直接 Node.js 部署**是最推荐的方案，因为：

1. **最简单**: 无需学习额外工具
2. **最稳定**: 使用系统原生服务管理
3. **性能最佳**: 无任何中间层开销
4. **资源最少**: 只运行必要的进程
5. **调试最容易**: 直接访问系统日志
6. **依赖最少**: 只需要 Node.js

相比 PM2 和 Docker，直接 Node.js 部署是最适合您当前项目架构的方案。
