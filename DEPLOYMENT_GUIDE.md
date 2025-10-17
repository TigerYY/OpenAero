# OpenAero 部署指南

## 🚀 部署选项

### 选项 1: Vercel 部署（推荐）

#### 优势
- 零配置部署
- 自动 HTTPS
- 全球 CDN
- 自动扩展
- 预览部署

#### 部署步骤
1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 自动部署

```bash
# 使用 Vercel CLI
npm i -g vercel
vercel
```

#### 环境变量配置
在 Vercel Dashboard 添加：
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_GA_ID`

### 选项 2: Docker 部署

#### 构建镜像
```bash
# 构建生产镜像
docker build -t openaero/web:latest .

# 运行容器
docker run -p 3000:3000 \
  -e DATABASE_URL=your-db-url \
  -e NEXTAUTH_SECRET=your-secret \
  openaero/web:latest
```

#### 使用 Docker Compose
```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f web

# 停止服务
docker-compose down
```

#### 生产环境配置
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  web:
    image: openaero/web:${VERSION}
    restart: always
    environment:
      NODE_ENV: production
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### 选项 3: Kubernetes 部署

#### 前置要求
- Kubernetes 集群 (1.24+)
- kubectl 已配置
- Docker 镜像已推送到容器仓库

#### 部署步骤

1. **创建命名空间**
```bash
kubectl create namespace production
```

2. **创建 Secrets**
```bash
kubectl create secret generic openaero-secrets \
  --from-literal=database-url='your-db-url' \
  --from-literal=nextauth-secret='your-secret' \
  -n production
```

3. **部署应用**
```bash
kubectl apply -f k8s/deployment.yml
```

4. **验证部署**
```bash
# 检查 Pod 状态
kubectl get pods -n production

# 检查服务
kubectl get svc -n production

# 查看日志
kubectl logs -f deployment/openaero-web -n production
```

5. **配置 Ingress（可选）**
```yaml
# k8s/ingress.yml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: openaero-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - openaero.cn
    secretName: openaero-tls
  rules:
  - host: openaero.cn
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: openaero-web-service
            port:
              number: 80
```

## 🔧 CI/CD 流程

### GitHub Actions 自动部署

工作流已配置在 `.github/workflows/ci.yml`

#### 触发条件
- Push 到 `main` 分支
- Pull Request 到 `main` 分支

#### 流程步骤
1. 代码检查（Lint + TypeScript）
2. 运行测试
3. 构建应用
4. 部署到 Vercel/Kubernetes

### 手动部署脚本

创建 `scripts/deploy.sh`:
```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# 1. 构建
echo "📦 Building application..."
npm run build

# 2. 运行测试
echo "🧪 Running tests..."
npm run test

# 3. 构建 Docker 镜像
echo "🐳 Building Docker image..."
docker build -t openaero/web:${VERSION} .

# 4. 推送镜像
echo "📤 Pushing Docker image..."
docker push openaero/web:${VERSION}

# 5. 更新 Kubernetes
echo "☸️  Updating Kubernetes deployment..."
kubectl set image deployment/openaero-web \
  web=openaero/web:${VERSION} \
  -n production

# 6. 等待部署完成
echo "⏳ Waiting for rollout..."
kubectl rollout status deployment/openaero-web -n production

echo "✅ Deployment completed!"
```

## 📊 监控和日志

### 日志收集

#### Docker日志
```bash
docker logs -f openaero-web
```

#### Kubernetes日志
```bash
# 实时日志
kubectl logs -f deployment/openaero-web -n production

# 最近 100 行
kubectl logs --tail=100 deployment/openaero-web -n production
```

### 健康检查

#### 健康检查端点
```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
```

### 性能监控

#### Prometheus 指标
```yaml
# k8s/servicemonitor.yml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: openaero-web
  namespace: production
spec:
  selector:
    matchLabels:
      app: openaero
  endpoints:
  - port: web
    path: /api/metrics
    interval: 30s
```

## 🔒 安全配置

### SSL/TLS证书

#### 使用 Let's Encrypt
```bash
# 安装 cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# 创建 ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@openaero.cn
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 环境变量安全

使用 Kubernetes Secrets 或 Vault：
```bash
# 从文件创建 Secret
kubectl create secret generic openaero-env \
  --from-env-file=.env.production \
  -n production
```

## 🎯 性能优化

### CDN 配置

#### Cloudflare 设置
1. 添加域名到 Cloudflare
2. 配置 DNS 记录
3. 启用缓存规则
4. 配置 Page Rules

### 缓存策略

#### Next.js 配置
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

## 🔄 回滚策略

### Kubernetes 回滚
```bash
# 查看部署历史
kubectl rollout history deployment/openaero-web -n production

# 回滚到上一版本
kubectl rollout undo deployment/openaero-web -n production

# 回滚到指定版本
kubectl rollout undo deployment/openaero-web \
  --to-revision=2 \
  -n production
```

### Vercel 回滚
1. 访问 Vercel Dashboard
2. 选择部署历史
3. 点击"Promote to Production"

## ✅ 部署清单

- [ ] 环境变量已配置
- [ ] 数据库已迁移
- [ ] SSL证书已配置
- [ ] 监控已启用
- [ ] 日志收集已配置
- [ ] 备份策略已实施
- [ ] CDN已配置
- [ ] 健康检查正常
- [ ] 性能测试通过
- [ ] 安全扫描通过

## 📞 支持

遇到问题？
- 查看日志：`kubectl logs`
- 检查状态：`kubectl get pods`
- 查看事件：`kubectl get events`
- 联系运维团队：ops@openaero.cn
