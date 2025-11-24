# 部署到 root@openaero.cn 完整指南

## 📋 当前部署架构

### 服务器信息

- **服务器地址**: `root@openaero.cn`
- **应用目录**: `/opt/openaero-web`
- **运行方式**: PM2 进程管理
- **Web 服务器**: Nginx（反向代理）
- **SSL**: Let's Encrypt（HTTPS）
- **应用端口**: 3000（内部）

### 技术栈

- **Node.js**: 20.19.5
- **进程管理**: PM2
- **Web 框架**: Next.js
- **数据库**: Supabase PostgreSQL
- **反向代理**: Nginx

---

## 🚀 部署方式

### 方式 1：PM2 直接部署（当前使用）

**适用场景**: 直接在服务器上运行 Node.js 应用

**部署步骤**:

#### 1. 准备代码

```bash
# 在本地项目根目录
git add .
git commit -m "部署版本描述"
git push origin 006-user-auth-system
```

#### 2. 连接到服务器

```bash
ssh root@openaero.cn
```

#### 3. 进入应用目录

```bash
cd /opt/openaero-web
```

#### 4. 拉取最新代码

```bash
git fetch origin
git pull origin 006-user-auth-system
```

#### 5. 安装依赖

```bash
npm ci --production
```

#### 6. 构建应用

```bash
npm run build
```

#### 7. 重启应用

```bash
pm2 restart openaero-web
```

#### 8. 检查状态

```bash
pm2 status
pm2 logs openaero-web --lines 50
```

---

### 方式 2：使用自动化脚本

#### 从本地一键部署

**脚本位置**: `deployment/production/quick-pm2-deploy.sh`

```bash
# 在本地项目根目录执行
./deployment/production/quick-pm2-deploy.sh
```

**脚本功能**:

1. 上传部署脚本到服务器
2. 在服务器上执行 PM2 部署
3. 自动完成所有部署步骤

---

### 方式 3：Docker 部署（可选）

**适用场景**: 需要容器化部署

**部署步骤**:

#### 1. 构建镜像

```bash
# 在本地
docker build -f Dockerfile.production -t openaero-web:latest .
```

#### 2. 保存镜像

```bash
docker save openaero-web:latest | gzip > openaero-web-latest.tar.gz
```

#### 3. 传输到服务器

```bash
scp openaero-web-latest.tar.gz root@openaero.cn:/opt/
```

#### 4. 在服务器上加载

```bash
ssh root@openaero.cn
cd /opt
docker load -i openaero-web-latest.tar.gz
```

#### 5. 运行容器

```bash
docker run -d \
  --name openaero-web \
  -p 3000:3000 \
  --restart unless-stopped \
  -v /opt/openaero-web/.env.production:/app/.env.production \
  openaero-web:latest
```

---

## 📝 环境变量配置

### 服务器环境变量文件

**位置**: `/opt/openaero-web/.env.production`

**必需变量**:

```bash
# 数据库
DATABASE_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://openaero.cn
```

### 更新环境变量

```bash
# 方法 1: 直接编辑
ssh root@openaero.cn
cd /opt/openaero-web
nano .env.production

# 方法 2: 从本地同步
scp .env.local root@openaero.cn:/opt/openaero-web/.env.production
```

---

## 🔧 应用管理命令

### PM2 管理

```bash
# 查看状态
pm2 status
pm2 show openaero-web

# 查看日志
pm2 logs openaero-web
pm2 logs openaero-web --lines 100

# 重启应用
pm2 restart openaero-web

# 停止应用
pm2 stop openaero-web

# 启动应用
pm2 start openaero-web

# 删除应用
pm2 delete openaero-web

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

### Nginx 管理

```bash
# 检查配置
nginx -t

# 重载配置
systemctl reload nginx

# 重启 Nginx
systemctl restart nginx

# 查看状态
systemctl status nginx

# 查看日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 应用健康检查

```bash
# 检查应用是否运行
curl http://localhost:3000/api/health

# 检查外部访问
curl https://openaero.cn/api/health
```

