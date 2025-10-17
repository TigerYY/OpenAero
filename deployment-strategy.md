# OpenAero 部署与发布策略

## 文档版本: 1.0
创建日期: 2025年1月27日
状态: 供团队评审

---

## 1. 部署策略概述

### 1.1 部署目标
- **零停机部署**: 确保服务在部署过程中持续可用
- **快速回滚**: 在出现问题时能够快速回滚到稳定版本
- **环境一致性**: 确保开发、测试、生产环境的一致性
- **自动化部署**: 减少人工错误，提高部署效率
- **安全部署**: 确保部署过程的安全性和合规性

### 1.2 部署环境架构
```
┌─────────────────────────────────────────┐
│              生产环境 (Production)       │
│  openaero.cn (主域名)                   │
│  - 高可用性配置                        │
│  - 负载均衡                            │
│  - CDN加速                             │
├─────────────────────────────────────────┤
│              预发布环境 (Staging)        │
│  staging.openaero.cn                   │
│  - 生产环境镜像                        │
│  - 完整功能测试                        │
│  - 性能测试                            │
├─────────────────────────────────────────┤
│              测试环境 (Testing)          │
│  test.openaero.cn                      │
│  - 功能测试                            │
│  - 集成测试                            │
│  - 自动化测试                          │
├─────────────────────────────────────────┤
│              开发环境 (Development)      │
│  dev.openaero.cn                       │
│  - 开发调试                            │
│  - 功能验证                            │
│  - 快速迭代                            │
└─────────────────────────────────────────┘
```

## 2. 部署工具与平台

### 2.1 部署工具栈
```typescript
// 部署工具配置
interface DeploymentStack {
  // 容器化
  containerization: {
    docker: 'Docker 24.0+'           // 容器化技术
    dockerCompose: 'Docker Compose 2.0+' // 本地开发
    kubernetes: 'Kubernetes 1.28+'   // 容器编排
  }
  
  // 部署平台
  platforms: {
    primary: 'Vercel'                // 前端部署
    secondary: 'AWS EKS'             // 后端服务
    backup: 'DigitalOcean'           // 备用平台
  }
  
  // CI/CD工具
  cicd: {
    primary: 'GitHub Actions'        // 持续集成
    secondary: 'ArgoCD'              // GitOps部署
    backup: 'Jenkins'                // 备用CI/CD
  }
  
  // 配置管理
  config: {
    primary: 'Kubernetes ConfigMaps' // 配置管理
    secondary: 'HashiCorp Consul'    // 服务发现
    backup: 'etcd'                   // 分布式配置
  }
  
  // 监控与日志
  observability: {
    monitoring: 'Prometheus + Grafana'
    logging: 'ELK Stack'
    tracing: 'Jaeger'
    alerting: 'AlertManager + PagerDuty'
  }
}
```

### 2.2 部署流程设计
```mermaid
graph TB
    A[代码提交] --> B[触发CI/CD]
    B --> C[代码质量检查]
    C --> D[单元测试]
    D --> E[集成测试]
    E --> F[构建Docker镜像]
    F --> G[推送到镜像仓库]
    G --> H[部署到测试环境]
    H --> I[自动化测试]
    I --> J{测试通过?}
    J -->|否| K[通知开发者]
    J -->|是| L[部署到预发布环境]
    L --> M[生产环境测试]
    M --> N{生产测试通过?}
    N -->|否| O[回滚到上一版本]
    N -->|是| P[蓝绿部署到生产环境]
    P --> Q[监控部署状态]
    Q --> R[部署完成]
```

## 3. 容器化部署

### 3.1 Docker配置

#### 3.1.1 多阶段Dockerfile
```dockerfile
# Dockerfile
# 阶段1: 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 生成Prisma客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

# 阶段2: 生产阶段
FROM node:18-alpine AS runner

WORKDIR /app

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 设置权限
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 启动应用
CMD ["node", "server.js"]
```

#### 3.1.2 Docker Compose配置
```yaml
# docker-compose.yml
version: '3.8'

services:
  # 前端应用
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/openaero
      - REDIS_URL=redis://redis:6379
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # 数据库
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=openaero
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d openaero"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis缓存
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 3.2 Kubernetes部署

#### 3.2.1 部署配置
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openaero-web
  labels:
    app: openaero-web
    version: v1.0.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: openaero-web
  template:
    metadata:
      labels:
        app: openaero-web
        version: v1.0.0
    spec:
      containers:
      - name: openaero-web
        image: openaero/web:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: openaero-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: openaero-secrets
              key: redis-url
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: openaero-secrets
              key: nextauth-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
      volumes:
      - name: config-volume
        configMap:
          name: openaero-config
      imagePullSecrets:
      - name: registry-secret
```

