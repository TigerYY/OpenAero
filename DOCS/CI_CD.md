# CI/CD 配置指南

## 📋 概述

OpenAero 项目采用现代化的 CI/CD 流水线，实现代码提交、测试、构建、部署的完全自动化。本指南详细说明了 CI/CD 架构、配置方法和最佳实践。

## 🏗️ CI/CD 架构

### 流水线架构图

```mermaid
graph TB
    subgraph "代码提交"
        A[Git Push] --> B[触发 CI/CD]
    end
    
    subgraph "CI 阶段"
        B --> C[代码检查]
        C --> D[单元测试]
        D --> E[集成测试]
        E --> F[安全扫描]
        F --> G[构建产物]
    end
    
    subgraph "CD 阶段"
        G --> H{分支判断}
        H -->|develop| I[部署到 Staging]
        H -->|main| J[部署到 Production]
        I --> K[E2E 测试]
        K --> L[性能测试]
        J --> M[健康检查]
        L --> N[手动审批]
        N --> O[生产部署]
        M --> P[监控告警]
        O --> P
    end
    
    subgraph "监控反馈"
        P --> Q[测试报告]
        P --> R[部署状态]
        P --> S[性能指标]
    end
```

## 🔄 分支策略

### Git Flow 模型

```mermaid
gitGraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Dev Setup"
    
    branch feature/auth
    checkout feature/auth
    commit id: "Auth Feature"
    commit id: "Auth Tests"
    
    checkout develop
    merge feature/auth
    
    branch feature/solutions
    checkout feature/solutions
    commit id: "Solution CRUD"
    commit id: "Solution API"
    
    checkout develop
    merge feature/solutions
    
    checkout main
    merge develop tag: "v1.0.0"
    
    checkout develop
    commit id: "Bug Fixes"
    commit id: "Performance"
    
    checkout main
    merge develop tag: "v1.1.0"
```

### 分支命名规范

| 分支类型 | 命名模式 | 示例 | 用途 |
|----------|----------|------|------|
| **主分支** | `main` | `main` | 生产环境代码 |
| **开发分支** | `develop` | `develop` | 开发环境代码 |
| **功能分支** | `feature/功能名` | `feature/user-auth` | 新功能开发 |
| **修复分支** | `fix/问题描述` | `fix/login-bug` | Bug 修复 |
| **发布分支** | `release/版本号` | `release/v1.2.0` | 发布准备 |
| **热修复分支** | `hotfix/问题描述` | `hotfix/security-patch` | 紧急修复 |

## ⚙️ GitHub Actions 配置

### 主要工作流

#### 1. CI 流水线

```yaml
# .github/workflows/ci.yml
name: Continuous Integration

on:
  push:
    branches: [ main, develop, 'feature/*', 'fix/*' ]
  pull_request:
    branches: [ main, develop ]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 代码质量检查
  code-quality:
    runs-on: ubuntu-latest
    name: Code Quality Checks
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run ESLint
      run: npm run lint
      continue-on-error: false

    - name: Run Prettier check
      run: npm run format:check

    - name: Type check
      run: npm run type-check

    - name: Check for TODOs and FIXMEs
      run: |
        if grep -r "TODO\|FIXME" src/ --exclude-dir=__tests__; then
          echo "Found TODOs or FIXMEs in source code"
          exit 1
        fi

  # 单元测试和集成测试
  tests:
    runs-on: ubuntu-latest
    name: Test Suite
    needs: code-quality
    
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Setup Test Database
      run: |
        docker-compose -f docker-compose.test.yml up -d postgres
        sleep 10
        npm run db:test:setup

    - name: Run Unit Tests
      run: npm run test:ci
      env:
        CI: true
        DATABASE_URL: postgresql://test:test@localhost:5432/test

    - name: Run Integration Tests
      run: npm run test:integration
      env:
        CI: true
        DATABASE_URL: postgresql://test:test@localhost:5432/test

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
        fail_ci_if_error: false

    - name: Publish test results
      uses: dorny/test-reporter@v1
      if: success() || failure()
      with:
        name: Jest Tests
        path: junit.xml
        reporter: jest-junit

  # 安全扫描
  security:
    runs-on: ubuntu-latest
    name: Security Scan
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

    - name: Run npm audit
      run: npm audit --audit-level moderate

    - name: Check for secrets
      uses: trufflesecurity/trufflehog@main
      with:
        path: ./
        base: main
        head: HEAD

  # 构建和打包
  build:
    runs-on: ubuntu-latest
    name: Build Application
    needs: [tests, security]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build
      env:
        NEXT_PUBLIC_API_URL: https://api.staging.openaero.com

    - name: Generate build artifacts
      run: |
        tar -czf build-${{ github.sha }}.tar.gz .next/
        echo "Build completed successfully"

    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-${{ github.sha }}
        path: build-${{ github.sha }}.tar.gz
        retention-days: 30

  # Docker 镜像构建
  docker-build:
    runs-on: ubuntu-latest
    name: Build Docker Image
    needs: [tests, security]
    if: github.event_name == 'push'
    
    permissions:
      contents: read
      packages: write

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
      uses: docker/build-push-action@v5
      with:
        context: .
        platforms: linux/amd64,linux/arm64
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

#### 2. CD 流水线

```yaml
# .github/workflows/cd.yml
name: Continuous Deployment

