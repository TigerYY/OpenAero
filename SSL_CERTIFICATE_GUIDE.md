# OpenAero SSL证书配置指南

**版本**: 1.0  
**最后更新**: 2025-01-26  
**状态**: 生产环境已验证  

本文档详细记录了OpenAero项目SSL证书的申请、配置、自动续期和管理流程。

## 🎯 SSL证书概览

### 证书信息
- **域名**: openaero.cn, www.openaero.cn
- **证书颁发机构**: Let's Encrypt
- **证书类型**: Domain Validated (DV)
- **加密算法**: RSA 2048位
- **有效期**: 90天（自动续期）
- **安全等级**: A+ (SSL Labs评级)

### 技术架构
```
┌─────────────────────────────────────────┐
│           SSL证书架构                    │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Let's Encrypt│  │    Certbot      │   │
│  │  (CA机构)    │  │  (自动化工具)   │   │
│  └─────────────┘  └─────────────────┘   │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │   Nginx     │  │   Docker        │   │
│  │ (SSL终端)    │  │  (容器挂载)     │   │
│  └─────────────┘  └─────────────────┘   │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │   Cron      │  │   监控告警      │   │
│  │ (自动续期)   │  │ (到期提醒)      │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┐
```

## 🚀 SSL证书申请流程

### 阶段1: 环境准备

#### 1.1 安装Certbot
```bash
# Ubuntu/Debian系统
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# CentOS/RHEL系统
sudo yum install epel-release
sudo yum install certbot python3-certbot-nginx

# 验证安装
certbot --version
```

#### 1.2 域名DNS配置
```bash
# 确保域名解析正确指向服务器
dig openaero.cn
dig www.openaero.cn

# 预期结果应该指向服务器IP地址
# openaero.cn.     300    IN    A    YOUR_SERVER_IP
# www.openaero.cn. 300    IN    A    YOUR_SERVER_IP
```

### 阶段2: 证书申请

#### 2.1 停止现有Web服务
```bash
# 停止Nginx服务（如果正在运行）
sudo systemctl stop nginx

# 或停止Docker容器
docker-compose down
```

#### 2.2 申请SSL证书
```bash
# 使用standalone模式申请证书
sudo certbot certonly --standalone \
  -d openaero.cn \
  -d www.openaero.cn \
  --email admin@openaero.cn \
  --agree-tos \
  --non-interactive

# 申请成功后证书文件位置：
# 证书文件: /etc/letsencrypt/live/openaero.cn/fullchain.pem
# 私钥文件: /etc/letsencrypt/live/openaero.cn/privkey.pem
```

#### 2.3 验证证书申请
```bash
# 检查证书文件
sudo ls -la /etc/letsencrypt/live/openaero.cn/

# 查看证书详情
sudo openssl x509 -in /etc/letsencrypt/live/openaero.cn/fullchain.pem -text -noout

# 验证证书有效期
sudo openssl x509 -in /etc/letsencrypt/live/openaero.cn/fullchain.pem -noout -dates
```

## 🔧 Nginx SSL配置

### 3.1 Nginx配置文件
```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name openaero.cn www.openaero.cn;
    
    # HTTP重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name openaero.cn www.openaero.cn;

    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/openaero.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/openaero.cn/privkey.pem;
    
    # SSL协议配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    
    # SSL会话配置
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # 安全头配置
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self'; object-src 'none'; child-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self';" always;

    # 反向代理配置
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
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
    }
    
    # 安全配置
    location ~ /\. {
        deny all;
    }
    
    location ~ ^/(\.user.ini|\.htaccess|\.git|\.svn|\.project|LICENSE|README.md)$ {
        deny all;
    }
}
```

### 3.2 Docker Compose SSL挂载
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      # SSL证书挂载
      - /etc/letsencrypt/live/openaero.cn:/etc/letsencrypt/live/openaero.cn:ro
      - /etc/letsencrypt/archive/openaero.cn:/etc/letsencrypt/archive/openaero.cn:ro
      # 日志挂载
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - openaero-network

  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    container_name: openaero-app
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - openaero-network

networks:
  openaero-network:
    driver: bridge
```

## 🔄 自动续期配置

### 4.1 Cron任务设置
```bash
# 编辑crontab
sudo crontab -e

# 添加自动续期任务（每天12点检查）
0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook "docker-compose -f /path/to/openaero/docker-compose.prod.yml restart nginx"

# 或者使用systemd timer（推荐）
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 4.2 续期脚本
```bash
#!/bin/bash
# scripts/renew-ssl.sh

echo "🔄 开始SSL证书续期检查..."

# 续期证书
/usr/bin/certbot renew --quiet

# 检查续期结果
if [ $? -eq 0 ]; then
    echo "✅ SSL证书续期检查完成"
    
    # 重启Nginx容器以加载新证书
    cd /path/to/openaero
    docker-compose -f docker-compose.prod.yml restart nginx
    
    echo "✅ Nginx服务已重启"
    
    # 发送成功通知
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"✅ OpenAero SSL证书续期成功"}' \
        $SLACK_WEBHOOK_URL
else
    echo "❌ SSL证书续期失败"
    
    # 发送失败通知
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"❌ OpenAero SSL证书续期失败，请检查！"}' \
        $SLACK_WEBHOOK_URL
fi
```

### 4.3 续期测试
```bash
# 测试续期流程（不会实际续期）
sudo certbot renew --dry-run

# 强制续期（测试用）
sudo certbot renew --force-renewal

# 查看续期日志
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

## 📊 SSL监控与告警

### 5.1 证书监控脚本
```bash
#!/bin/bash
# scripts/ssl-monitor.sh