#### 3.2.2 服务配置
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: openaero-web-service
  labels:
    app: openaero-web
spec:
  selector:
    app: openaero-web
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: openaero-web-loadbalancer
  labels:
    app: openaero-web
spec:
  selector:
    app: openaero-web
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

#### 3.2.3 Ingress配置
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: openaero-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  tls:
  - hosts:
    - openaero.cn
    - www.openaero.cn
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
  - host: www.openaero.cn
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

## 4. CI/CD流水线

### 4.1 GitHub Actions工作流

#### 4.1.1 主CI/CD流水线
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 代码质量检查
  quality-check:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linting
      run: npm run lint
      
    - name: Run type checking
      run: npm run type-check
      
    - name: Run security audit
      run: npm audit --audit-level moderate

  # 测试阶段
  test:
    runs-on: ubuntu-latest
    needs: quality-check
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run unit tests
      run: npm run test:unit
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        REDIS_URL: redis://localhost:6379
        
    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        REDIS_URL: redis://localhost:6379
        
    - name: Run E2E tests
      run: npm run test:e2e
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        REDIS_URL: redis://localhost:6379
        
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: test-results
        path: test-results/

  # 构建阶段
  build:
    runs-on: ubuntu-latest
    needs: test
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
      
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
        
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}
          
    - name: Build and push Docker image
      id: build
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  # 部署到测试环境
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    environment: staging
    
    steps:
    - name: Deploy to staging
      uses: azure/k8s-deploy@v1
      with:
        manifests: |
          k8s/namespace.yaml
          k8s/configmap.yaml
          k8s/secret.yaml
          k8s/deployment.yaml
          k8s/service.yaml
          k8s/ingress.yaml
        images: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        namespace: openaero-staging
        
    - name: Run smoke tests
      run: |
        npm run test:smoke -- --base-url=https://staging.openaero.cn

  # 部署到生产环境
  deploy-production:
    runs-on: ubuntu-latest
    needs: [build, deploy-staging]
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
    - name: Deploy to production
      uses: azure/k8s-deploy@v1
      with:
        manifests: |
          k8s/namespace.yaml
          k8s/configmap.yaml
          k8s/secret.yaml
          k8s/deployment.yaml
          k8s/service.yaml
          k8s/ingress.yaml
        images: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        namespace: openaero-production
        
    - name: Run production smoke tests
      run: |
        npm run test:smoke -- --base-url=https://openaero.cn
        
    - name: Notify deployment success
      uses: 8398a7/action-slack@v3
      with:
        status: success
        channel: '#deployments'
        text: '🚀 OpenAero deployed successfully to production!'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

#### 4.1.2 回滚流水线
```yaml
# .github/workflows/rollback.yml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to rollback'
        required: true
        default: 'production'
        type: choice
        options:
        - staging
        - production
      version:
        description: 'Version to rollback to'
        required: true
        type: string

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    
    steps:
    - name: Rollback deployment
      uses: azure/k8s-deploy@v1
      with:
        manifests: |
          k8s/deployment.yaml
        images: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.event.inputs.version }}
        namespace: openaero-${{ github.event.inputs.environment }}
        strategy: replace
        
    - name: Verify rollback
      run: |
        kubectl rollout status deployment/openAero-web -n openaero-${{ github.event.inputs.environment }}
        
    - name: Notify rollback success
      uses: 8398a7/action-slack@v3
      with:
        status: success
        channel: '#deployments'
        text: '🔄 OpenAero rolled back to version ${{ github.event.inputs.version }} in ${{ github.event.inputs.environment }}'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 4.2 蓝绿部署策略

#### 4.2.1 蓝绿部署实现
```typescript
// scripts/blue-green-deploy.ts
import { execSync } from 'child_process'
import { promises as fs } from 'fs'

interface DeploymentConfig {
  environment: 'staging' | 'production'
  namespace: string
  serviceName: string
  deploymentName: string
  imageTag: string
}

class BlueGreenDeployer {
  private config: DeploymentConfig

  constructor(config: DeploymentConfig) {
    this.config = config
  }

