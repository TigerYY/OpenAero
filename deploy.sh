#!/bin/bash

# OpenAero 网站部署脚本
# 使用方法: ./deploy.sh

SERVER="root@openaero.cn"
WEB_DIR="/var/www/html"
LOCAL_FILE="index.html"
DOMAIN="openaero.cn"

echo "开始部署 OpenAero 网站..."

# 检查文件是否存在
if [ ! -f "$LOCAL_FILE" ]; then
    echo "错误: $LOCAL_FILE 文件不存在"
    exit 1
fi

if [ ! -d "logo" ]; then
    echo "错误: logo 目录不存在"
    exit 1
fi

# 创建备份目录
echo "创建备份目录..."
ssh $SERVER "mkdir -p /var/backups/openaero/$(date +%Y%m%d_%H%M%S)"

# 备份现有文件
echo "备份现有文件..."
ssh $SERVER "if [ -f $WEB_DIR/index.html ]; then cp $WEB_DIR/index.html /var/backups/openaero/$(date +%Y%m%d_%H%M%S)/; fi"

# 创建logo目录（如果不存在）
echo "创建logo目录..."
ssh $SERVER "mkdir -p $WEB_DIR/logo"

# 上传主页面
echo "上传主页面..."
scp $LOCAL_FILE $SERVER:$WEB_DIR/

# 上传logo文件
echo "上传logo文件..."
scp -r logo/ $SERVER:$WEB_DIR/

# 主页面已直接上传为index.html，无需重定向
echo "主页面已直接上传为index.html"

# 设置文件权限
echo "设置文件权限..."
ssh $SERVER "chmod -R 755 $WEB_DIR && chown -R www-data:www-data $WEB_DIR"

# 测试Nginx配置
echo "测试Nginx配置..."
ssh $SERVER "nginx -t"

if [ $? -eq 0 ]; then
    # 重启Nginx
    echo "重启Nginx服务..."
    ssh $SERVER "systemctl reload nginx"
    
    # 检查服务状态
    echo "检查服务状态..."
    ssh $SERVER "systemctl status nginx --no-pager"
    
    echo "部署完成！"
    echo "网站地址: https://$DOMAIN"
    echo "HTTP地址: http://$DOMAIN (将自动重定向到HTTPS)"
    
    # 测试网站可访问性
    echo "测试网站可访问性..."
    sleep 5
    curl -I https://$DOMAIN || echo "HTTPS测试失败，尝试HTTP..."
    curl -I http://$DOMAIN || echo "网站可能还在配置中，请稍等几分钟"
else
    echo "Nginx配置测试失败，请检查配置"
    exit 1
fi
