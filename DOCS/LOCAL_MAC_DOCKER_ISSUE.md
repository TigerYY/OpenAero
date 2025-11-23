# 本地 Mac Docker Pull 卡住问题

## 问题描述

在本地 Mac (ARM64) 上执行 `docker pull` 拉取 AMD64 镜像时，进程卡住，没有显示 "Successfully pulled"。

## 原因分析

1. **平台架构不匹配**
   - 本地 Mac: ARM64 (Apple Silicon)
   - 镜像: Linux AMD64
   - Docker 尝试匹配 ARM64 架构失败

2. **Docker 行为**
   - Docker 会尝试查找匹配的架构
   - 如果找不到，可能卡住或静默失败
   - 不会显示明确的错误信息

## 解决方案

### 方案 1: 在服务器上执行（推荐）✅

**为什么推荐：**
- 服务器是 Linux AMD64，与镜像架构完全匹配
- 性能最佳，无需模拟运行
- 这是生产环境的正确方式

**执行步骤：**

```bash
# 使用自动化脚本（推荐）
export GITHUB_TOKEN=your_token
./scripts/deploy-via-ssh.sh root@openaero.cn test-20251123
```

或手动执行：

```bash
# 1. SSH 到服务器
ssh root@openaero.cn

# 2. 登录 GitHub Container Registry
export GITHUB_TOKEN=your_token
echo $GITHUB_TOKEN | docker login ghcr.io -u TigerYY --password-stdin

# 3. 拉取镜像（服务器是 AMD64，可以正常拉取）
docker pull ghcr.io/tigeryy/openaero-web:test-20251123

# 4. 部署
cd /opt/openaero
export DOCKER_IMAGE=ghcr.io/tigeryy/openaero-web:test-20251123
export COMPOSE_FILE=docker-compose.registry.yml
./scripts/deploy-from-registry.sh
```

### 方案 2: 本地测试（指定平台）

如果确实需要在本地 Mac 上测试 AMD64 镜像：

```bash
# 使用 --platform 参数强制拉取 AMD64
docker pull --platform linux/amd64 \
  ghcr.io/tigeryy/openaero-web:test-20251123
```

**注意事项：**
- ⚠️ 性能较慢（需要模拟运行 AMD64）
- ⚠️ 仅用于测试，不建议生产使用
- ⚠️ 可能遇到兼容性问题

### 方案 3: 终止卡住的进程

如果进程还在运行：

```bash
# 方法 1: 在终端按 Ctrl+C

# 方法 2: 使用命令终止
pkill -f "docker pull"

# 方法 3: 查找并终止
ps aux | grep "docker pull"
kill <PID>
```

## 验证方法

### 检查进程状态

```bash
# 检查是否有 Docker pull 进程
pgrep -fl "docker pull"

# 检查 Docker 状态
docker ps
docker info
```

### 检查镜像是否存在

```bash
# 检查本地镜像
docker images | grep openaero-web

# 检查服务器上的镜像
ssh root@openaero.cn 'docker images | grep openaero-web'
```

## 最佳实践

1. **开发环境**
   - 在本地 Mac 上开发
   - 使用 Docker 构建本地镜像（ARM64）
   - 或使用 `docker buildx` 构建多平台镜像

2. **测试环境**
   - 在服务器上测试（AMD64）
   - 使用容器注册表部署
   - 验证生产环境配置

3. **生产环境**
   - 始终在服务器（AMD64）上部署
   - 使用容器注册表
   - 使用自动化部署脚本

## 相关文档

- [SSH 部署指南](./SSH_DEPLOYMENT_GUIDE.md)
- [容器注册表迁移指南](./CONTAINER_REGISTRY_MIGRATION.md)
- [部署测试计划](./DEPLOYMENT_TESTING_PLAN.md)

## 总结

**本地 Mac 上 Docker pull 卡住是正常的**，因为：
- 架构不匹配（ARM64 vs AMD64）
- 镜像需要在服务器上拉取和运行

**推荐操作：**
- ✅ 使用自动化 SSH 部署脚本
- ✅ 在服务器上执行所有部署操作
- ✅ 避免在本地 Mac 上拉取 AMD64 镜像

---

**最后更新**: 2025-01-23