  async deploy() {
    console.log(`Starting blue-green deployment for ${this.config.environment}`)
    
    try {
      // 1. 检查当前环境状态
      const currentColor = await this.getCurrentColor()
      const newColor = currentColor === 'blue' ? 'green' : 'blue'
      
      console.log(`Current color: ${currentColor}, Deploying to: ${newColor}`)
      
      // 2. 部署新版本到非活跃环境
      await this.deployToColor(newColor)
      
      // 3. 等待新版本就绪
      await this.waitForDeployment(newColor)
      
      // 4. 运行健康检查
      await this.runHealthChecks(newColor)
      
      // 5. 切换流量
      await this.switchTraffic(newColor)
      
      // 6. 验证切换结果
      await this.verifyTrafficSwitch(newColor)
      
      // 7. 清理旧版本（可选）
      await this.cleanupOldVersion(currentColor)
      
      console.log(`Blue-green deployment completed successfully`)
      
    } catch (error) {
      console.error('Blue-green deployment failed:', error)
      await this.rollback()
      throw error
    }
  }

  private async getCurrentColor(): Promise<'blue' | 'green'> {
    try {
      const output = execSync(
        `kubectl get service ${this.config.serviceName} -n ${this.config.namespace} -o jsonpath='{.spec.selector.color}'`,
        { encoding: 'utf8' }
      )
      return output.trim() as 'blue' | 'green'
    } catch {
      return 'blue' // 默认从blue开始
    }
  }

  private async deployToColor(color: 'blue' | 'green') {
    const manifest = await this.generateDeploymentManifest(color)
    const tempFile = `/tmp/deployment-${color}.yaml`
    
    await fs.writeFile(tempFile, manifest)
    
    execSync(`kubectl apply -f ${tempFile} -n ${this.config.namespace}`)
    await fs.unlink(tempFile)
  }

  private async waitForDeployment(color: 'blue' | 'green') {
    const deploymentName = `${this.config.deploymentName}-${color}`
    
    execSync(
      `kubectl rollout status deployment/${deploymentName} -n ${this.config.namespace} --timeout=300s`
    )
  }

  private async runHealthChecks(color: 'blue' | 'green') {
    const serviceName = `${this.config.serviceName}-${color}`
    const healthCheckUrl = `http://${serviceName}.${this.config.namespace}.svc.cluster.local/api/health`
    
    // 运行健康检查
    const maxRetries = 10
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(healthCheckUrl)
        if (response.ok) {
          console.log(`Health check passed for ${color} environment`)
          return
        }
      } catch (error) {
        console.log(`Health check attempt ${i + 1} failed:`, error.message)
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)) // 等待10秒
    }
    
    throw new Error(`Health checks failed for ${color} environment`)
  }

  private async switchTraffic(color: 'blue' | 'green') {
    // 更新服务选择器指向新颜色
    execSync(
      `kubectl patch service ${this.config.serviceName} -n ${this.config.namespace} -p '{"spec":{"selector":{"color":"${color}"}}}'`
    )
    
    console.log(`Traffic switched to ${color} environment`)
  }

  private async verifyTrafficSwitch(color: 'blue' | 'green') {
    // 验证流量切换是否成功
    const maxRetries = 5
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`https://${this.config.environment === 'production' ? 'openaero.cn' : 'staging.openaero.cn'}/api/health`)
        if (response.ok) {
          console.log('Traffic switch verification successful')
          return
        }
      } catch (error) {
        console.log(`Traffic switch verification attempt ${i + 1} failed:`, error.message)
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000)) // 等待5秒
    }
    
    throw new Error('Traffic switch verification failed')
  }

  private async cleanupOldVersion(color: 'blue' | 'green') {
    // 清理旧版本部署
    try {
      execSync(
        `kubectl delete deployment ${this.config.deploymentName}-${color} -n ${this.config.namespace}`
      )
      console.log(`Cleaned up old ${color} deployment`)
    } catch (error) {
      console.warn(`Failed to cleanup old ${color} deployment:`, error.message)
    }
  }

  private async rollback() {
    console.log('Rolling back deployment...')
    // 实现回滚逻辑
  }

  private async generateDeploymentManifest(color: 'blue' | 'green'): Promise<string> {
    // 生成部署清单
    return `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${this.config.deploymentName}-${color}
  labels:
    app: ${this.config.deploymentName}
    color: ${color}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${this.config.deploymentName}
      color: ${color}
  template:
    metadata:
      labels:
        app: ${this.config.deploymentName}
        color: ${color}
    spec:
      containers:
      - name: ${this.config.deploymentName}
        image: ${this.config.imageTag}
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "${this.config.environment}"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ${this.config.serviceName}-${color}
  labels:
    app: ${this.config.deploymentName}
    color: ${color}
spec:
  selector:
    app: ${this.config.deploymentName}
    color: ${color}
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
`
  }
}

