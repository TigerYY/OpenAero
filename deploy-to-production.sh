#!/bin/bash

# OpenAero 生产环境部署脚本
# 用途: 将本地项目部署到 root@openaero.cn

set -e  # 遇到错误立即退出

# 配置变量
SERVER="root@openaero.cn"
REMOTE_DIR="/opt/openaero"
LOCAL_DIR="$(pwd)"
BACKUP_DIR="/opt/openaero-backup-$(date +%Y%m%d_%H%M%S)"

echo "🚀 开始部署 OpenAero 到生产服务器..."
echo "服务器: $SERVER"
echo "远程目录: $REMOTE_DIR"
echo ""

# 1. 在服务器上创建备份（如果存在旧版本）
echo "📦 创建服务器备份..."
ssh $SERVER "
    if [ -d '$REMOTE_DIR' ]; then
        echo '创建备份到: $BACKUP_DIR'
        cp -r $REMOTE_DIR $BACKUP_DIR
        echo '备份完成'
    else
        echo '首次部署，无需备份'
    fi
"

# 2. 停止现有服务（如果存在）
echo "⏹️  停止现有服务..."
ssh $SERVER "
    cd $REMOTE_DIR 2>/dev/null || true
    if [ -f 'docker-compose.production.yml' ]; then
        echo '停止现有 Docker 服务...'
        docker-compose -f docker-compose.production.yml down || true
    fi
"

# 3. 创建远程目录
echo "📁 准备远程目录..."
ssh $SERVER "mkdir -p $REMOTE_DIR"

# 4. 同步项目文件（排除不需要的文件）
echo "📤 同步项目文件..."
rsync -avz --progress \
    --exclude-from='.deployignore' \
    --exclude='.git/' \
    --exclude='node_modules/' \
    --exclude='.next/' \
    --delete \
    "$LOCAL_DIR/" "$SERVER:$REMOTE_DIR/"

echo "✅ 文件同步完成"

# 5. 在服务器上设置环境
echo "🔧 配置服务器环境..."
ssh $SERVER "
    cd $REMOTE_DIR
    
    # 检查 Docker 和 Docker Compose
    echo '检查 Docker 环境...'
    docker --version
    docker-compose --version || docker compose version
    
    # 创建必要的目录
    mkdir -p nginx/ssl
    mkdir -p redis
    mkdir -p backups
    
    # 设置权限
    chmod +x *.sh 2>/dev/null || true
    
    echo '服务器环境配置完成'
"

echo ""
echo "🎉 项目文件部署完成！"
echo ""
echo "接下来需要："
echo "1. 配置生产环境变量"
echo "2. 生成 SSL 证书"
echo "3. 启动 Docker 服务"
echo ""
echo "使用以下命令连接到服务器继续配置:"
echo "ssh $SERVER"
echo "cd $REMOTE_DIR"