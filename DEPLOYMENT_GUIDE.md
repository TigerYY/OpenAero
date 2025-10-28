# 开元空御生产环境部署指南

**版本**: 2.0  
**最后更新**: 2025-01-26  
**状态**: 生产环境已验证  

本文档记录了OpenAero项目完整的生产环境部署流程、方法和策略。

## 🎯 部署概览

### 部署架构
```
┌─────────────────────────────────────────┐
│         生产环境 (openaero.cn)           │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │   Nginx     │  │   Next.js App   │   │
│  │  (反向代理)  │  │   (主应用)      │   │
│  │  SSL终端    │  │   API Routes    │   │
│  └─────────────┘  └─────────────────┘   │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ PostgreSQL  │  │     Redis       │   │
│  │  (主数据库)  │  │    (缓存)       │   │
│  └─────────────┘  └─────────────────┘   │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Prometheus  │  │    Grafana      │   │
│  │  (监控数据)  │  │   (监控面板)     │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
```

### 技术栈
- **前端**: Next.js 14+ (App Router) + TypeScript
- **后端**: Next.js API Routes + PostgreSQL + Redis
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx (SSL终端 + 负载均衡)
- **监控**: Prometheus + Grafana
- **SSL证书**: Let's Encrypt (自动续期)

## 🚀 生产环境部署流程

### 阶段1: 基础环境准备

#### 1.1 服务器要求
```bash
# 最低配置要求
CPU: 2核心
内存: 4GB RAM
存储: 50GB SSD
网络: 100Mbps带宽
操作系统: Ubuntu 20.04+ / CentOS 8+
```

#### 1.2 Docker环境安装
```bash
# 安装Docker和Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 1.3 项目部署
```bash
# 克隆项目
git clone https://github.com/TigerYY/OpenAero.git
cd OpenAero/openaero.web

# 配置环境变量
cp .env.production.example .env.production
# 编辑环境变量文件，配置数据库、Redis等连接信息

# 启动生产环境
docker-compose -f docker-compose.prod.yml up -d
```

### 阶段2: 应用架构部署

#### 2.1 Next.js应用配置
```yaml
# docker-compose.prod.yml 核心配置
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
```

#### 2.2 数据库配置
```yaml
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: openaero
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
```

#### 2.3 Redis缓存配置
```yaml
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
```

### 阶段3: Nginx反向代理配置

#### 3.1 Nginx配置文件
```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name openaero.cn www.openaero.cn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name openaero.cn www.openaero.cn;

    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/openaero.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/openaero.cn/privkey.pem;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    # 反向代理到Next.js应用
    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 阶段4: SSL证书配置

#### 4.1 Let's Encrypt证书申请
```bash
# 安装Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 申请SSL证书
sudo certbot --nginx -d openaero.cn -d www.openaero.cn

# 设置自动续期
sudo crontab -e
# 添加以下行：
0 12 * * * /usr/bin/certbot renew --quiet
```

#### 4.2 Docker Compose SSL挂载
```yaml
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt/live/openaero.cn:/etc/letsencrypt/live/openaero.cn:ro
      - /etc/letsencrypt/archive/openaero.cn:/etc/letsencrypt/archive/openaero.cn:ro
    depends_on:
      - app
```

## 🔧 部署方法与工具

### 方法1: 自动化部署脚本
```bash
#!/bin/bash
# deploy-production.sh

echo "🚀 开始生产环境部署..."

# 1. 拉取最新代码
git pull origin main

# 2. 构建Docker镜像
docker-compose -f docker-compose.prod.yml build --no-cache

# 3. 停止旧服务
docker-compose -f docker-compose.prod.yml down

# 4. 启动新服务
docker-compose -f docker-compose.prod.yml up -d

# 5. 等待服务启动
sleep 30

# 6. 健康检查
curl -f http://localhost:3000/api/health || exit 1

echo "✅ 部署完成！"
```

### 方法2: 蓝绿部署策略
```bash
# 蓝绿部署脚本
#!/bin/bash

CURRENT_ENV=$(docker-compose -f docker-compose.prod.yml ps -q app | head -1)
if [ -z "$CURRENT_ENV" ]; then
    TARGET_ENV="blue"
else
    TARGET_ENV="green"
fi

echo "部署到 $TARGET_ENV 环境..."

# 启动新环境
docker-compose -f docker-compose.$TARGET_ENV.yml up -d

# 健康检查
sleep 30
curl -f http://localhost:3001/api/health

# 切换流量
nginx -s reload

# 停止旧环境
if [ "$TARGET_ENV" = "blue" ]; then
    docker-compose -f docker-compose.green.yml down
else
    docker-compose -f docker-compose.blue.yml down
fi
```

