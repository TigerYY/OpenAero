# 容器注册表部署测试执行指南

## 🎯 目标

完成容器注册表部署流程的完整测试，验证：
1. GitHub Container Registry 认证
2. Docker 镜像构建
3. 镜像推送到注册表
4. 镜像拉取验证
5. 部署脚本功能

## 📋 前置条件

### 必需
- ✅ Docker 已安装并运行
- ✅ GitHub 账号
- ✅ GitHub Personal Access Token (PAT)

### 获取 GitHub Token

1. **访问 Token 设置页面**
   ```
   https://github.com/settings/tokens
   ```

2. **创建新 Token**
   - 点击 "Generate new token (classic)"
   - 输入 Token 名称（如：`openaero-registry-test`）
   - 选择过期时间（建议：90天或自定义）

3. **选择权限**
   - ✅ `read:packages` - 读取包
   - ✅ `write:packages` - 写入包

4. **生成并复制 Token**
   - 点击 "Generate token"
   - **重要**: 立即复制 Token，关闭页面后无法再次查看

## 🚀 执行方式

### 方式 1: 自动化脚本（推荐）

**优点**: 一键执行所有步骤，自动处理错误

```bash
# 1. 设置 GitHub Token
export GITHUB_TOKEN=your_personal_access_token

# 2. 执行自动化测试
./scripts/execute-registry-test.sh
```

**脚本将自动执行**:
1. ✅ 检查 GitHub Token
2. ✅ 登录到 GitHub Container Registry
3. ✅ 构建 Docker 镜像（10-30分钟）
4. ✅ 推送镜像到注册表
5. ✅ 验证镜像可拉取
6. ✅ 检查部署脚本配置

### 方式 2: 手动执行（逐步）

**优点**: 可以控制每一步，便于调试

#### 步骤 1: 设置环境变量

```bash
export GITHUB_TOKEN=your_personal_access_token
export GITHUB_USER="TigerYY"
export REGISTRY="ghcr.io"
```

#### 步骤 2: 登录到 GitHub Container Registry

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USER --password-stdin
```

**验证登录**:
```bash
docker info | grep -A 2 "ghcr.io"
```

#### 步骤 3: 构建 Docker 镜像

```bash
VERSION="test-$(date +%Y%m%d-%H%M%S)"
FULL_IMAGE_NAME="ghcr.io/tigeryy/openaero-web:$VERSION"

docker build \
    -f Dockerfile.production \
    -t "$FULL_IMAGE_NAME" \
    --progress=plain \
    .
```

**预计时间**: 10-30 分钟（取决于网络和系统性能）

#### 步骤 4: 推送镜像到注册表

```bash
docker push "$FULL_IMAGE_NAME"
```

**预计时间**: 2-10 分钟（取决于镜像大小和网络速度）

#### 步骤 5: 验证镜像可拉取

```bash
# 删除本地镜像
docker rmi "$FULL_IMAGE_NAME"

# 拉取镜像
docker pull "$FULL_IMAGE_NAME"
```

#### 步骤 6: 测试部署脚本

```bash
export DOCKER_IMAGE="$FULL_IMAGE_NAME"
export COMPOSE_FILE="docker-compose.registry.yml"

# 检查配置
docker compose -f "$COMPOSE_FILE" config

# 执行部署（本地测试）
./scripts/deploy-from-registry.sh
```

## 📊 执行检查清单

- [ ] GitHub Token 已创建并设置
- [ ] 已登录到 GitHub Container Registry
- [ ] Docker 镜像构建成功
- [ ] 镜像已推送到注册表
- [ ] 镜像可以成功拉取
- [ ] 部署脚本配置正确
- [ ] （可选）本地部署测试通过

## ⚠️ 常见问题

### 问题 1: Token 认证失败

**错误**: `unauthorized: authentication required`

**解决**:
1. 检查 Token 是否正确
2. 确认 Token 有 `read:packages` 和 `write:packages` 权限
3. 重新登录: `echo $GITHUB_TOKEN | docker login ghcr.io -u TigerYY --password-stdin`

### 问题 2: 推送权限被拒绝

**错误**: `denied: permission_denied`

**解决**:
1. 检查仓库是否为公开仓库，或 Token 有访问私有仓库的权限
2. 确认镜像名称格式正确: `ghcr.io/username/image-name:tag`
3. 检查 Token 是否有 `write:packages` 权限

### 问题 3: 构建失败

**错误**: 构建过程中出错

**解决**:
```bash
# 查看详细构建日志
docker build -f Dockerfile.production -t test-image . --progress=plain

# 检查 Dockerfile 语法
docker build -f Dockerfile.production -t test-image . --dry-run
```

### 问题 4: 镜像拉取失败

**错误**: `pull access denied`

**解决**:
1. 等待几分钟（镜像可能还在同步）
2. 检查镜像名称是否正确
3. 确认已登录: `docker info | grep ghcr.io`

## 📝 验证结果

### 成功标志

1. ✅ 镜像构建成功
2. ✅ 镜像推送到注册表成功
3. ✅ 镜像可以拉取
4. ✅ 部署脚本可以识别镜像

### 查看镜像

**在 GitHub 上查看**:
```
https://github.com/TigerYY?tab=packages
```

**使用命令行查看**:
```bash
docker images ghcr.io/tigeryy/openaero-web
```

## 🎉 测试通过后

测试通过后，可以：

1. **集成到 CI/CD**
   - GitHub Actions 已配置自动构建和推送
   - 推送到 `main` 或 `develop` 分支会自动触发

2. **在服务器上部署**
   ```bash
   ssh root@openaero.cn
   export GITHUB_TOKEN=your_token
   echo $GITHUB_TOKEN | docker login ghcr.io -u TigerYY --password-stdin
   cd /opt/openaero
   export DOCKER_IMAGE=ghcr.io/tigeryy/openaero-web:latest
   ./scripts/deploy-from-registry.sh
   ```

3. **继续下一步优化**
   - 实施蓝绿部署
   - 添加监控和告警

## 📚 相关文档

- [测试计划](./DEPLOYMENT_TESTING_PLAN.md)
- [测试结果](./../TEST_RESULTS_REGISTRY.md)
- [容器注册表迁移指南](./CONTAINER_REGISTRY_MIGRATION.md)

---

**准备就绪？** 设置 `GITHUB_TOKEN` 后运行 `./scripts/execute-registry-test.sh`