// 使用示例
const deployer = new BlueGreenDeployer({
  environment: 'production',
  namespace: 'openaero-production',
  serviceName: 'openaero-web-service',
  deploymentName: 'openaero-web',
  imageTag: 'ghcr.io/tigeryy/openaero:latest'
})

deployer.deploy().catch(console.error)
```

## 5. 环境管理

### 5.1 环境配置管理

#### 5.1.1 配置分层
```typescript
// config/environments.ts
interface EnvironmentConfig {
  name: string
  domain: string
  database: DatabaseConfig
  redis: RedisConfig
  auth: AuthConfig
  monitoring: MonitoringConfig
  features: FeatureFlags
}

interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
  pool: {
    min: number
    max: number
  }
}

interface FeatureFlags {
  enableAnalytics: boolean
  enableNotifications: boolean
  enablePayments: boolean
  enableCreatorDashboard: boolean
  enableAdminPanel: boolean
}

// 环境配置
export const environments: Record<string, EnvironmentConfig> = {
  development: {
    name: 'development',
    domain: 'dev.openaero.cn',
    database: {
      host: 'localhost',
      port: 5432,
      database: 'openaero_dev',
      username: 'dev_user',
      password: 'dev_password',
      ssl: false,
      pool: { min: 2, max: 10 }
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: '',
      db: 0
    },
    auth: {
      secret: 'dev-secret-key',
      expiresIn: '7d',
      refreshExpiresIn: '30d'
    },
    monitoring: {
      enableMetrics: false,
      enableLogging: true,
      logLevel: 'debug'
    },
    features: {
      enableAnalytics: false,
      enableNotifications: true,
      enablePayments: false,
      enableCreatorDashboard: true,
      enableAdminPanel: true
    }
  },
  
  staging: {
    name: 'staging',
    domain: 'staging.openaero.cn',
    database: {
      host: process.env.STAGING_DB_HOST!,
      port: 5432,
      database: 'openaero_staging',
      username: process.env.STAGING_DB_USER!,
      password: process.env.STAGING_DB_PASSWORD!,
      ssl: true,
      pool: { min: 5, max: 20 }
    },
    redis: {
      host: process.env.STAGING_REDIS_HOST!,
      port: 6379,
      password: process.env.STAGING_REDIS_PASSWORD!,
      db: 0
    },
    auth: {
      secret: process.env.STAGING_AUTH_SECRET!,
      expiresIn: '1d',
      refreshExpiresIn: '7d'
    },
    monitoring: {
      enableMetrics: true,
      enableLogging: true,
      logLevel: 'info'
    },
    features: {
      enableAnalytics: true,
      enableNotifications: true,
      enablePayments: true,
      enableCreatorDashboard: true,
      enableAdminPanel: true
    }
  },
  
  production: {
    name: 'production',
    domain: 'openaero.cn',
    database: {
      host: process.env.PROD_DB_HOST!,
      port: 5432,
      database: 'openaero_prod',
      username: process.env.PROD_DB_USER!,
      password: process.env.PROD_DB_PASSWORD!,
      ssl: true,
      pool: { min: 10, max: 50 }
    },
    redis: {
      host: process.env.PROD_REDIS_HOST!,
      port: 6379,
      password: process.env.PROD_REDIS_PASSWORD!,
      db: 0
    },
    auth: {
      secret: process.env.PROD_AUTH_SECRET!,
      expiresIn: '1h',
      refreshExpiresIn: '7d'
    },
    monitoring: {
      enableMetrics: true,
      enableLogging: true,
      logLevel: 'warn'
    },
    features: {
      enableAnalytics: true,
      enableNotifications: true,
      enablePayments: true,
      enableCreatorDashboard: true,
      enableAdminPanel: true
    }
  }
}