## 📊 监控与可观测性

### Prometheus配置
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'openaero-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/metrics'
    
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']
      
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:9187']
```

### Grafana仪表盘
```yaml
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    depends_on:
      - prometheus
```

## 🛡️ 安全策略

### 1. 网络安全
- SSL/TLS加密 (Let's Encrypt)
- HSTS安全头
- 防火墙配置 (UFW)
- DDoS防护

### 2. 应用安全
- 环境变量加密存储
- JWT令牌安全
- CORS配置
- 输入验证和清理

### 3. 数据安全
- 数据库连接加密
- 定期数据备份
- 敏感数据脱敏
- 访问日志记录

## ⚡ 性能优化

### 1. 前端优化
- Next.js静态生成 (SSG)
- 图片优化 (next/image)
- 代码分割和懒加载
- CDN加速

### 2. 后端优化
- Redis缓存策略
- 数据库查询优化
- API响应压缩
- 连接池配置

### 3. 基础设施优化
- Nginx缓存配置
- 负载均衡
- 资源监控告警
- 自动扩缩容

## 🔍 部署验证

### 1. 健康检查
```bash
# API健康检查
curl -f https://openaero.cn/api/health

# 数据库连接检查
curl -f https://openaero.cn/api/db-status

# Redis连接检查
curl -f https://openaero.cn/api/cache-status
```

### 2. 性能测试
```bash
# 负载测试
ab -n 1000 -c 10 https://openaero.cn/

# SSL证书检查
openssl s_client -connect openaero.cn:443 -servername openaero.cn
```

### 3. 监控验证
- Grafana仪表盘: http://your-server:3001
- Prometheus指标: http://your-server:9090
- 应用日志: `docker-compose logs -f app`

## 🚨 故障排除

### 常见问题
1. **SSL证书问题**: 检查证书路径和权限
2. **数据库连接失败**: 验证环境变量和网络连接
3. **Redis连接超时**: 检查Redis服务状态
4. **Nginx配置错误**: 验证配置文件语法

### 回滚策略
```bash
# 快速回滚到上一个版本
git checkout HEAD~1
docker-compose -f docker-compose.prod.yml up -d --build
```

## 📈 运维策略

### 1. 监控告警
- 应用性能监控 (APM)
- 错误率告警
- 资源使用率监控
- SSL证书到期提醒

### 2. 备份策略
- 数据库每日自动备份
- 代码版本控制
- 配置文件备份
- 灾难恢复计划

### 3. 更新维护
- 定期安全更新
- 依赖包更新
- 性能优化
- 功能迭代部署

---

## 📋 部署成果

### 访问地址
- **生产环境**: https://openaero.cn
- **监控面板**: http://your-server:3001 (Grafana)
- **指标收集**: http://your-server:9090 (Prometheus)

### 技术栈
- **前端**: Next.js 14+ + TypeScript + Tailwind CSS
- **后端**: PostgreSQL + Redis + Next.js API
- **容器化**: Docker + Docker Compose
- **监控**: Prometheus + Grafana
- **反向代理**: Nginx + Let's Encrypt SSL

### 安全等级
- ✅ SSL/TLS加密 (A+级别)
- ✅ 安全头配置完整
- ✅ 防火墙和访问控制
- ✅ 数据加密存储

### 可用性
- 🎯 目标可用性: 99.9%
- ⚡ 响应时间: <2秒
- 🔄 自动故障恢复
- 📊 实时监控告警

**部署完成时间**: 2025-01-26  
**维护团队**: OpenAero DevOps Team
cp env.example .env.production
```

## ☸️ Kubernetes部署

### 前提条件

- Kubernetes集群 (1.20+)
- kubectl配置
- Helm (可选)

### 部署步骤

```bash
# 创建命名空间
kubectl apply -f k8s/namespace.yaml

# 创建密钥
kubectl create secret generic openaero-secrets \
  --from-literal=database-url="postgresql://user:pass@host:5432/db" \
  --from-literal=nextauth-secret="your-secret" \
  -n openaero

# 创建配置
kubectl create configmap openaero-config \
  --from-literal=NODE_ENV=production \
  -n openaero

# 部署应用
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# 检查部署状态
kubectl get pods -n openaero
kubectl get services -n openaero
kubectl get ingress -n openaero
```

