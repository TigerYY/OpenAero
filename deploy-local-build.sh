#!/bin/bash

# Configuration
REMOTE_USER="root"
REMOTE_HOST="openaero.cn"
IMAGE_NAME="openaero-web"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

echo "🏗️ 开始本地构建 Docker 镜像并部署到 ${REMOTE_USER}@${REMOTE_HOST}"

# 1. 本地构建 Docker 镜像
echo "🔨 本地构建 Docker 镜像..."
docker build --platform linux/amd64 -t ${FULL_IMAGE_NAME} .

if [ $? -ne 0 ]; then
  echo "❌ 错误: Docker 镜像构建失败"
  exit 1
fi
echo "✅ Docker 镜像构建成功: ${FULL_IMAGE_NAME}"

# 2. 保存镜像为 tar 文件
echo "📦 导出 Docker 镜像..."
docker save ${FULL_IMAGE_NAME} | gzip > ${IMAGE_NAME}.tar.gz

if [ $? -ne 0 ]; then
  echo "❌ 错误: 无法导出 Docker 镜像"
  exit 1
fi
echo "✅ 镜像导出成功: ${IMAGE_NAME}.tar.gz"

# 3. 上传镜像到服务器
echo "📤 上传镜像到服务器..."
scp ${IMAGE_NAME}.tar.gz "${REMOTE_USER}@${REMOTE_HOST}:/tmp/"

if [ $? -ne 0 ]; then
  echo "❌ 错误: 无法上传镜像文件"
  rm ${IMAGE_NAME}.tar.gz
  exit 1
fi
echo "✅ 镜像上传成功"

# 4. 上传 docker-compose.yml 和相关配置文件
echo "📋 上传配置文件..."
scp docker-compose.yml "${REMOTE_USER}@${REMOTE_HOST}:/root/openaero.web/"
scp -r nginx/ "${REMOTE_USER}@${REMOTE_HOST}:/root/openaero.web/" 2>/dev/null || true
scp -r redis/ "${REMOTE_USER}@${REMOTE_HOST}:/root/openaero.web/" 2>/dev/null || true
scp prometheus.yml "${REMOTE_USER}@${REMOTE_HOST}:/root/openaero.web/" 2>/dev/null || true

# 5. 在服务器上部署
echo "🚀 在服务器上部署..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" << EOF
  cd /root/openaero.web || { echo "❌ 无法进入项目目录"; exit 1; }

  echo "📥 加载 Docker 镜像..."
  docker load < /tmp/${IMAGE_NAME}.tar.gz
  
  if [ \$? -ne 0 ]; then
    echo "❌ 错误: 无法加载 Docker 镜像"
    exit 1
  fi
  echo "✅ Docker 镜像加载成功"

  echo "🗑️ 清理临时文件..."
  rm /tmp/${IMAGE_NAME}.tar.gz

  echo "📋 设置环境变量..."
  cat << ENVEQF > .env.production
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_APP_URL=https://openaero.cn
NEXT_PUBLIC_DEFAULT_LOCALE=zh-CN
NEXT_PUBLIC_SUPPORTED_LOCALES=zh-CN,en-US
NEXT_PUBLIC_FALLBACK_LOCALE=zh-CN
DATABASE_URL=postgresql://openaero:password@db:5432/openaero
POSTGRES_DB=openaero
POSTGRES_USER=openaero
POSTGRES_PASSWORD=password
REDIS_URL=redis://:18RYQZWHVik9bake5gyYLpkru@redis:6379
JWT_SECRET=your-jwt-secret-key-change-in-production
ENVEQF

  echo "🐳 更新 Docker Compose 配置使用预构建镜像..."
  # 修改 docker-compose.yml 使用预构建的镜像而不是构建
  sed -i 's/build:/# build:/g' docker-compose.yml
  sed -i 's/context: ./# context: ./g' docker-compose.yml
  sed -i 's/dockerfile: Dockerfile/# dockerfile: Dockerfile/g' docker-compose.yml
  sed -i '/# build:/a\    image: openaero-web:latest' docker-compose.yml

  echo "🛑 停止现有服务..."
  docker compose down || true

  echo "🚀 启动服务..."
  docker compose up -d

  if [ \$? -ne 0 ]; then
    echo "❌ Docker Compose 启动失败"
    exit 1
  fi
  echo "✅ 服务启动成功"

  echo "⏳ 等待服务启动..."
  sleep 30

  echo "🔍 检查服务状态..."
  docker compose ps

  echo "🌐 测试应用..."
  HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")
  echo "HTTP 状态码: \$HTTP_CODE"

  if [ "\$HTTP_CODE" = "200" ] || [ "\$HTTP_CODE" = "301" ] || [ "\$HTTP_CODE" = "302" ]; then
    echo "✅ 应用响应正常"
  else
    echo "⚠️ 应用可能还在启动中，请稍后检查"
  fi

  echo "✅ 部署完成！"
  echo "🌐 应用地址: https://openaero.cn"
  echo "📝 查看日志: docker compose logs -f"
  echo "🔄 重启应用: docker compose restart"
EOF

if [ $? -ne 0 ]; then
  echo "❌ 错误: SSH 命令失败"
  rm ${IMAGE_NAME}.tar.gz
  exit 1
fi

echo "🧹 清理本地文件..."
rm ${IMAGE_NAME}.tar.gz

echo "🎉 本地构建部署完成！"
echo "🌐 访问地址: https://openaero.cn"
echo "📝 查看日志: ssh root@openaero.cn 'docker compose logs -f'"
echo "🔄 重启应用: ssh root@openaero.cn 'docker compose restart'"
echo ""
echo "💡 提示: 本地构建的镜像已上传到服务器，下次部署会更快！"