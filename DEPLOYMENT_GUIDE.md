# 开元空御部署指南

本文档介绍开元空御项目的各种部署方式和配置方法。

## 📋 部署概览

开元空御支持多种部署方式：

- **Docker Compose**: 本地开发和简单部署
- **Kubernetes**: 生产环境容器编排
- **Vercel**: 无服务器部署
- **传统服务器**: 直接部署到服务器

## 🐳 Docker部署

### 开发环境

```bash
# 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 停止服务
docker-compose -f docker-compose.dev.yml down
```

### 生产环境

```bash
# 使用部署脚本
./scripts/deploy.sh production

# 或手动部署
docker-compose up -d

# 查看服务状态
docker-compose ps
```

### 环境变量配置

创建相应的环境文件：

```bash
# 开发环境
cp env.example .env.local

# 生产环境
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