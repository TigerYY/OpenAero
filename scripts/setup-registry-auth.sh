#!/bin/bash
# 设置容器注册表认证
# 支持 GitHub Container Registry (ghcr.io) 和 Docker Hub

set -e

REGISTRY="${1:-ghcr.io}"
USERNAME="${2:-}"

echo "=========================================="
echo "设置容器注册表认证"
echo "=========================================="
echo "注册表: ${REGISTRY}"
echo ""

if [ -z "$USERNAME" ]; then
    echo "使用方法: $0 <registry> <username>"
    echo ""
    echo "示例:"
    echo "  $0 ghcr.io your-github-username"
    echo "  $0 docker.io your-dockerhub-username"
    exit 1
fi

case "$REGISTRY" in
    ghcr.io)
        echo "配置 GitHub Container Registry..."
        echo ""
        echo "请提供 GitHub Personal Access Token (PAT)"
        echo "创建 Token: https://github.com/settings/tokens"
        echo "权限: read:packages, write:packages"
        echo ""
        read -sp "Token: " TOKEN
        echo ""
        
        if [ -z "$TOKEN" ]; then
            echo "❌ Token 不能为空"
            exit 1
        fi
        
        echo "$TOKEN" | docker login "${REGISTRY}" -u "${USERNAME}" --password-stdin
        
        if [ $? -eq 0 ]; then
            echo "✅ GitHub Container Registry 登录成功"
            echo ""
            echo "💡 提示: 可以将 Token 保存为环境变量:"
            echo "   export GITHUB_TOKEN=your_token"
            echo "   echo \$GITHUB_TOKEN | docker login ghcr.io -u ${USERNAME} --password-stdin"
        else
            echo "❌ 登录失败"
            exit 1
        fi
        ;;
    
    docker.io)
        echo "配置 Docker Hub..."
        echo ""
        read -sp "Docker Hub 密码: " PASSWORD
        echo ""
        
        if [ -z "$PASSWORD" ]; then
            echo "❌ 密码不能为空"
            exit 1
        fi
        
        echo "$PASSWORD" | docker login "${REGISTRY}" -u "${USERNAME}" --password-stdin
        
        if [ $? -eq 0 ]; then
            echo "✅ Docker Hub 登录成功"
        else
            echo "❌ 登录失败"
            exit 1
        fi
        ;;
    
    *)
        echo "❌ 不支持的注册表: ${REGISTRY}"
        echo "支持的注册表: ghcr.io, docker.io"
        exit 1
        ;;
esac

echo ""
echo "验证登录状态:"
docker info | grep -A 5 "Username" || echo "未找到登录信息"

