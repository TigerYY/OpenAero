#!/bin/bash

# Configuration
REMOTE_USER="root"
REMOTE_HOST="openaero.cn"
REMOTE_DIR="/root/openaero.web"
LOCAL_DIR="./"
BRANCH="004-deployment-optimization"

echo "🐳 开始 Docker 部署到 ${REMOTE_USER}@${REMOTE_HOST}"

# 1. 创建项目压缩包
echo "📦 创建项目压缩包..."
tar -czf openaero-docker.tar.gz \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./.git' \
  --exclude='./.DS_Store' \
  --exclude='./.env*' \
  --exclude='./scripts' \
  --exclude='./public/uploads' \
  -C "${LOCAL_DIR}" .

if [ $? -ne 0 ]; then
  echo "❌ 错误: 无法创建项目压缩包."
  exit 1
fi
echo "✅ 项目压缩包创建成功: openaero-docker.tar.gz"

# 2. 上传到服务器
echo "📤 上传到服务器..."
scp openaero-docker.tar.gz "${REMOTE_USER}@${REMOTE_HOST}:/tmp/"

if [ $? -ne 0 ]; then
  echo "❌ 错误: 无法上传压缩包."
  rm openaero-docker.tar.gz
  exit 1
fi
echo "✅ 上传成功"

# 3. 在服务器上部署
echo "🔧 在服务器上部署..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" << 'EOF'
  echo "📁 创建项目目录..."
  mkdir -p /root/openaero.web
  cd /root/openaero.web || { echo "❌ 无法进入项目目录"; exit 1; }

  echo "🗑️ 清理旧文件..."
  rm -rf .next node_modules package-lock.json

  echo "📦 解压新版本..."
  tar -xzf /tmp/openaero-docker.tar.gz

  if [ $? -ne 0 ]; then
    echo "❌ 错误: 无法解压压缩包."
    exit 1
  fi
  echo "✅ 解压成功"

  echo "🗑️ 清理服务器上的压缩包..."
  rm /tmp/openaero-docker.tar.gz

  echo "📋 设置环境变量..."
  cat << ENVEQF > .env.production
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_APP_URL=https://openaero.cn
NEXT_PUBLIC_DEFAULT_LOCALE=zh-CN
NEXT_PUBLIC_SUPPORTED_LOCALES=zh-CN,en-US
NEXT_PUBLIC_FALLBACK_LOCALE=zh-CN
ENVEQF

  echo "🐳 使用 Docker Compose 部署..."
  docker compose down || true
  docker compose build --no-cache
  
  if [ $? -ne 0 ]; then
    echo "❌ Docker Compose 构建失败"
    exit 1
  fi
  echo "✅ Docker Compose 构建成功"

  echo "🚀 启动服务..."
  docker compose up -d

  if [ $? -ne 0 ]; then
    echo "❌ Docker Compose 启动失败"
    exit 1
  fi
  echo "✅ 服务启动成功"

  echo "⏳ 等待服务启动..."
  sleep 30

  echo "🔍 检查服务状态..."
  docker compose ps

  echo "🌐 测试应用..."
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

  echo "✅ Docker Compose 部署完成！"
  echo "🌐 应用地址: https://openaero.cn"
  echo "📝 查看日志: docker compose logs -f"
  echo "🔄 重启应用: docker compose restart"
EOF

if [ $? -ne 0 ]; then
  echo "❌ 错误: SSH 命令失败."
  rm openaero-docker.tar.gz
  exit 1
fi

echo "🧹 清理本地文件..."
rm openaero-docker.tar.gz

echo "🎉 Docker Compose 部署完成！"
echo "🌐 访问地址: https://openaero.cn"
echo "📝 查看日志: ssh root@openaero.cn 'docker compose logs -f'"
echo "🔄 重启应用: ssh root@openaero.cn 'docker compose restart'"
