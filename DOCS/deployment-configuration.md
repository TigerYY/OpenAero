# 部署配置指南

## 概述

本文档详细描述了OpenAero认证系统的部署配置流程，包括环境变量配置、数据库设置、邮件服务集成和生产环境优化。

## 环境配置

### 必需的环境变量

创建 `.env.production` 文件：

```env
# 数据库配置
DATABASE_URL="postgresql://username:password@host:5432/openaero_production"

# JWT配置
JWT_SECRET="your-32-character-jwt-secret-key-here"
JWT_EXPIRES_IN="24h"

# 邮件服务配置
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-specific-password"
SMTP_FROM="OpenAero <noreply@openaero.com>"

# Redis配置（会话存储）
REDIS_URL="redis://:password@host:6379"

# 应用配置
NODE_ENV="production"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-nextauth-secret"

# 安全配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CSRF_PROTECTION=true

# 监控配置
LOG_LEVEL="info"
SENTRY_DSN="your-sentry-dsn"
```

### 环境变量安全

**生成安全密钥：**
```bash
# 生成JWT密钥
openssl rand -base64 32

# 生成NextAuth密钥
openssl rand -base64 32
```

**密钥管理最佳实践：**
- 使用密钥管理服务（如AWS KMS、HashiCorp Vault）
- 定期轮换密钥
- 不同环境使用不同密钥

## 数据库配置

### PostgreSQL配置

**生产环境数据库配置：**
```sql
-- 创建生产数据库
CREATE DATABASE openaero_production;

-- 创建专用用户
CREATE USER openaero_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE openaero_production TO openaero_user;

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

**数据库连接池配置：**
```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["connectionLimit"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 10
}
```

### 数据库迁移

**生产环境迁移：**
```bash
# 生成迁移文件
npx prisma migrate dev --name init

# 应用迁移到生产环境
npx prisma migrate deploy

# 生成Prisma客户端
npx prisma generate
```

**数据库备份策略：**
```bash
# 每日备份脚本
#!/bin/bash
pg_dump openaero_production > backup_$(date +%Y%m%d).sql
# 上传到云存储
gsutil cp backup_$(date +%Y%m%d).sql gs://openaero-backups/
```

## 邮件服务配置

### SMTP服务选择

**推荐服务商：**
- SendGrid（推荐）
- Mailgun
- Amazon SES
- Gmail（开发环境）

**SendGrid配置示例：**
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
```

### 邮件模板配置

**验证邮件模板：**
```typescript
// 生产环境邮件模板
const verificationEmail = {
  subject: '请验证您的OpenAero账户',
  html: `
    <h2>欢迎使用OpenAero</h2>
    <p>请点击以下链接验证您的邮箱：</p>
    <a href="${verificationUrl}">验证邮箱</a>
    <p>链接有效期：1小时</p>
  `
};
```

## 服务器配置

### Docker部署配置

**Dockerfile.production：**
```dockerfile
FROM node:18-alpine AS base

# 安装依赖
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制package文件
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# 构建应用
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 生产镜像
FROM base AS runner
WORKDIR /app

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 设置权限
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "start"]
```

**docker-compose.production.yml：**
```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: openaero_production
      POSTGRES_USER: openaero_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 反向代理配置

**Nginx配置：**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL配置
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # 代理到应用
    location / {
        proxy_pass http://localhost:3000;
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

## 监控和日志

### 应用监控配置

**Sentry错误监控：**
```typescript
// instrumentation.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

**日志配置：**
```typescript
// lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### 性能监控

**健康检查端点：**
```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 503 });
  }
}
```

## 安全配置

### HTTPS配置

**使用Let's Encrypt：**
```bash
# 安装certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yourdomain.com

# 设置自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

### 安全头配置

**Next.js安全头配置：**
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}
```

## 部署脚本

### 自动化部署脚本

**deploy-production.sh：**
```bash
#!/bin/bash
set -e

echo "开始部署OpenAero认证系统..."

# 检查环境变量
if [ ! -f ".env.production" ]; then
    echo "错误: 缺少.env.production文件"
    exit 1
fi

# 停止现有服务
echo "停止现有服务..."
docker-compose -f docker-compose.production.yml down

# 拉取最新代码
echo "拉取最新代码..."
git pull origin main

# 构建镜像
echo "构建Docker镜像..."
docker-compose -f docker-compose.production.yml build

# 启动服务
echo "启动服务..."
docker-compose -f docker-compose.production.yml up -d

# 等待服务启动
echo "等待服务启动..."
sleep 30

# 运行数据库迁移
echo "运行数据库迁移..."
docker-compose -f docker-compose.production.yml exec app npx prisma migrate deploy

# 健康检查
echo "进行健康检查..."
curl -f http://localhost:3000/api/health || exit 1

echo "部署完成！"
```

### 回滚脚本

**rollback-production.sh：**
```bash
#!/bin/bash
set -e

echo "开始回滚..."

# 回滚到上一个版本
git checkout HEAD~

# 重新部署
./deploy-production.sh

echo "回滚完成"
```

## 故障排除

### 常见问题

**数据库连接失败：**
```bash
# 检查数据库状态
docker-compose logs postgres

# 检查连接
psql -h localhost -U openaero_user -d openaero_production
```

**应用启动失败：**
```bash
# 检查应用日志
docker-compose logs app

# 检查环境变量
docker-compose exec app printenv | grep DATABASE_URL
```

**邮件发送失败：**
```bash
# 测试SMTP连接
telnet smtp.gmail.com 587

# 检查邮件服务日志
docker-compose logs app | grep -i email
```

### 性能优化

**数据库优化：**
```sql
-- 创建索引
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_sessions_user_id ON sessions(user_id);
CREATE INDEX CONCURRENTLY idx_audit_logs_timestamp ON audit_logs(timestamp);
```

**应用优化：**
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@/components']
  }
}
```

---

**文档版本**: 1.0.0  
**最后更新**: 2025-11-03  
**维护团队**: OpenAero运维团队