---

## 🔍 故障排查

### 1. 应用无法启动

**检查步骤**:

```bash
# 1. 检查 PM2 状态
pm2 status

# 2. 查看错误日志
pm2 logs openaero-web --err

# 3. 检查端口占用
netstat -tulpn | grep 3000

# 4. 检查环境变量
cd /opt/openaero-web
cat .env.production

# 5. 检查 Node.js 版本
node -v
```

### 2. 应用响应慢

**检查步骤**:

```bash
# 1. 检查 PM2 资源使用
pm2 monit

# 2. 检查系统资源
htop

# 3. 检查数据库连接
# 在应用日志中查看数据库连接错误

# 4. 检查 Nginx 日志
tail -f /var/log/nginx/error.log
```

### 3. SSL 证书问题

**检查步骤**:

```bash
# 1. 检查证书有效期
certbot certificates

# 2. 更新证书
certbot renew

# 3. 检查 Nginx SSL 配置
nginx -t
```

### 4. 数据库连接问题

**检查步骤**:

```bash
# 1. 检查环境变量
cd /opt/openaero-web
grep DATABASE_URL .env.production

# 2. 测试数据库连接
# 使用 Prisma Studio 或 psql 连接测试

# 3. 检查 Supabase 状态
# 访问 Supabase Dashboard
```

---

## 📊 监控和维护

### 日志位置

- **PM2 日志**: `/root/.pm2/logs/`
  - `openaero-web-out.log` - 标准输出
  - `openaero-web-error.log` - 错误日志

- **Nginx 日志**: `/var/log/nginx/`
  - `access.log` - 访问日志
  - `error.log` - 错误日志

### 定期维护任务

```bash
# 1. 清理旧日志（每周）
pm2 flush

# 2. 更新依赖（每月）
cd /opt/openaero-web
npm update

# 3. 备份数据库（每天）
# 使用 Supabase 自动备份或手动备份

# 4. 检查磁盘空间
df -h

# 5. 更新系统包（定期）
apt update && apt upgrade -y
```

---

## 🔐 安全建议

1. **SSH 密钥认证**: 使用 SSH 密钥而非密码
2. **防火墙配置**: 只开放必要端口（80, 443, 22）
3. **定期更新**: 保持系统和依赖包更新
4. **环境变量安全**: 不要将敏感信息提交到 Git
5. **SSL 证书**: 确保 SSL 证书有效并自动续期
6. **PM2 安全**: 使用非 root 用户运行应用（可选）

---

## 📚 相关文档

- [系统检查报告](./SYSTEM_CHECK_REPORT.md)
- [部署测试计划](./DEPLOYMENT_TESTING_PLAN.md)
- [部署优化进度](./DEPLOYMENT_OPTIMIZATION_PROGRESS.md)

---

## 🆘 快速参考

### 常用命令速查

```bash
# 部署新版本
ssh root@openaero.cn "cd /opt/openaero-web && git pull && npm ci --production && npm run build && pm2 restart openaero-web"

# 查看实时日志
ssh root@openaero.cn "pm2 logs openaero-web"

# 检查应用状态
ssh root@openaero.cn "pm2 status && curl http://localhost:3000/api/health"

# 重启应用
ssh root@openaero.cn "pm2 restart openaero-web"

# 查看 Nginx 状态
ssh root@openaero.cn "systemctl status nginx && nginx -t"
```

---

## ✅ 部署检查清单

部署前检查:

- [ ] 代码已提交并推送到 Git
- [ ] 环境变量已更新（如需要）
- [ ] 数据库迁移已完成（如需要）
- [ ] 本地测试通过

部署后检查:

- [ ] PM2 应用状态为 `online`
- [ ] 应用日志无错误
- [ ] 健康检查通过
- [ ] Nginx 配置正确
- [ ] SSL 证书有效
- [ ] 网站可以正常访问

---

**最后更新**: 2025-01-23  
**维护者**: OpenAero 开发团队
