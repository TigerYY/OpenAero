#!/bin/bash
# 构建镜像，保存为 tar 文件，并传输到服务器

set -e

IMAGE_NAME="openaero-web"
VERSION="latest"
SERVER="root@openaero.cn"
REMOTE_PATH="/opt/openaero"
TAR_FILE="${IMAGE_NAME}-${VERSION}.tar"

echo "=========================================="
echo "步骤 1: 构建 Docker 镜像"
echo "=========================================="

# 检查 Docker 是否运行
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker daemon 未运行，请先启动 Docker"
    exit 1
fi

# 构建镜像
echo "构建镜像: ${IMAGE_NAME}:${VERSION}"
docker build \
    -f Dockerfile.production \
    -t "${IMAGE_NAME}:${VERSION}" \
    --progress=plain \
    . 2>&1 | tee /tmp/docker-build.log

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo "❌ 构建失败，查看日志: /tmp/docker-build.log"
    exit 1
fi

echo "✅ 构建完成"

echo ""
echo "=========================================="
echo "步骤 2: 保存镜像为 tar 文件"
echo "=========================================="

# 保存镜像
echo "保存镜像到: ${TAR_FILE}"
docker save "${IMAGE_NAME}:${VERSION}" -o "${TAR_FILE}"

# 压缩镜像（可选，但可以大幅减小文件大小）
echo "压缩镜像文件..."
gzip -f "${TAR_FILE}"
TAR_FILE="${TAR_FILE}.gz"

FILE_SIZE=$(du -h "${TAR_FILE}" | cut -f1)
echo "✅ 镜像已保存: ${TAR_FILE} (${FILE_SIZE})"

echo ""
echo "=========================================="
echo "步骤 3: 传输镜像到服务器"
echo "=========================================="

# 传输到服务器
echo "传输到服务器: ${SERVER}:${REMOTE_PATH}/"
scp "${TAR_FILE}" "${SERVER}:${REMOTE_PATH}/"

echo "✅ 传输完成"

echo ""
echo "=========================================="
echo "步骤 4: 在服务器上加载镜像"
echo "=========================================="

# 在服务器上加载镜像
ssh "${SERVER}" "cd ${REMOTE_PATH} && \
    echo '加载镜像...' && \
    docker load -i ${TAR_FILE} && \
    echo '✅ 镜像加载完成' && \
    docker images ${IMAGE_NAME} --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}'"

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo "下一步：在服务器上运行部署脚本"
echo "  ssh ${SERVER} 'cd ${REMOTE_PATH} && bash scripts/deploy-with-image.sh'"

