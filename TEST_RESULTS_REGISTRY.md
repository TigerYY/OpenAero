# 容器注册表部署流程测试结果

**测试时间**: 2025-01-XX  
**测试环境**: 本地开发环境  
**GitHub 仓库**: TigerYY/OpenAero

## ✅ 测试结果总结

### 测试 1: 环境检查 ✅
- ✅ Docker 正在运行
- ✅ 所有脚本文件存在且可执行
  - `scripts/deploy-from-registry.sh`
  - `scripts/setup-registry-auth.sh`
  - `scripts/build-and-push.sh`
- ✅ Docker Compose 配置存在 (`docker-compose.registry.yml`)

### 测试 2: 脚本语法检查 ✅
- ✅ `scripts/deploy-from-registry.sh` - 语法正确
- ✅ `scripts/setup-registry-auth.sh` - 语法正确
- ✅ `scripts/build-and-push.sh` - 语法正确

### 测试 3: Docker Compose 配置验证 ✅
- ✅ Docker Compose 配置有效
- ✅ 镜像配置: `ghcr.io/openaero-web:latest` (可通过环境变量覆盖)

### 测试 4: Dockerfile 检查 ✅
- ✅ `Dockerfile.production` 存在
- ⚠️  完整构建测试需要较长时间（建议在准备好推送时执行）

### 测试 5: 注册表认证检查 ⚠️
- ⚠️  未登录 GitHub Container Registry
- ℹ️  未登录 Docker Hub（可选）

### 测试 6: 部署脚本功能检查 ✅
- ✅ 包含镜像拉取功能
- ✅ 包含 Docker Compose 部署功能
- ✅ 包含健康检查功能

## 📊 测试统计

- **总测试数**: 6
- **通过**: 5 ✅
- **警告**: 1 ⚠️
- **失败**: 0 ❌
- **通过率**: 83%

## 🎯 下一步操作

### 阶段 1: 设置认证（5分钟）

#### 选项 A: 使用脚本（推荐）

```bash
# 需要 GitHub Personal Access Token (PAT)
# 创建 Token: https://github.com/settings/tokens
# 权限: read:packages, write:packages

./scripts/setup-registry-auth.sh ghcr.io your-github-username
```

#### 选项 B: 手动登录

```bash
# 设置环境变量
export GITHUB_TOKEN=your_personal_access_token

# 登录
echo $GITHUB_TOKEN | docker login ghcr.io -u your-github-username --password-stdin
```

### 阶段 2: 构建并推送测试镜像（10-30分钟）

根据你的 GitHub 仓库信息，使用以下命令：

```bash
# 使用你的 GitHub 用户名
GITHUB_USER="TigerYY"

# 构建并推送测试镜像
DOCKER_REGISTRY=ghcr.io \
DOCKER_USERNAME=$GITHUB_USER \
VERSION=test-$(date +%Y%m%d-%H%M%S) \
./scripts/build-and-push.sh

# 镜像将推送到: ghcr.io/tigeryy/openaero-web:test-xxx
```

**注意**: 
- 首次构建可能需要 10-30 分钟
- 确保有足够的磁盘空间
- 构建过程中不要中断

### 阶段 3: 验证镜像（2分钟）

```bash
# 检查镜像是否已推送
docker pull ghcr.io/$GITHUB_USER/openaero-web:test-xxx

# 查看镜像信息
docker images ghcr.io/$GITHUB_USER/openaero-web
```

### 阶段 4: 测试部署（本地，5分钟）

```bash
# 设置镜像名称
export DOCKER_IMAGE=ghcr.io/$GITHUB_USER/openaero-web:test-xxx
export COMPOSE_FILE=docker-compose.registry.yml

# 执行部署测试
./scripts/deploy-from-registry.sh
```

### 阶段 5: 服务器部署测试（需要服务器访问）

```bash
# 在服务器上设置认证
ssh root@openaero.cn
export GITHUB_TOKEN=your_token
echo $GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin

# 部署
cd /opt/openaero
export DOCKER_IMAGE=ghcr.io/your-username/openaero-web:test-xxx
export COMPOSE_FILE=docker-compose.registry.yml
./scripts/deploy-from-registry.sh
```

## ⚠️ 注意事项

1. **GitHub Token 权限**:
   - 需要 `read:packages` 和 `write:packages` 权限
   - Token 不要提交到代码仓库

2. **镜像命名**:
   - GitHub Container Registry 格式: `ghcr.io/<owner>/<image>:<tag>`
   - 确保镜像名称与 GitHub 仓库匹配

3. **构建时间**:
   - 首次构建可能需要较长时间
   - 后续构建会使用缓存，速度更快

4. **磁盘空间**:
   - 确保有足够的磁盘空间（建议 > 5GB）
   - Docker 镜像可能占用较大空间

## 🔍 故障排除

### 问题 1: 认证失败

**错误**: `unauthorized: authentication required`

**解决**:
```bash
# 检查 Token 是否有效
echo $GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin

# 检查权限
# Token 需要: read:packages, write:packages
```

### 问题 2: 推送失败

**错误**: `denied: permission_denied`

**解决**:
- 检查 Token 是否有 `write:packages` 权限
- 检查镜像名称是否与 GitHub 仓库匹配
- 确保仓库是公开的，或者 Token 有访问私有仓库的权限

### 问题 3: 构建失败

**错误**: 构建过程中出错

**解决**:
```bash
# 查看详细构建日志
docker build -f Dockerfile.production -t test-image . --progress=plain

# 检查 Dockerfile 语法
docker build -f Dockerfile.production -t test-image . --dry-run
```

## 📝 测试检查清单

- [x] 环境检查
- [x] 脚本语法检查
- [x] Docker Compose 配置验证
- [ ] 注册表认证设置
- [ ] 镜像构建和推送
- [ ] 镜像拉取验证
- [ ] 本地部署测试
- [ ] 服务器部署测试
- [ ] 回滚测试

## 🎉 测试通过标准

所有测试通过后，可以继续：
1. ✅ 集成到 CI/CD 流程
2. ✅ 实施蓝绿部署
3. ✅ 添加监控和告警

---

**测试状态**: ✅ 基础测试通过，等待实际部署测试  
**下一步**: 设置注册表认证并执行实际构建和推送测试

