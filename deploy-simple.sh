#!/bin/bash

# 简单部署脚本 - 绕过所有复杂问题
echo "🚀 开始简单部署..."

# 1. 创建部署目录
mkdir -p ~/openaero-deploy
cd ~/openaero-deploy

# 2. 克隆代码（如果还没有）
if [ ! -d "openaero.web" ]; then
    echo "📥 克隆代码..."
    git clone https://github.com/your-repo/openaero.web.git
fi

cd openaero.web

# 3. 安装依赖
echo "📦 安装依赖..."
npm install

# 4. 创建生产环境变量
echo "⚙️ 创建环境变量..."
cat > .env.production << EOF
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
DATABASE_URL=postgresql://openaero:password@localhost:5432/openaero
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://openaero.cn
EOF

# 5. 构建应用
echo "🔨 构建应用..."
npm run build

# 6. 启动应用
echo "🚀 启动应用..."
nohup npm start > app.log 2>&1 &

echo "✅ 部署完成！"
echo "📊 应用运行在端口 3000"
echo "📝 日志文件: ~/openaero-deploy/openaero.web/app.log"
echo "🌐 访问地址: http://openaero.cn:3000"
