# Deployment Guide

This guide covers deploying the OpenAero Web application to various environments including development, staging, and production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Options](#deployment-options)
  - [Vercel (Recommended)](#vercel-recommended)
  - [Docker](#docker)
  - [AWS](#aws)
  - [Google Cloud Platform](#google-cloud-platform)
  - [Self-hosted](#self-hosted)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

- Node.js 18+ installed
- npm or yarn package manager
- Git for version control
- Database (PostgreSQL recommended)
- Redis for caching and sessions
- Domain name and SSL certificate (for production)

## Environment Setup

### Development Environment

1. Clone the repository:
```bash
git clone https://github.com/openaero/web.git
cd openaero-web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` file with appropriate values.

5. Run database migrations:
```bash
npm run db:migrate
```

6. Start the development server:
```bash
npm run dev
```

### Staging Environment

Staging should mirror production as closely as possible:

1. Use production-like database and Redis instances
2. Enable all production features
3. Use HTTPS
4. Test with production data volumes

### Production Environment

Production deployment requires:

- High availability setup
- Load balancing
- Database clustering
- Redis clustering
- CDN for static assets
- Monitoring and alerting
- Backup strategies

## Deployment Options

### Vercel (Recommended)

Vercel provides the easiest deployment for Next.js applications.

#### Automatic Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

#### Manual Deployment

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

#### Vercel Configuration

Create `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### Docker

Deploy using Docker containers for consistent environments.

#### Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set permissions
USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV NODE_ENV production

CMD ["node", "server.js"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=openaero
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
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
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Build and Deploy

```bash
# Build the image
docker build -t openaero-web .

# Run with Docker Compose
docker-compose up -d

# Scale the application
docker-compose up -d --scale app=3
```

### AWS

Deploy to AWS using various services.

#### AWS App Runner

1. Create `apprunner.yaml`:

```yaml
version: 1.0
runtime: nodejs18
build:
  commands:
    build:
      - npm ci
      - npm run build
run:
  runtime-version: 18
  command: npm start
  network:
    port: 3000
    env: PORT
  env:
    - name: NODE_ENV
      value: production
```

2. Deploy using AWS CLI:

```bash
aws apprunner create-service \
  --service-name openaero-web \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "your-ecr-repo:latest",
      "ImageConfiguration": {
        "Port": "3000"
      }
    },
    "AutoDeploymentsEnabled": true
  }'
```

#### AWS ECS with Fargate

1. Create task definition:

```json
{
  "family": "openaero-web",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "openaero-web",
      "image": "your-ecr-repo:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/openaero-web",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

2. Create ECS service with load balancer and auto-scaling.

#### AWS Lambda (Serverless)

Use Serverless Framework or AWS SAM:

```yaml
# serverless.yml
service: openaero-web

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1

functions:
  app:
    handler: lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
      - http:
          path: /
          method: ANY

plugins:
  - serverless-nextjs-plugin
```

### Google Cloud Platform

#### Cloud Run

1. Create `cloudbuild.yaml`:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/openaero-web', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/openaero-web']
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'openaero-web'
      - '--image'
      - 'gcr.io/$PROJECT_ID/openaero-web'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
```

2. Deploy:

```bash
gcloud builds submit --config cloudbuild.yaml
```

#### App Engine

Create `app.yaml`:

```yaml
runtime: nodejs18

env_variables:
  NODE_ENV: production
  DATABASE_URL: your-database-url
  REDIS_URL: your-redis-url

automatic_scaling:
  min_instances: 1
  max_instances: 10
  target_cpu_utilization: 0.6
```

Deploy:

```bash
gcloud app deploy
```

### Self-hosted

For self-hosted deployments on your own servers.

#### Using PM2

1. Install PM2:
```bash
npm install -g pm2
```

2. Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'openaero-web',
      script: 'npm',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
}
```

3. Deploy:

```bash
# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

#### Nginx Configuration

```nginx
upstream openaero_web {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name openaero.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name openaero.example.com;

    ssl_certificate /etc/ssl/certs/openaero.crt;
    ssl_certificate_key /etc/ssl/private/openaero.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://openaero_web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://openaero_web;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
}
```

## Database Setup

### PostgreSQL

#### Production Setup

1. Create database and user:

```sql
CREATE DATABASE openaero;
CREATE USER openaero_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE openaero TO openaero_user;
```

2. Configure connection pooling with PgBouncer:

```ini
[databases]
openaero = host=localhost port=5432 dbname=openaero

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

#### Migrations

Run migrations in production:

```bash
# Run pending migrations
npm run db:migrate

# Rollback if needed
npm run db:rollback

# Check migration status
npm run db:status
```

### Redis

#### Production Setup

1. Configure Redis for production:

```conf
# redis.conf
bind 127.0.0.1
port 6379
requirepass your_secure_password
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

2. Start Redis:

```bash
redis-server /etc/redis/redis.conf
```

#### Redis Cluster

For high availability:

```bash
# Create cluster
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

## Environment Variables

### Required Variables

```bash
# Application
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://openaero.example.com
NEXT_PUBLIC_API_URL=https://openaero.example.com/api

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/openaero
REDIS_URL=redis://localhost:6379

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://openaero.example.com

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@openaero.example.com
SMTP_PASSWORD=your-smtp-password

# Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=openaero-uploads
AWS_REGION=us-east-1

# Monitoring
SENTRY_DSN=your-sentry-dsn
ANALYTICS_ID=your-analytics-id
```

### Security Best Practices

1. Use environment-specific secrets
2. Rotate secrets regularly
3. Use secret management services (AWS Secrets Manager, etc.)
4. Never commit secrets to version control
5. Use strong, unique passwords

## SSL/TLS Configuration

### Let's Encrypt (Free SSL)

1. Install Certbot:

```bash
sudo apt-get install certbot python3-certbot-nginx
```

2. Obtain certificate:

```bash
sudo certbot --nginx -d openaero.example.com
```

3. Auto-renewal:

```bash
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Custom SSL Certificate

1. Generate private key:

```bash
openssl genrsa -out openaero.key 2048
```

2. Create certificate signing request:

```bash
openssl req -new -key openaero.key -out openaero.csr
```

3. Install certificate in web server configuration.

## Monitoring and Logging

### Application Monitoring

#### Sentry Integration

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})
```

#### Prometheus Metrics

The application exposes metrics at `/api/metrics`:

- HTTP request metrics
- Database connection metrics
- Cache hit/miss rates
- Custom business metrics

#### Health Checks

Monitor application health at `/api/health`:

```bash
# Check application health
curl https://openaero.example.com/api/health
```

### Infrastructure Monitoring

#### Docker Monitoring

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  grafana_data:
```

#### Log Aggregation

Use ELK Stack or similar:

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
```

## Backup and Recovery

### Database Backup

#### Automated Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="openaero"

# Create backup
pg_dump $DB_NAME > $BACKUP_DIR/openaero_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/openaero_$DATE.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/openaero_$DATE.sql.gz s3://openaero-backups/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "openaero_*.sql.gz" -mtime +30 -delete
```

#### Backup Schedule

```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

### File Storage Backup

```bash
#!/bin/bash
# backup-files.sh

# Sync uploads to S3
aws s3 sync /app/uploads s3://openaero-backups/uploads/

# Backup configuration files
tar -czf /backups/config_$(date +%Y%m%d).tar.gz /app/config
```

### Recovery Procedures

#### Database Recovery

```bash
# Restore from backup
gunzip openaero_20231201_020000.sql.gz
psql openaero < openaero_20231201_020000.sql
```

#### Application Recovery

1. Deploy previous version
2. Restore database from backup
3. Restore file uploads
4. Update DNS if needed
5. Verify functionality

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules
npm install

# Check Node.js version
node --version
```

#### Database Connection Issues

```bash
# Test database connection
psql -h localhost -U openaero_user -d openaero

# Check connection pool
SELECT * FROM pg_stat_activity;
```

#### Memory Issues

```bash
# Check memory usage
free -h

# Check Node.js memory usage
node --max-old-space-size=4096 server.js
```

#### SSL Certificate Issues

```bash
# Check certificate expiration
openssl x509 -in certificate.crt -text -noout

# Test SSL configuration
openssl s_client -connect openaero.example.com:443
```

### Performance Issues

#### Database Performance

```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename = 'your_table';
```

#### Application Performance

```bash
# Profile Node.js application
node --prof server.js

# Generate flame graph
node --prof-process isolate-*.log > processed.txt
```

### Debugging

#### Enable Debug Logging

```bash
# Set debug environment
DEBUG=* npm start

# Next.js debug
NODE_OPTIONS='--inspect' npm run dev
```

#### Log Analysis

```bash
# Analyze access logs
tail -f /var/log/nginx/access.log | grep "POST\|PUT\|DELETE"

# Check application logs
pm2 logs openaero-web

# Search for errors
grep -i error /var/log/openaero/app.log
```

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Security headers configured
- [ ] Database credentials secured
- [ ] API rate limiting enabled
- [ ] Input validation implemented
- [ ] CSRF protection enabled
- [ ] XSS protection enabled
- [ ] SQL injection prevention
- [ ] File upload restrictions
- [ ] Regular security updates
- [ ] Vulnerability scanning
- [ ] Access logging enabled
- [ ] Firewall configured
- [ ] Backup encryption
- [ ] Secret rotation schedule

## Performance Checklist

- [ ] CDN configured for static assets
- [ ] Database query optimization
- [ ] Redis caching implemented
- [ ] Image optimization
- [ ] Code splitting enabled
- [ ] Gzip compression enabled
- [ ] HTTP/2 enabled
- [ ] Database connection pooling
- [ ] Load balancing configured
- [ ] Auto-scaling enabled
- [ ] Performance monitoring
- [ ] Error tracking
- [ ] Uptime monitoring
- [ ] Log aggregation
- [ ] Backup automation

## Support

For deployment support:

- Documentation: [https://docs.openaero.example.com](https://docs.openaero.example.com)
- Support Email: devops@openaero.example.com
- Slack Channel: #deployment
- On-call: +1-555-0123