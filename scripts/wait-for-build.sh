#!/bin/bash
# 等待 Docker 构建完成

IMAGE_NAME="$1"
MAX_WAIT=${2:-1800}  # 默认最多等待30分钟
CHECK_INTERVAL=30   # 每30秒检查一次
ELAPSED=0

echo "等待镜像构建完成: $IMAGE_NAME"
echo "最多等待: $MAX_WAIT 秒 ($(($MAX_WAIT / 60)) 分钟)"
echo ""

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if docker images | grep -q "$IMAGE_NAME"; then
        echo "✅ 镜像构建完成！"
        docker images "$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        exit 0
    fi
    
    # 检查构建进程是否还在运行
    if ! pgrep -f "docker build.*Dockerfile.production" >/dev/null; then
        echo "⚠️  构建进程已结束，但镜像未找到"
        echo "检查构建日志:"
        ls -t /tmp/docker-build-*.log 2>/dev/null | head -1 | xargs tail -20 2>/dev/null || echo "无日志文件"
        exit 1
    fi
    
    ELAPSED=$((ELAPSED + CHECK_INTERVAL))
    echo "等待中... ($(($ELAPSED / 60)) 分钟 / $(($MAX_WAIT / 60)) 分钟)"
    sleep $CHECK_INTERVAL
done

echo "❌ 构建超时"
exit 1