DOMAIN="openaero.cn"
CERT_FILE="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
DAYS_THRESHOLD=7

# 获取证书到期时间
EXPIRY_DATE=$(openssl x509 -in $CERT_FILE -noout -enddate | cut -d= -f2)
EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_TIMESTAMP=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_TIMESTAMP - $CURRENT_TIMESTAMP) / 86400 ))

echo "SSL证书监控报告："
echo "域名: $DOMAIN"
echo "到期时间: $EXPIRY_DATE"
echo "剩余天数: $DAYS_UNTIL_EXPIRY 天"

# 检查是否需要告警
if [ $DAYS_UNTIL_EXPIRY -le $DAYS_THRESHOLD ]; then
    echo "⚠️ 警告：SSL证书将在 $DAYS_UNTIL_EXPIRY 天内到期！"
    
    # 发送告警通知
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"⚠️ OpenAero SSL证书将在 $DAYS_UNTIL_EXPIRY 天内到期，请注意！\"}" \
        $SLACK_WEBHOOK_URL
else
    echo "✅ SSL证书状态正常"
fi
```

### 5.2 Prometheus监控指标
```yaml
# monitoring/prometheus/rules/ssl-alerts.yml
groups:
  - name: ssl.rules
    rules:
    - alert: SSLCertificateExpiry
      expr: probe_ssl_earliest_cert_expiry - time() < 86400 * 7
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "SSL证书即将到期"
        description: "域名 {{ $labels.instance }} 的SSL证书将在7天内到期"
        
    - alert: SSLCertificateExpired
      expr: probe_ssl_earliest_cert_expiry - time() < 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "SSL证书已过期"
        description: "域名 {{ $labels.instance }} 的SSL证书已过期"
```

### 5.3 Grafana仪表盘
```json
{
  "dashboard": {
    "title": "SSL证书监控",
    "panels": [
      {
        "title": "证书到期时间",
        "type": "singlestat",
        "targets": [
          {
            "expr": "(probe_ssl_earliest_cert_expiry - time()) / 86400",
            "legendFormat": "天数"
          }
        ],
        "thresholds": "7,1",
        "colorBackground": true
      },
      {
        "title": "SSL握手时间",
        "type": "graph",
        "targets": [
          {
            "expr": "probe_ssl_duration_seconds",
            "legendFormat": "SSL握手时间"
          }
        ]
      }
    ]
  }
}
```

## 🔍 SSL安全验证

### 6.1 SSL Labs测试
```bash
# 使用SSL Labs API进行安全评级
curl -s "https://api.ssllabs.com/api/v3/analyze?host=openaero.cn" | jq '.endpoints[0].grade'

# 预期结果: "A+" 或 "A"
```

### 6.2 本地SSL测试
```bash
# 测试SSL连接
openssl s_client -connect openaero.cn:443 -servername openaero.cn

# 测试证书链
openssl s_client -connect openaero.cn:443 -showcerts

# 测试SSL协议支持
nmap --script ssl-enum-ciphers -p 443 openaero.cn
```

### 6.3 安全头检查
```bash
# 检查安全头配置
curl -I https://openaero.cn

# 预期包含以下安全头：
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

## 🚨 故障排除

### 常见问题解决

#### 1. 证书申请失败
```bash
# 检查域名解析
dig openaero.cn

# 检查80端口是否被占用
sudo netstat -tlnp | grep :80

# 检查防火墙设置
sudo ufw status
```

#### 2. 证书续期失败
```bash
# 检查certbot日志
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# 手动测试续期
sudo certbot renew --dry-run

# 检查cron任务
sudo crontab -l
```

#### 3. Nginx SSL配置错误
```bash
# 测试Nginx配置
sudo nginx -t

# 检查SSL证书文件权限
sudo ls -la /etc/letsencrypt/live/openaero.cn/

# 重启Nginx服务
sudo systemctl restart nginx
```

### 应急处理流程

#### SSL证书过期应急处理
```bash
# 1. 立即申请新证书
sudo certbot certonly --standalone -d openaero.cn -d www.openaero.cn

# 2. 更新Nginx配置
sudo nginx -t && sudo systemctl reload nginx

# 3. 验证证书生效
curl -I https://openaero.cn

# 4. 通知相关人员
echo "SSL证书已紧急更新" | mail -s "OpenAero SSL紧急更新" admin@openaero.cn
```

## 📋 SSL证书管理清单

### 日常检查
- [ ] 证书到期时间检查
- [ ] SSL安全等级验证
- [ ] 自动续期任务状态
- [ ] 监控告警功能测试

### 月度检查
- [ ] SSL Labs安全评级
- [ ] 证书链完整性验证
- [ ] 安全头配置检查
- [ ] 续期脚本功能测试

### 季度检查
- [ ] SSL配置安全审计
- [ ] 证书备份策略验证
- [ ] 应急处理流程演练
- [ ] 文档更新维护

---

## 📊 SSL配置成果

### 安全等级
- **SSL Labs评级**: A+
- **支持协议**: TLSv1.2, TLSv1.3
- **加密强度**: 256位AES加密
- **HSTS**: 已启用（2年有效期）

### 访问地址
- **主域名**: https://openaero.cn
- **备用域名**: https://www.openaero.cn
- **SSL测试**: https://www.ssllabs.com/ssltest/analyze.html?d=openaero.cn

### 监控状态
- **自动续期**: ✅ 已配置
- **到期监控**: ✅ 已启用
- **告警通知**: ✅ 已配置
- **备份策略**: ✅ 已实施

**SSL证书配置完成时间**: 2025-01-26  
**维护团队**: OpenAero Security Team  
**下次审计**: 2025-04-26