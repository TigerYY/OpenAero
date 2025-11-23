#!/bin/bash
# 监控 Docker 构建进度

echo "监控 Docker 构建进程..."
echo ""

# 查找构建进程
BUILD_PID=$(pgrep -f "docker build.*Dockerfile.production" | head -1)

if [ -n "$BUILD_PID" ]; then
    echo "✅ 构建进程正在运行 (PID: $BUILD_PID)"
    echo ""
    echo "查看最新构建日志:"
    ls -t /tmp/docker-build-*.log 2>/dev/null | head -1 | xargs tail -20 2>/dev/null || echo "日志文件未找到"
else
    echo "⚠️  未检测到构建进程"
    echo ""
    echo "检查最近的构建日志:"
    ls -t /tmp/docker-build-*.log 2>/dev/null | head -1 | xargs tail -30 2>/dev/null || echo "无构建日志"
fi

echo ""
echo "检查 Docker 镜像:"
docker images | grep "openaero-web" | head -5