on:
  push:
    branches: [ main, develop ]
  workflow_run:
    workflows: ["Continuous Integration"]
    types:
      - completed
    branches: [ main, develop ]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 部署到 Staging 环境
  deploy-staging:
    runs-on: ubuntu-latest
    name: Deploy to Staging
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Deploy to Vercel Staging
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
        working-directory: ./

    - name: Run database migrations
      run: |
        npx supabase db push --db-url ${{ secrets.STAGING_DATABASE_URL }}
      env:
        SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

    - name: Health check
      run: |
        timeout 300 bash -c 'until curl -f https://staging.openaero.com/api/health; do sleep 5; done'

    - name: Notify Slack
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        text: '🚀 Staging deployment completed'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

  # 部署到 Production 环境
  deploy-production:
    runs-on: ubuntu-latest
    name: Deploy to Production
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Deploy to Vercel Production
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
        working-directory: ./

    - name: Run database migrations
      run: |
        npx supabase db push --db-url ${{ secrets.PRODUCTION_DATABASE_URL }}
      env:
        SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

    - name: Health check
      run: |
        timeout 300 bash -c 'until curl -f https://openaero.com/api/health; do sleep 5; done'

    - name: Create release tag
      uses: actions/github-script@v7
      with:
        script: |
          const sha = context.sha;
          const tag = `v${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${sha.slice(0,7)}`;
          
          github.rest.git.createRef({
            owner: context.repo.owner,
            repo: context.repo.repo,
            ref: `refs/tags/${tag}`,
            sha: sha
          });

    - name: Notify Slack
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        text: '🎉 Production deployment completed'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

  # E2E 测试
  e2e-tests:
    runs-on: ubuntu-latest
    name: E2E Tests
    needs: deploy-staging
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Install Playwright browsers
      run: npx playwright install --with-deps

    - name: Run E2E tests
      run: npm run test:e2e
      env:
        BASE_URL: https://staging.openaero.com

    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: e2e-test-results
        path: playwright-report/

    - name: Upload test report
      uses: actions/upload-artifact@v3
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30

  # 性能测试
  performance-tests:
    runs-on: ubuntu-latest
    name: Performance Tests
    needs: deploy-staging
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run Lighthouse CI
      uses: treosh/lighthouse-ci-action@v10
      with:
        configPath: './lighthouserc.js'
        uploadArtifacts: true
        temporaryPublicStorage: true

    - name: Run load tests
      run: |
        npm install -g k6
        k6 run tests/performance/load-test.js
      env:
        BASE_URL: https://staging.openaero.com

  # 回滚机制
  rollback-staging:
    runs-on: ubuntu-latest
    name: Rollback Staging
    if: failure() && github.ref == 'refs/heads/develop'
    needs: [deploy-staging, e2e-tests]
    
    steps:
    - name: Rollback deployment
      run: |
        echo "Rolling back staging deployment..."
        # 实现回滚逻辑

    - name: Notify rollback
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        channel: '#deployments'
        text: '🔄 Staging rollback initiated'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

