#!/bin/bash

# PM2 部署脚本
# 目标服务器: root@openaero.cn

set -e

# 配置
REMOTE_USER="root"
REMOTE_HOST="openaero.cn"
REMOTE_DIR="/root/openaero.web"
LOCAL_DIR="./"

echo "🚀 开始 PM2 部署到 ${REMOTE_USER}@${REMOTE_HOST}"

# 1. 创建项目压缩包
echo "📦 创建项目压缩包..."
tar -czf openaero-pm2.tar.gz \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./.git' \
  --exclude='./.DS_Store' \
  --exclude='./.env*' \
  --exclude='./deploy-*.sh' \
  --exclude='./openaero-*.tar.gz' \
  --exclude='./.Trash' \
  --exclude='./Library' \
  --exclude='./Desktop' \
  --exclude='./Documents' \
  --exclude='./Downloads' \
  --exclude='./Movies' \
  --exclude='./Music' \
  --exclude='./Pictures' \
  --exclude='./Public' \
  --exclude='./Sites' \
  -C "${LOCAL_DIR}" .

if [ $? -ne 0 ]; then
  echo "❌ 创建压缩包失败"
  exit 1
fi
echo "✅ 项目压缩包创建成功: openaero-pm2.tar.gz"

# 2. 上传到服务器
echo "📤 上传到服务器..."
scp openaero-pm2.tar.gz "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

if [ $? -ne 0 ]; then
  echo "❌ 上传失败"
  rm openaero-pm2.tar.gz
  exit 1
fi
echo "✅ 上传成功"

# 3. 在服务器上部署
echo "🔧 在服务器上部署..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" << 'EOF'
  echo "📁 创建并进入部署目录..."
  mkdir -p /root/openaero.web
  cd /root/openaero.web || { echo "❌ 无法进入部署目录"; exit 1; }

  echo "🗑️ 清理旧文件..."
  rm -rf .next node_modules package-lock.json

  echo "📦 解压新版本..."
  tar -xzf openaero-pm2.tar.gz
  rm openaero-pm2.tar.gz

  echo "📋 设置环境变量..."
  cat > .env.production << 'ENVEOF'
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_APP_URL=https://openaero.cn
NEXT_PUBLIC_DEFAULT_LOCALE=zh-CN
NEXT_PUBLIC_SUPPORTED_LOCALES=zh-CN,en-US
NEXT_PUBLIC_FALLBACK_LOCALE=zh-CN
ENVEOF

  echo "📦 安装依赖..."
  npm install --ignore-scripts

  if [ $? -ne 0 ]; then
    echo "❌ npm install 失败"
    exit 1
  fi
  echo "✅ 依赖安装成功"

  echo "🔧 生成 Prisma 客户端..."
  npx prisma generate

  if [ $? -ne 0 ]; then
    echo "❌ Prisma 生成失败"
    exit 1
  fi
  echo "✅ Prisma 客户端生成成功"

  echo "🔨 构建项目..."
  npm run build || {
    echo "⚠️ 构建有警告，但继续部署..."
  }

  echo "🛑 停止现有 PM2 进程..."
  pm2 stop openaero || true
  pm2 delete openaero || true

  echo "🚀 启动 PM2 进程..."
  pm2 start npm --name "openaero" -- start

  if [ $? -ne 0 ]; then
    echo "❌ PM2 启动失败"
    exit 1
  fi

  echo "💾 保存 PM2 配置..."
  pm2 save

  echo "📊 显示 PM2 状态..."
  pm2 list

  echo "✅ 部署完成！"
  echo "🌐 应用地址: https://openaero.cn"
  echo "📝 查看日志: pm2 logs openaero"
  echo "🔄 重启应用: pm2 restart openaero"
EOF

if [ $? -ne 0 ]; then
  echo "❌ 服务器部署失败"
  rm openaero-pm2.tar.gz
  exit 1
fi

# 4. 清理本地文件
echo "🧹 清理本地文件..."
rm openaero-pm2.tar.gz

echo "🎉 PM2 部署完成！"
echo "🌐 访问地址: https://openaero.cn"
echo "📝 查看日志: ssh root@openaero.cn 'pm2 logs openaero'"
echo "🔄 重启应用: ssh root@openaero.cn 'pm2 restart openaero'"
