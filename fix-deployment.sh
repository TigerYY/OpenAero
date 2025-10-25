#!/bin/bash

echo "🔧 修复部署问题..."

# 连接到服务器并修复
ssh root@openaero.cn << 'EOF'
  echo "📁 进入项目目录..."
  cd /root/openaero.web

  echo "🛑 停止所有 PM2 进程..."
  pm2 delete all || true

  echo "🔧 修复文件权限..."
  chmod -R 755 /root/openaero.web

  echo "🌐 设置环境变量..."
  export NODE_ENV=production
  export PORT=3000
  export NEXT_PUBLIC_APP_URL=https://openaero.cn
  export NEXT_PUBLIC_DEFAULT_LOCALE=zh-CN
  export NEXT_PUBLIC_SUPPORTED_LOCALES=zh-CN,en-US
  export NEXT_PUBLIC_FALLBACK_LOCALE=zh-CN

  echo "🚀 直接启动应用..."
  nohup npm start > app.log 2>&1 &

  echo "⏳ 等待应用启动..."
  sleep 10

  echo "📊 检查进程..."
  ps aux | grep node

  echo "🌐 检查端口..."
  lsof -i :3000 || echo "端口 3000 未监听"

  echo "✅ 修复完成！"
EOF

echo "🎉 修复脚本执行完成！"