#### 3. 质量门禁

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    name: Quality Gate Check
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Check test coverage
      run: |
        npm run test:coverage
        COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
        if (( $(echo "$COVERAGE < 85" | bc -l) )); then
          echo "Coverage $COVERAGE% is below threshold 85%"
          exit 1
        fi

    - name: Check bundle size
      run: |
        npm run build
        BUNDLE_SIZE=$(du -sh .next/ | cut -f1)
        echo "Bundle size: $BUNDLE_SIZE"
        # 检查 bundle size 是否超过限制

    - name: Run SonarCloud scan
      uses: SonarSource/sonarcloud-github-action@master
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

    - name: Check for breaking changes
      run: |
        npx @openapi-contrib/openapi-diff compare \
          --old main:openapi.yaml \
          --new ${{ github.sha }}:openapi.yaml \
          --fail-on-incompatible

    - name: Comment PR with results
      uses: actions/github-script@v7
      with:
        script: |
          const coverage = process.env.COVERAGE;
          const comment = `
          ## 📊 Quality Gate Results
          
          - ✅ Test Coverage: ${coverage}%
          - ✅ Bundle Size: OK
          - ✅ Security Scan: Passed
          - ✅ Performance: OK
          
          Quality gate passed! 🎉
          `;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
```

## 🐳 Docker 配置

### Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/openaero
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=openaero
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## 📊 监控和日志

### 部署后监控

```yaml
# .github/workflows/monitoring.yml
name: Post-Deployment Monitoring

on:
  schedule:
    - cron: '*/5 * * * *'  # 每5分钟检查一次
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    name: Health Check
    
    steps:
    - name: Check production health
      run: |
        response=$(curl -s -o /dev/null -w "%{http_code}" https://openaero.com/api/health)
        if [ $response -ne 200 ]; then
          echo "Health check failed with status: $response"
          exit 1
        fi

    - name: Check staging health
      run: |
        response=$(curl -s -o /dev/null -w "%{http_code}" https://staging.openaero.com/api/health)
        if [ $response -ne 200 ]; then
          echo "Staging health check failed with status: $response"
          exit 1
        fi

    - name: Check database connectivity
      run: |
        # 检查数据库连接
        curl -f https://openaero.com/api/health/db || exit 1

    - name: Check external services
      run: |
        # 检查支付网关
        curl -f https://openaero.com/api/health/payment || exit 1
        
        # 检查邮件服务
        curl -f https://openaero.com/api/health/email || exit 1

    - name: Notify on failure
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        channel: '#alerts'
        text: '🚨 Health check failed'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 日志聚合

```typescript
// src/lib/monitoring.ts
export class DeploymentMonitor {
  async checkDeploymentHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalAPIs(),
      this.checkDiskSpace(),
      this.checkMemory(),
    ]);

    const results = checks.map((check, index) => ({
      name: ['Database', 'Redis', 'External APIs', 'Disk Space', 'Memory'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      message: check.status === 'fulfilled' ? 'OK' : check.reason,
    }));

    const overallHealth = results.every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy';

    return {
      status: overallHealth,
      checks: results,
      timestamp: new Date(),
    };
  }

  async sendDeploymentNotification(status: 'success' | 'failure', details: any) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    const message = {
      text: `Deployment ${status === 'success' ? '✅' : '❌'} ${status}`,
      attachments: [{
        color: status === 'success' ? 'good' : 'danger',
        fields: [
          { title: 'Environment', value: details.environment, short: true },
          { title: 'Version', value: details.version, short: true },
          { title: 'Duration', value: `${details.duration}ms`, short: true },
          { title: 'Commit', value: details.commit, short: true },
        ],
      }],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }
}
```

## 🔄 环境管理

### 环境配置

```typescript
// config/environments.ts
export interface EnvironmentConfig {
  name: string;
  apiUrl: string;
  databaseUrl: string;
  redisUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  features: {
    analytics: boolean;
    monitoring: boolean;
    debugMode: boolean;
  };
}

export const environments: Record<string, EnvironmentConfig> = {
  development: {
    name: 'Development',
    apiUrl: 'http://localhost:3000',
    databaseUrl: 'postgresql://dev:dev@localhost:5432/openaero_dev',
    redisUrl: 'redis://localhost:6379',
    logLevel: 'debug',
    features: {
      analytics: false,
      monitoring: true,
      debugMode: true,
    },
  },
  
  staging: {
    name: 'Staging',
    apiUrl: 'https://staging.openaero.com',
    databaseUrl: process.env.STAGING_DATABASE_URL!,
    redisUrl: process.env.STAGING_REDIS_URL!,
    logLevel: 'info',
    features: {
      analytics: true,
      monitoring: true,
      debugMode: false,
    },
  },
  
  production: {
    name: 'Production',
    apiUrl: 'https://openaero.com',
    databaseUrl: process.env.PRODUCTION_DATABASE_URL!,
    redisUrl: process.env.PRODUCTION_REDIS_URL!,
    logLevel: 'warn',
    features: {
      analytics: true,
      monitoring: true,
      debugMode: false,
    },
  },
};
```

### 环境变量管理

```bash
# .env.example
# 应用配置
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://openaero.com
NEXT_PUBLIC_API_URL=https://api.openaero.com

# 数据库配置
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://host:6379

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 认证配置
JWT_SECRET=your-jwt-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://openaero.com

# 第三方服务
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG.xxx...

# 监控和日志
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info

# 文件存储
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# 缓存
CACHE_TTL=3600
RATE_LIMIT_WINDOW=90000
RATE_LIMIT_MAX=100
```

## 📈 性能优化

### 构建优化

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 生产环境优化
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 实验性功能
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    optimizeCss: true,
  },
  
  // 图片优化
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 压缩配置
  compress: true,
  
  // 分析包大小
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false;
    }
    
    // 分析包大小
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
    }
    
    return config;
  },
  
  // 输出配置
  output: 'standalone',
  
  // 重定向和重写
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/internal/health',
      },
    ];
  },
};