### 自动扩缩容

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: openaero-hpa
  namespace: openaero
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: openaero-web
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 🚀 Vercel部署

### 自动部署

1. 连接GitHub仓库到Vercel
2. 配置环境变量
3. 自动部署

### 手动部署

```bash
# 安装Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod

# 配置环境变量
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
```

### Vercel配置

创建 `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache"
        }
      ]
    }
  ]
}
```

## 🖥️ 传统服务器部署

### 系统要求

- Ubuntu 20.04+ / CentOS 8+
- Node.js 18+
- PostgreSQL 13+
- Nginx
- PM2 (进程管理)

### 部署步骤

```bash
# 1. 克隆代码
git clone https://github.com/TigerYY/OpenAero.git
cd OpenAero/openaero.web

# 2. 安装依赖
npm ci --production

# 3. 构建应用
npm run build

# 4. 安装PM2
npm install -g pm2

# 5. 启动应用
pm2 start ecosystem.config.js

# 6. 配置Nginx
sudo cp nginx/openaero.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/openaero.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### PM2配置

创建 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'openaero-web',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

## 🔧 环境配置

### 必需环境变量

```env
# 数据库
DATABASE_URL="postgresql://user:password@host:port/database"

# 认证
NEXTAUTH_URL="https://openaero.cn"
NEXTAUTH_SECRET="your-secret-key"

# 监控
SENTRY_DSN="your-sentry-dsn"
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"

# 邮件
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASS="your-password"
```

### 可选环境变量

```env
# 文件存储
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_S3_BUCKET="openaero-uploads"

# 支付
STRIPE_PUBLIC_KEY="your-stripe-public-key"
STRIPE_SECRET_KEY="your-stripe-secret-key"

# 分析
NEXT_PUBLIC_ANALYTICS_ID="your-analytics-id"
```

## 📊 监控和日志

### 健康检查

```bash
# 检查应用健康状态
curl http://localhost:3000/api/health

# 检查Docker容器
docker-compose ps

# 检查Kubernetes Pod
kubectl get pods -n openaero
```

### 日志查看

```bash
# Docker日志
docker-compose logs -f app

# Kubernetes日志
kubectl logs -f deployment/openaero-web -n openaero

# PM2日志
pm2 logs openaero-web
```

### 监控面板

- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **应用监控**: http://localhost:3000/admin/monitoring

## 🔄 CI/CD流程

### GitHub Actions

项目配置了完整的CI/CD流程：

1. **代码质量检查**: ESLint, TypeScript, Prettier
2. **测试**: 单元测试, E2E测试
3. **安全扫描**: npm audit, Snyk
4. **构建**: Docker镜像构建
5. **部署**: 自动部署到不同环境

### 部署流程

```mermaid
graph LR
    A[代码推送] --> B[质量检查]
    B --> C[测试]
    C --> D[安全扫描]
    D --> E[构建镜像]
    E --> F[部署]
    F --> G[健康检查]
```

## 🚨 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   lsof -i :3000
   
   # 使用端口清理脚本
   npm run clean-ports
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库状态
   docker-compose ps db
   
   # 查看数据库日志
   docker-compose logs db
   ```

3. **内存不足**
   ```bash
   # 检查内存使用
   docker stats
   
   # 清理Docker资源
   docker system prune -a
   ```

4. **SSL证书问题**
   ```bash
   # 检查证书
   openssl x509 -in cert.pem -text -noout
   
   # 重新生成证书
   ./scripts/generate-ssl.sh
   ```

### 性能优化

1. **启用Gzip压缩**
2. **配置CDN**
3. **优化图片**
4. **数据库索引**
5. **缓存策略**

## 📚 相关文档

- [Docker官方文档](https://docs.docker.com/)
- [Kubernetes官方文档](https://kubernetes.io/docs/)
- [Vercel部署指南](https://vercel.com/docs)
- [Next.js部署文档](https://nextjs.org/docs/deployment)

## 🤝 支持

如有部署问题，请：

1. 查看日志文件
2. 检查环境变量
3. 参考故障排除部分
4. 联系开发团队