export function getConfig(environment: string = process.env.NODE_ENV || 'development'): EnvironmentConfig {
  const config = environments[environment]
  if (!config) {
    throw new Error(`Unknown environment: ${environment}`)
  }
  return config
}
```

#### 5.1.2 密钥管理
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: openaero-secrets
  namespace: openaero-production
type: Opaque
data:
  database-url: <base64-encoded-database-url>
  redis-url: <base64-encoded-redis-url>
  nextauth-secret: <base64-encoded-nextauth-secret>
  stripe-secret-key: <base64-encoded-stripe-secret-key>
  sendgrid-api-key: <base64-encoded-sendgrid-api-key>
---
apiVersion: v1
kind: Secret
metadata:
  name: openaero-secrets
  namespace: openaero-staging
type: Opaque
data:
  database-url: <base64-encoded-staging-database-url>
  redis-url: <base64-encoded-staging-redis-url>
  nextauth-secret: <base64-encoded-staging-nextauth-secret>
  stripe-secret-key: <base64-encoded-staging-stripe-secret-key>
  sendgrid-api-key: <base64-encoded-staging-sendgrid-api-key>
```

### 5.2 数据库迁移

#### 5.2.1 迁移脚本
```typescript
// scripts/migrate.ts
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

class DatabaseMigrator {
  private prisma: PrismaClient
  private environment: string

  constructor(environment: string) {
    this.environment = environment
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })
  }

  async migrate() {
    console.log(`Starting database migration for ${this.environment}`)
    
    try {
      // 1. 备份数据库
      await this.backupDatabase()
      
      // 2. 运行Prisma迁移
      await this.runPrismaMigrations()
      
      // 3. 运行自定义迁移
      await this.runCustomMigrations()
      
      // 4. 验证迁移结果
      await this.verifyMigration()
      
      console.log('Database migration completed successfully')
      
    } catch (error) {
      console.error('Database migration failed:', error)
      await this.rollbackMigration()
      throw error
    } finally {
      await this.prisma.$disconnect()
    }
  }

  private async backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = `backup-${this.environment}-${timestamp}.sql`
    
    console.log(`Creating database backup: ${backupFile}`)
    
    execSync(
      `pg_dump ${process.env.DATABASE_URL} > ${backupFile}`,
      { stdio: 'inherit' }
    )
    
    console.log(`Database backup created: ${backupFile}`)
  }

  private async runPrismaMigrations() {
    console.log('Running Prisma migrations...')
    
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL
      }
    })
    
    console.log('Prisma migrations completed')
  }

  private async runCustomMigrations() {
    console.log('Running custom migrations...')
    
    // 执行自定义迁移脚本
    const migrations = [
      'migrations/001-add-user-roles.sql',
      'migrations/002-add-product-categories.sql',
      'migrations/003-add-payment-methods.sql'
    ]
    
    for (const migration of migrations) {
      console.log(`Running migration: ${migration}`)
      
      try {
        const migrationSQL = await fs.readFile(migration, 'utf8')
        await this.prisma.$executeRawUnsafe(migrationSQL)
        console.log(`Migration ${migration} completed`)
      } catch (error) {
        console.warn(`Migration ${migration} failed or already applied:`, error.message)
      }
    }
  }

  private async verifyMigration() {
    console.log('Verifying migration...')
    
    // 检查关键表是否存在
    const tables = await this.prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    
    const expectedTables = ['User', 'Product', 'Order', 'Payment']
    const existingTables = (tables as any[]).map(t => t.table_name)
    
    for (const table of expectedTables) {
      if (!existingTables.includes(table.toLowerCase())) {
        throw new Error(`Table ${table} not found after migration`)
      }
    }
    
    console.log('Migration verification completed')
  }

  private async rollbackMigration() {
    console.log('Rolling back migration...')
    // 实现回滚逻辑
  }
}

// 使用示例
const migrator = new DatabaseMigrator(process.env.NODE_ENV || 'development')
migrator.migrate().catch(console.error)
```

## 6. 发布策略

### 6.1 发布类型

#### 6.1.1 发布分类
```typescript
interface ReleaseType {
  type: 'major' | 'minor' | 'patch' | 'hotfix'
  description: string
  versioning: 'semantic'
  approval: 'automatic' | 'manual'
  testing: 'minimal' | 'standard' | 'extensive'
  rollback: 'automatic' | 'manual'
}

const releaseTypes: Record<string, ReleaseType> = {
  major: {
    type: 'major',
    description: '重大功能更新，可能包含破坏性变更',
    versioning: 'semantic',
    approval: 'manual',
    testing: 'extensive',
    rollback: 'manual'
  },
  
  minor: {
    type: 'minor',
    description: '新功能添加，向后兼容',
    versioning: 'semantic',
    approval: 'automatic',
    testing: 'standard',
    rollback: 'automatic'
  },
  
  patch: {
    type: 'patch',
    description: 'Bug修复和小改进',
    versioning: 'semantic',
    approval: 'automatic',
    testing: 'minimal',
    rollback: 'automatic'
  },
  
  hotfix: {
    type: 'hotfix',
    description: '紧急修复，直接部署到生产环境',
    versioning: 'semantic',
    approval: 'manual',
    testing: 'minimal',
    rollback: 'automatic'
  }
}
```

