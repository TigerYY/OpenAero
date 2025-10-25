# OpenAero 生产环境部署指南

## 概述

本指南详细说明了如何使用 Docker Compose 在 Ubuntu 服务器上部署 OpenAero 项目。

## 系统要求

### 服务器配置
- **最低配置**: 2 CPU, 4GB RAM, 20GB 存储
- **推荐配置**: 4 CPU, 8GB RAM, 50GB 存储
- **操作系统**: Ubuntu 20.04+ 或其他支持 Docker 的 Linux 发行版

### 软件依赖
- Docker Engine 20.10+
- Docker Compose 2.0+
- Nginx (可选，用于反向代理)
- Git

## 部署前准备

### 1. 安装 Docker 和 Docker Compose

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 将用户添加到 docker 组
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

### 2. 克隆项目代码

```bash
git clone <your-repository-url>
cd openaero.web
```

### 3. 配置环境变量

复制并编辑生产环境配置文件：

```bash
cp .env.production .env
```

**重要**: 请务必修改以下关键配置：

- `POSTGRES_PASSWORD`: 数据库密码
- `NEXTAUTH_SECRET`: 认证密钥
- `JWT_SECRET`: JWT 密钥
- `NEXT_PUBLIC_APP_URL`: 应用域名
- 其他第三方服务配置

### 4. 创建必要的目录

```bash
# 创建 SSL 证书目录
mkdir -p nginx/ssl

# 创建日志目录
mkdir -p logs/{app,nginx,postgres,redis}

# 创建备份目录
mkdir -p backups/{postgres,redis}
```

### 5. SSL 证书配置

#### 使用 Let's Encrypt (推荐)

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
sudo chown $USER:$USER nginx/ssl/*
```

#### 使用自签名证书 (仅用于测试)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

## 部署步骤

### 1. 使用部署脚本 (推荐)

```bash
# 给脚本执行权限
chmod +x deploy-production.sh

# 执行部署
./deploy-production.sh deploy
```

### 2. 手动部署

```bash
# 构建并启动服务
docker-compose -f docker-compose.production.yml up -d --build

# 等待服务启动
sleep 30

# 检查服务状态
docker-compose -f docker-compose.production.yml ps

# 查看日志
docker-compose -f docker-compose.production.yml logs -f
```

## 部署脚本使用说明

部署脚本 `deploy-production.sh` 提供了以下功能：

```bash
# 部署服务
./deploy-production.sh deploy

# 查看服务状态
./deploy-production.sh status

# 查看日志
./deploy-production.sh logs [service_name]

# 停止服务
./deploy-production.sh stop

# 重启服务
./deploy-production.sh restart

# 备份数据
./deploy-production.sh backup

# 清理未使用的资源
./deploy-production.sh cleanup
```

## 服务验证

### 1. 健康检查

```bash
# 检查应用健康状态
curl http://localhost:3000/api/health

# 检查 Nginx 状态
curl -I http://localhost

# 检查 HTTPS
curl -I https://yourdomain.com
```

### 2. 数据库连接测试

```bash
# 连接到 PostgreSQL
docker-compose -f docker-compose.production.yml exec db psql -U openaero -d openaero

# 连接到 Redis
docker-compose -f docker-compose.production.yml exec redis redis-cli ping
```

## 监控和维护

### 1. 日志管理

```bash
# 查看应用日志
docker-compose -f docker-compose.production.yml logs app

# 查看 Nginx 日志
docker-compose -f docker-compose.production.yml logs nginx

# 查看数据库日志
docker-compose -f docker-compose.production.yml logs db

### 2. 数据备份

```bash
# 自动备份 (通过脚本)
./deploy-production.sh backup

# 手动备份数据库
docker-compose -f docker-compose.production.yml exec db pg_dump -U openaero openaero > backup_$(date +%Y%m%d_%H%M%S).sql

# 手动备份 Redis
docker-compose -f docker-compose.production.yml exec redis redis-cli BGSAVE
```

### 3. 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新构建并部署
./deploy-production.sh deploy
```

## 性能优化

### 1. 资源限制

服务已配置了合理的资源限制：
- App: 1 CPU, 1GB RAM
- Database: 0.5 CPU, 512MB RAM  
- Redis: 0.2 CPU, 256MB RAM
- Nginx: 0.2 CPU, 128MB RAM

### 2. 缓存配置

- Redis 缓存已启用 AOF 持久化
- Nginx 配置了静态文件缓存
- 应用层缓存通过 Redis 实现

### 3. 数据库优化

- PostgreSQL 配置了合理的连接池
- 启用了查询优化和索引
- 配置了慢查询日志

## 故障排除

### 常见问题

1. **Docker 服务无法启动**
   ```bash
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

2. **端口冲突**
   ```bash
   # 检查端口占用
   sudo netstat -tlnp | grep :80
   sudo netstat -tlnp | grep :443
   ```

3. **SSL 证书问题**
   ```bash
   # 检查证书有效性
   openssl x509 -in nginx/ssl/fullchain.pem -text -noout
   ```

4. **数据库连接失败**
   ```bash
   # 检查数据库容器状态
   docker-compose -f docker-compose.production.yml logs db
   ```

### 日志位置

- 应用日志: `docker logs openaero-app`
- Nginx 日志: `docker logs openaero-nginx`
- 数据库日志: `docker logs openaero-db`
- Redis 日志: `docker logs openaero-redis`

## 安全建议

1. **定期更新**
   - 定期更新 Docker 镜像
   - 及时应用安全补丁

2. **访问控制**
   - 配置防火墙规则
   - 使用强密码
   - 启用 SSH 密钥认证

3. **监控告警**
   - 配置服务监控
   - 设置资源使用告警
   - 监控异常访问

4. **备份策略**
   - 定期备份数据库
   - 备份配置文件
   - 测试恢复流程

## 联系支持

如果在部署过程中遇到问题，请：

1. 检查日志文件
2. 参考故障排除部分
3. 提交 Issue 并附上相关日志

---

**注意**: 请在生产环境部署前，先在测试环境验证所有配置和流程。