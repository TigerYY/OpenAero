# 容器注册表迁移指南

## 概述

本项目已从手动传输 tar.gz 文件的方式迁移到使用容器注册表（GitHub Container Registry）进行镜像管理。

## 优势

### 之前的方式（手动传输）
- ❌ 需要手动构建、保存、传输镜像
- ❌ 文件体积大（压缩后仍可能 > 1GB）
- ❌ 传输时间长（取决于网络速度）
- ❌ 版本管理困难
- ❌ 回滚不便

### 使用容器注册表
- ✅ 自动化构建和推送（CI/CD）
- ✅ 版本管理（标签、SHA）
- ✅ 快速拉取（CDN 加速）
- ✅ 易于回滚（切换标签）
- ✅ 镜像扫描和安全检查

## 配置

### 1. GitHub Container Registry

**镜像命名格式**:
```
ghcr.io/<owner>/<image-name>:<tag>
```

**示例**:
```
ghcr.io/openaero/openaero-web:latest
ghcr.io/openaero/openaero-web:main-abc1234
ghcr.io/openaero/openaero-web:v1.0.0
```

### 2. 认证设置

#### 使用 GitHub Personal Access Token (PAT)

1. **创建 Token**:
   - 访问: https://github.com/settings/tokens
   - 权限: `read:packages`, `write:packages`

2. **登录到注册表**:
   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
   ```

3. **或使用脚本**:
   ```bash
   ./scripts/setup-registry-auth.sh ghcr.io your-github-username
   ```

#### 使用环境变量

```bash
export GITHUB_TOKEN=your_token
export DOCKER_REGISTRY=ghcr.io
export DOCKER_IMAGE_NAME=openaero-web
```

## 使用方法

### 1. 本地构建并推送

#### 使用脚本（推荐）

```bash
# 构建并推送到 GitHub Container Registry
DOCKER_REGISTRY=ghcr.io \
DOCKER_USERNAME=your-github-username \
VERSION=latest \
./scripts/build-and-push.sh
```

#### 手动操作

```bash
# 1. 登录
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# 2. 构建
docker build -f Dockerfile.production -t ghcr.io/openaero/openaero-web:latest .

# 3. 推送
docker push ghcr.io/openaero/openaero-web:latest
```

### 2. 从注册表部署

#### 使用脚本（推荐）

```bash
# 在服务器上执行
export DOCKER_REGISTRY=ghcr.io
export DOCKER_IMAGE_NAME=openaero/openaero-web
export VERSION=latest

./scripts/deploy-from-registry.sh
```

#### 手动操作

```bash
# 1. 登录到注册表
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# 2. 拉取镜像
docker pull ghcr.io/openaero/openaero-web:latest

# 3. 使用 docker-compose 部署
export DOCKER_IMAGE=ghcr.io/openaero/openaero-web:latest
docker compose -f docker-compose.registry.yml up -d
```

### 3. 版本管理

#### 使用 Git SHA 作为标签

```bash
# 在 CI/CD 中自动生成
VERSION=$(git rev-parse --short HEAD)
docker build -t ghcr.io/openaero/openaero-web:${VERSION} .
docker push ghcr.io/openaero/openaero-web:${VERSION}
```

#### 使用语义化版本

```bash
VERSION=v1.0.0
docker build -t ghcr.io/openaero/openaero-web:${VERSION} .
docker push ghcr.io/openaero/openaero-web:${VERSION}
```

#### 回滚到之前的版本

```bash
# 切换到之前的版本
export VERSION=v0.9.0
./scripts/deploy-from-registry.sh
```

## CI/CD 集成

### GitHub Actions

已配置在 `.github/workflows/ci-cd-enhanced.yml` 中：

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    file: ./Dockerfile.production
    push: true
    tags: ghcr.io/${{ github.repository }}:latest
```

### 自动标签策略

- `latest`: 主分支的最新版本
- `main-<sha>`: 主分支的特定提交
- `develop-<sha>`: 开发分支的特定提交
- `v<version>`: 语义化版本标签

## 迁移步骤

### 从旧方式迁移

1. **设置注册表认证**:
   ```bash
   ./scripts/setup-registry-auth.sh ghcr.io your-username
   ```

2. **构建并推送第一个镜像**:
   ```bash
   ./scripts/build-and-push.sh
   ```

3. **更新服务器部署脚本**:
   ```bash
   # 在服务器上
   export DOCKER_IMAGE=ghcr.io/openaero/openaero-web:latest
   ./scripts/deploy-from-registry.sh
   ```

4. **验证部署**:
   ```bash
   curl http://your-domain/api/health
   ```

## 故障排除

### 认证问题

**错误**: `unauthorized: authentication required`

**解决**:
```bash
# 检查登录状态
docker info | grep Username

# 重新登录
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

### 拉取失败

**错误**: `pull access denied`

**解决**:
1. 检查镜像名称是否正确
2. 确认有读取权限
3. 检查 Token 是否有效

### 网络问题

**问题**: 拉取速度慢

**解决**:
- 使用镜像加速器（如阿里云、腾讯云）
- 或使用 Docker Hub 作为备选

## 最佳实践

1. **使用语义化版本**: 便于版本管理和回滚
2. **定期清理旧镜像**: 避免存储空间浪费
3. **启用镜像扫描**: 检查安全漏洞
4. **使用多阶段构建**: 减小镜像体积
5. **标签策略**: 使用明确的标签命名规则

## 相关文档

- [GitHub Container Registry 文档](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Hub 文档](https://docs.docker.com/docker-hub/)
- [CI/CD 流程文档](./CI_CD.md)
- [部署配置指南](./deployment-configuration.md)

---

**文档版本**: 1.0.0  
**最后更新**: 2025-01-XX  
**维护团队**: OpenAero 开发团队