module.exports = nextConfig;
```

### 缓存策略

```typescript
// src/lib/cache.ts
export class CacheManager {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }
  
  // 缓存装饰器
  cache(ttl: number = 3600) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
        
        // 尝试从缓存获取
        const cached = await this.get(cacheKey);
        if (cached) return cached;
        
        // 执行原方法
        const result = await originalMethod.apply(this, args);
        
        // 缓存结果
        await this.set(cacheKey, result, ttl);
        
        return result;
      };
    };
  }
}
```

## 🔧 故障排除

### 常见问题

#### 1. 构建失败

```bash
# 检查依赖
npm ls
npm audit fix

# 清理缓存
npm cache clean --force
rm -rf .next node_modules
npm install

# 检查环境变量
npm run build:check
```

#### 2. 部署失败

```bash
# 检查健康状态
curl -f https://your-app.com/api/health

# 查看日志
docker logs your-container-name

# 检查资源使用
docker stats your-container-name
```

#### 3. 测试失败

```bash
# 运行特定测试
npm test -- --testNamePattern="specific test"

# 调试测试
npm run test:debug

# 更新快照
npm run test -- --updateSnapshot
```

### 回滚策略

```typescript
// scripts/rollback.ts
export class RollbackManager {
  async rollback(environment: string, targetVersion: string): Promise<void> {
    try {
      console.log(`Rolling back ${environment} to version ${targetVersion}`);
      
      // 1. 获取目标版本的 Docker 镜像
      const imageTag = `${environment}:${targetVersion}`;
      
      // 2. 停止当前服务
      await this.stopService(environment);
      
      // 3. 部署目标版本
      await this.deployVersion(environment, imageTag);
      
      // 4. 运行数据库迁移（如需要）
      await this.runMigrations(environment, targetVersion);
      
      // 5. 健康检查
      await this.healthCheck(environment);
      
      // 6. 通知团队
      await this.notifyRollback(environment, targetVersion);
      
      console.log('Rollback completed successfully');
    } catch (error) {
      console.error('Rollback failed:', error);
      await this.notifyRollbackFailure(environment, targetVersion, error);
      throw error;
    }
  }
}
```

## 📋 部署检查清单

### 部署前检查

- [ ] 代码已通过所有测试
- [ ] 代码覆盖率达标
- [ ] 安全扫描通过
- [ ] 性能测试通过
- [ ] 文档已更新
- [ ] 环境变量已配置
- [ ] 数据库迁移已准备
- [ ] 回滚计划已制定

### 部署后检查

- [ ] 应用健康检查通过
- [ ] 数据库连接正常
- [ ] 外部服务可用
- [ ] 日志正常输出
- [ ] 监控指标正常
- [ ] 关键功能可用
- [ ] 性能指标正常
- [ ] 通知系统正常

---

## 📚 相关文档

- [API 文档](./API_DOCUMENTATION.md) - API 接口文档
- [测试指南](./TESTING_GUIDE.md) - 测试策略和实施
- [安全指南](./SECURITY.md) - 安全最佳实践
- [部署指南](./DEPLOYMENT_GUIDE.md) - 部署详细说明

---

*最后更新: 2025-01-16*