#### 6.1.2 版本管理
```typescript
// scripts/version.ts
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'

class VersionManager {
  private currentVersion: string

  constructor() {
    this.currentVersion = this.getCurrentVersion()
  }

  getCurrentVersion(): string {
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
      return packageJson.version
    } catch {
      return '0.0.0'
    }
  }

  bumpVersion(type: 'major' | 'minor' | 'patch'): string {
    const [major, minor, patch] = this.currentVersion.split('.').map(Number)
    
    let newVersion: string
    switch (type) {
      case 'major':
        newVersion = `${major + 1}.0.0`
        break
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`
        break
      case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`
        break
    }

    // 更新package.json
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    packageJson.version = newVersion
    writeFileSync('package.json', JSON.stringify(packageJson, null, 2))

    // 创建Git标签
    execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`)
    execSync(`git push origin v${newVersion}`)

    return newVersion
  }

  createHotfixVersion(): string {
    const [major, minor, patch] = this.currentVersion.split('.').map(Number)
    const hotfixVersion = `${major}.${minor}.${patch + 1}-hotfix`
    
    // 更新package.json
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    packageJson.version = hotfixVersion
    writeFileSync('package.json', JSON.stringify(packageJson, null, 2))

    return hotfixVersion
  }

  generateChangelog(version: string): string {
    // 生成变更日志
    const commits = execSync(`git log --oneline v${this.currentVersion}..HEAD`, { encoding: 'utf8' })
    
    return `# Changelog v${version}

## Changes
${commits.split('\n').filter(Boolean).map(commit => `- ${commit}`).join('\n')}

## Deployment
- Environment: ${process.env.NODE_ENV || 'development'}
- Timestamp: ${new Date().toISOString()}
- Commit: ${execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()}
`
  }
}

export const versionManager = new VersionManager()
```

### 6.2 发布流程

#### 6.2.1 标准发布流程
```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm run test:all
      
    - name: Build application
      run: npm run build
      
    - name: Create release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: ${{ github.ref }}
        release_name: Release ${{ github.ref }}
        body: |
          ## Changes
          - See CHANGELOG.md for details
          
          ## Deployment
          - Environment: Production
          - Timestamp: ${{ github.event.head_commit.timestamp }}
          - Commit: ${{ github.sha }}
        draft: false
        prerelease: false
        
    - name: Deploy to production
      run: |
        npm run deploy:production
        
    - name: Notify release
      uses: 8398a7/action-slack@v3
      with:
        status: success
        channel: '#releases'
        text: '🎉 New release ${{ github.ref }} deployed to production!'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

#### 6.2.2 热修复流程
```yaml
# .github/workflows/hotfix.yml
name: Hotfix

on:
  workflow_dispatch:
    inputs:
      issue:
        description: 'Issue number or description'
        required: true
        type: string
      severity:
        description: 'Severity level'
        required: true
        type: choice
        options:
        - critical
        - high
        - medium

jobs:
  hotfix:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Create hotfix branch
      run: |
        git checkout -b hotfix/${{ github.event.inputs.issue }}
        
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run critical tests
      run: npm run test:critical
      
    - name: Build application
      run: npm run build
      
    - name: Deploy hotfix
      run: |
        npm run deploy:hotfix
        
    - name: Notify hotfix
      uses: 8398a7/action-slack@v3
      with:
        status: success
        channel: '#hotfixes'
        text: '🚨 Hotfix deployed for issue: ${{ github.event.inputs.issue }}'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## 7. 总结

本部署与发布策略为OpenAero项目提供了：

1. **完整的部署体系**：从开发到生产的全流程部署方案
2. **容器化部署**：Docker和Kubernetes的标准化部署
3. **自动化CI/CD**：GitHub Actions驱动的持续集成和部署
4. **蓝绿部署**：零停机时间的生产环境更新
5. **环境管理**：多环境配置和密钥管理
6. **数据库迁移**：安全的数据库版本管理
7. **发布策略**：标准发布和热修复流程
8. **监控告警**：部署过程的实时监控和通知

这个部署策略将确保OpenAero平台能够快速、安全、可靠地部署和更新，为业务发展提供强有力的技术支撑。
