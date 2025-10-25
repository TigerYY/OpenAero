#!/bin/bash

# 服务器初始化脚本
# 在 root@openaero.cn 上运行

set -e

echo "🔧 开始服务器初始化..."

# 1. 更新系统
echo "📦 更新系统包..."
apt update && apt upgrade -y

# 2. 安装 Node.js 18
echo "📦 安装 Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 3. 安装 PM2
echo "📦 安装 PM2..."
npm install -g pm2

# 4. 安装 Nginx
echo "📦 安装 Nginx..."
apt install -y nginx

# 5. 创建项目目录
echo "📁 创建项目目录..."
mkdir -p /root/openaero.web/logs

# 6. 配置 Nginx
echo "🔧 配置 Nginx..."
cat > /etc/nginx/sites-available/openaero << 'EOF'
server {
    listen 80;
    server_name openaero.cn www.openaero.cn;

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
EOF

# 7. 启用站点
ln -sf /etc/nginx/sites-available/openaero /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 8. 测试 Nginx 配置
nginx -t

# 9. 启动服务
systemctl restart nginx
systemctl enable nginx

# 10. 设置 PM2 开机自启
pm2 startup
pm2 save

echo "✅ 服务器初始化完成！"
echo "🌐 Nginx 已配置并启动"
echo "📦 Node.js 18 已安装"
echo "🚀 PM2 已安装并配置开机自启"
echo "📁 项目目录: /root/openaero.web"
