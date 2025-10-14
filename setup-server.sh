#!/bin/bash

# OpenAero Ubuntu服务器完整配置脚本
# 适用于全新的Ubuntu服务器环境

SERVER="root@openaero.cn"
WEB_DIR="/var/www/html"
DOMAIN="openaero.cn"

echo "开始配置OpenAero服务器环境..."

# 1. 更新系统包
echo "更新系统包..."
ssh $SERVER "apt update && apt upgrade -y"

# 2. 安装必要的软件包
echo "安装Web服务器和必要软件..."
ssh $SERVER "apt install -y nginx certbot python3-certbot-nginx ufw fail2ban htop curl wget unzip"

# 3. 配置防火墙
echo "配置防火墙..."
ssh $SERVER "ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable"

# 4. 创建网站目录
echo "创建网站目录..."
ssh $SERVER "mkdir -p $WEB_DIR && chown -R www-data:www-data $WEB_DIR"

# 5. 配置Nginx
echo "配置Nginx..."
ssh $SERVER "cat > /etc/nginx/sites-available/openaero << 'EOF'
server {
    listen 80;
    server_name openaero.cn www.openaero.cn;
    root $WEB_DIR;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ =404;
    }
    
    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }
    
    # 安全头
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header Referrer-Policy \"no-referrer-when-downgrade\" always;
    add_header Content-Security-Policy \"default-src 'self' http: https: data: blob: 'unsafe-inline'\" always;
}
EOF"

# 6. 启用网站配置
echo "启用网站配置..."
ssh $SERVER "ln -sf /etc/nginx/sites-available/openaero /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default"

# 7. 测试Nginx配置
echo "测试Nginx配置..."
ssh $SERVER "nginx -t"

# 8. 启动并启用Nginx
echo "启动Nginx服务..."
ssh $SERVER "systemctl start nginx && systemctl enable nginx"

# 9. 配置SSL证书
echo "配置SSL证书..."
ssh $SERVER "certbot --nginx -d openaero.cn -d www.openaero.cn --non-interactive --agree-tos --email admin@openaero.cn"

# 10. 配置自动续期
echo "配置SSL证书自动续期..."
ssh $SERVER "echo '0 12 * * * /usr/bin/certbot renew --quiet' | crontab -"

# 11. 配置fail2ban
echo "配置fail2ban..."
ssh $SERVER "cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF"

# 12. 启动fail2ban
echo "启动fail2ban..."
ssh $SERVER "systemctl start fail2ban && systemctl enable fail2ban"

echo "服务器配置完成！"
echo "下一步：运行 ./deploy.sh 部署网站文件"
