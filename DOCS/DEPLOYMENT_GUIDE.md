# 🚀 OpenAero 部署指南

**版本**: 1.0.0  
**最后更新**: 2025-01-16  
**维护者**: OpenAero DevOps 团队

---

## 📋 目录

1. [部署概述](#部署概述)
2. [环境要求](#环境要求)
3. [部署前准备](#部署前准备)
4. [部署方式](#部署方式)
5. [环境配置](#环境配置)
6. [数据库迁移](#数据库迁移)
7. [监控与日志](#监控与日志)
8. [故障排除](#故障排除)
9. [回滚策略](#回滚策略)
10. [性能优化](#性能优化)

---

## 1. 部署概述

### 1.1 部署架构

```
┌─────────────────────────────────────────┐
│              CDN / WAF                   │
│         (Cloudflare / AWS)               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Load Balancer                    │
│            (Nginx)                       │
└──────┬──────────────────┬───────────────┘
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│  Next.js     │   │  Next.js     │
│  Container 1 │   │  Container 2 │
│  (Docker)    │   │  (Docker)    │
└──────┬───────┘   └───────┬──────┘
       │                   │
       └────────┬──────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│         Supabase Platform                │
│  ┌───────────┐  ┌───────────┐          │
│  │PostgreSQL │  │   Auth    │          │
│  │ + Replicas│  │           │          │
│  └───────────┘  └───────────┘          │
│  ┌───────────┐  ┌───────────┐          │
│  │  Storage  │  │ Realtime  │          │
│  └───────────┘  └───────────┘          │
└─────────────────────────────────────────┘
```

### 1.2 支持的部署平台

| 平台 | 推荐度 | 说明 |
|------|--------|------|
| **Vercel** | ⭐⭐⭐⭐⭐ | 最简单，自动化 CI/CD |
| **Docker + VPS** | ⭐⭐⭐⭐ | 完全控制，灵活配置 |
| **AWS ECS** | ⭐⭐⭐⭐ | 企业级，高可用 |
| **Kubernetes** | ⭐⭐⭐ | 大规模部署 |
| **Railway** | ⭐⭐⭐ | 简单快速 |

---

## 2. 环境要求

### 2.1 系统要求

#### 最低配置（开发/测试）
- **CPU**: 2 核
- **内存**: 4 GB
- **存储**: 20 GB SSD
- **带宽**: 10 Mbps

#### 推荐配置（生产）
- **CPU**: 4+ 核
- **内存**: 8+ GB
- **存储**: 100+ GB SSD
- **带宽**: 100+ Mbps

### 2.2 软件要求

| 软件 | 版本 | 说明 |
|------|------|------|
| **Node.js** | 18.x+ | 运行时环境 |
| **npm** | 9.x+ | 包管理器 |
| **PostgreSQL** | 15+ | 数据库（Supabase 提供）|
| **Docker** | 20.x+ | 容器运行时（可选）|
| **Nginx** | 1.20+ | 反向代理（可选）|
| **Git** | 2.x+ | 版本控制 |

### 2.3 第三方服务

- **Supabase** 账号（数据库、认证、存储）
- **域名** 和 **SSL 证书**
- **CDN** 服务（推荐 Cloudflare）
- **支付宝/微信支付** 商户账号
- **SMTP** 邮件服务

---

## 3. 部署前准备

### 3.1 代码准备

#### 1. 克隆代码仓库

```bash
git clone https://github.com/your-org/openaero.web.git
cd openaero.web
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 构建检查

```bash
npm run build
```

### 3.2 Supabase 配置

#### 1. 创建 Supabase 项目

访问 https://supabase.com/dashboard

1. 点击 "New Project"
2. 填写项目信息
3. 等待项目初始化完成

#### 2. 获取项目凭证

在 Project Settings → API：

- **Project URL**: `https://xxx.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### 3. 配置数据库连接

在 Project Settings → Database：

- **Connection String**: `postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres`

### 3.3 环境变量配置

创建 `.env.production` 文件：

```bash
cp .env.example .env.production
```

编辑 `.env.production`：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_PROJECT_ID=xxx

# 数据库连接
DATABASE_URL="postgresql://postgres:[password]@db.xxx.supabase.co:6543/postgres"
DIRECT_URL="postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres"

# 应用配置
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://openaero.cn

# SMTP 邮件
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=465
SMTP_USER=support@openaero.cn
SMTP_PASS=your-smtp-password
SMTP_SENDER_EMAIL=support@openaero.cn
SMTP_SENDER_NAME=OpenAero

# 支付配置
ALIPAY_APP_ID=your-alipay-app-id
ALIPAY_PRIVATE_KEY=your-private-key
WECHAT_APP_ID=your-wechat-app-id
WECHAT_MCH_ID=your-mch-id
WECHAT_API_KEY=your-api-key

# 监控（可选）
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## 4. 部署方式

### 4.1 方式一：Vercel 部署（推荐）

#### 优势
- ✅ 零配置，自动化 CI/CD
- ✅ 全球 CDN 加速
- ✅ 自动 HTTPS
- ✅ 无服务器架构

#### 步骤

**1. 连接 GitHub**

访问 https://vercel.com/new

1. 导入 Git 仓库
2. 选择 `openaero.web`

**2. 配置环境变量**

在 Vercel Dashboard：
- Settings → Environment Variables
- 添加所有 `.env.production` 中的变量

**3. 部署**

```bash
# 自动部署（推送到 main 分支触发）
git push origin main

# 手动部署
vercel --prod
```

**4. 配置域名**

1. Settings → Domains
2. 添加自定义域名
3. 配置 DNS 记录

---

### 4.2 方式二：Docker 容器部署

#### 优势
- ✅ 完全控制
- ✅ 可在任何平台运行
- ✅ 环境一致性

#### 步骤

**1. 构建 Docker 镜像**

```bash
# 开发环境镜像
docker build -t openaero-web:dev -f Dockerfile .

# 生产环境镜像
docker build -t openaero-web:latest -f Dockerfile.production .
```

**2. 运行容器**

```bash
# 运行单个容器
docker run -d \
  --name openaero-web \
  -p 3000:3000 \
  --env-file .env.production \
  openaero-web:latest
```

**3. 使用 Docker Compose**

创建 `docker-compose.production.yml`：

```yaml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.production
    image: openaero-web:latest
    container_name: openaero-web
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - openaero-network

  nginx:
    image: nginx:alpine
    container_name: openaero-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
    networks:
      - openaero-network

networks:
  openaero-network:
    driver: bridge
```

启动服务：

```bash
docker-compose -f docker-compose.production.yml up -d
```

**4. Nginx 配置**

创建 `nginx/nginx.conf`：

```nginx
upstream nextjs_upstream {
  server web:3000;
}

server {
  listen 80;
  server_name openaero.cn www.openaero.cn;
  
  # 重定向到 HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name openaero.cn www.openaero.cn;

  # SSL 证书
  ssl_certificate /etc/nginx/ssl/openaero.cn.crt;
  ssl_certificate_key /etc/nginx/ssl/openaero.cn.key;
  
  # SSL 配置
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  # 安全头
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;

  # 日志
  access_log /var/log/nginx/openaero_access.log;
  error_log /var/log/nginx/openaero_error.log;

  # 客户端上传大小限制
  client_max_body_size 100M;

  # 静态资源缓存
  location /_next/static {
    proxy_pass http://nextjs_upstream;
    proxy_cache_valid 200 365d;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  location /static {
    proxy_pass http://nextjs_upstream;
    proxy_cache_valid 200 365d;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # API 路由
  location /api {
    proxy_pass http://nextjs_upstream;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # 超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  # 所有其他请求
  location / {
    proxy_pass http://nextjs_upstream;
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

---

### 4.3 方式三：VPS 直接部署

#### 步骤

**1. 服务器准备**

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx
sudo apt install nginx -y
```

**2. 部署代码**

```bash
# 克隆代码
cd /var/www
sudo git clone https://github.com/your-org/openaero.web.git
cd openaero.web

# 安装依赖
sudo npm install

# 配置环境变量
sudo cp .env.example .env.production
sudo nano .env.production

# 构建项目
sudo npm run build
```

**3. 使用 PM2 启动**

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'openaero-web',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/openaero.web',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
```

启动应用：

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**4. 配置 Nginx**

```bash
sudo nano /etc/nginx/sites-available/openaero
```

使用与 Docker 方式相同的 Nginx 配置。

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/openaero /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

## 5. 环境配置

### 5.1 环境变量清单

| 变量 | 必填 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase Service Role Key |
| `DATABASE_URL` | ✅ | 数据库连接字符串 |
| `DIRECT_URL` | ✅ | 直连数据库 URL |
| `NEXT_PUBLIC_APP_URL` | ✅ | 应用访问 URL |
| `SMTP_HOST` | ✅ | SMTP 服务器 |
| `SMTP_USER` | ✅ | SMTP 用户名 |
| `SMTP_PASS` | ✅ | SMTP 密码 |
| `ALIPAY_APP_ID` | ⭕ | 支付宝 App ID |
| `WECHAT_APP_ID` | ⭕ | 微信 App ID |
| `SENTRY_DSN` | ⭕ | Sentry 监控 |

### 5.2 SSL/TLS 配置

#### 使用 Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d openaero.cn -d www.openaero.cn

# 自动续期
sudo certbot renew --dry-run
```

---

## 6. 数据库迁移

### 6.1 初始化数据库

```bash
# 生成 Prisma Client
npm run db:generate

# 推送数据库 schema
npm run db:push

# 运行迁移
npm run db:migrate
```

### 6.2 应用优化脚本

```bash
# 1. 应用 RLS 策略
psql $DATABASE_URL < scripts/enhanced-rls-policies.sql

# 2. 创建索引
psql $DATABASE_URL < scripts/add-database-indexes.sql

# 3. 创建优化函数
psql $DATABASE_URL < scripts/optimized-queries.sql

# 或使用一键脚本
./scripts/apply-optimizations.sh
```

### 6.3 数据备份

```bash
# 创建备份
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复备份
psql $DATABASE_URL < backup_20250116_100000.sql
```

---

## 7. 监控与日志

### 7.1 应用监控

#### PM2 监控

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs openaero-web

# 监控仪表板
pm2 monit
```

#### Docker 监控

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs -f openaero-web

# 查看资源使用
docker stats openaero-web
```

### 7.2 日志管理

#### 日志位置

- **PM2**: `./logs/err.log`, `./logs/out.log`
- **Docker**: `docker logs`
- **Nginx**: `/var/log/nginx/`

#### 日志轮转

创建 `/etc/logrotate.d/openaero`：

```
/var/www/openaero.web/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 7.3 性能监控

#### Sentry 集成

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
```

---

## 8. 故障排除

### 8.1 常见问题

#### 问题 1: 应用无法启动

**症状**: 容器启动后立即退出

**排查**:
```bash
# 查看详细日志
docker logs openaero-web

# 检查环境变量
docker exec openaero-web env | grep SUPABASE
```

**解决**:
- 检查环境变量是否完整
- 确认数据库连接字符串正确
- 验证端口未被占用

---

#### 问题 2: 数据库连接失败

**症状**: `Error: P1001: Can't reach database server`

**排查**:
```bash
# 测试数据库连接
psql $DATABASE_URL -c "SELECT 1"
```

**解决**:
- 检查 DATABASE_URL 格式
- 确认网络连接
- 验证 Supabase 项目状态
- 检查防火墙规则

---

#### 问题 3: 构建失败

**症状**: `npm run build` 报错

**解决**:
```bash
# 清理缓存
rm -rf .next node_modules
npm install
npm run build
```

---

### 8.2 健康检查

创建健康检查端点：

```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`;
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 503 });
  }
}
```

---

## 9. 回滚策略

### 9.1 快速回滚

#### Vercel 回滚

```bash
# 在 Vercel Dashboard
Deployments → 选择之前的部署 → Promote to Production
```

#### Docker 回滚

```bash
# 保存镜像版本标签
docker tag openaero-web:latest openaero-web:$(date +%Y%m%d)

# 回滚到之前版本
docker stop openaero-web
docker rm openaero-web
docker run -d --name openaero-web openaero-web:20250115
```

#### PM2 回滚

```bash
# Git 回滚
cd /var/www/openaero.web
git log --oneline
git reset --hard <commit-hash>
npm install
npm run build
pm2 restart openaero-web
```

### 9.2 数据库回滚

```bash
# 恢复最近的备份
psql $DATABASE_URL < backup_latest.sql

# Prisma 迁移回滚
npx prisma migrate resolve --rolled-back <migration-name>
```

---

## 10. 性能优化

### 10.1 CDN 配置

#### Cloudflare 设置

1. **添加站点** → 输入域名
2. **DNS 设置** → 启用代理（橙色云）
3. **缓存规则**:
   - 静态资源：`/_next/static/*` → 缓存 1 年
   - API：`/api/*` → 不缓存
4. **压缩** → 启用 Brotli
5. **Minify** → 启用 JS/CSS/HTML

### 10.2 数据库优化

```sql
-- 定期刷新物化视图
SELECT refresh_materialized_views();

-- 分析表统计
ANALYZE;

-- 清理过期数据
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '30 days' AND read = true;
```

### 10.3 缓存策略

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
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

---

## 📚 相关文档

- [系统架构](./ARCHITECTURE.md)
- [数据库架构](./DATABASE_SCHEMA.md)
- [API 文档](./API_DOCUMENTATION.md)
- [监控指南](../MONITORING.md)
- [生产清单](../PRODUCTION-CHECKLIST.md)

---

## 🔄 检查清单

部署前检查：

- [ ] 所有环境变量已配置
- [ ] 数据库迁移已执行
- [ ] SSL 证书已配置
- [ ] 域名 DNS 已解析
- [ ] 备份策略已设置
- [ ] 监控已启用
- [ ] 健康检查已配置
- [ ] 日志系统正常
- [ ] 负载测试已完成
- [ ] 回滚方案已准备

---

## 📞 支持

- **部署问题**: devops@openaero.cn
- **技术支持**: support@openaero.cn
- **紧急联系**: +86-xxx-xxxx-xxxx

---

## 🔄 更新日志

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2025-01-16 | 初始版本，完整的部署指南 |

---

**维护者**: OpenAero DevOps 团队  
**最后更新**: 2025-01-16
