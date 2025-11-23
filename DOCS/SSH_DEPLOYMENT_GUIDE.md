# SSH 部署指南

## 关于 Docker 拉取错误

如果看到类似错误：
```
Error response from daemon: Get "https://ghcr.io/v2/..."
```

这通常表示：

### 1. 网络连接问题
- **原因**: 无法访问 GitHub Container Registry
- **解决**: 检查网络连接，确保可以访问 `ghcr.io`

### 2. 认证问题
- **原因**: GitHub Token 过期或无效
- **解决**: 重新登录或更新 Token

### 3. 平台不匹配（本地测试）
- **原因**: 本地是 ARM64 (Mac M1/M2)，镜像可能是 AMD64
- **解决**: 这是正常的，在 Linux 服务器上可以正常拉取

## 通过 SSH 在服务器上部署

### 方法 1: 使用自动化脚本（推荐）

```bash
# 设置 GitHub Token
export GITHUB_TOKEN=your_token

# 执行部署脚本
./scripts/deploy-via-ssh.sh root@openaero.cn test-20251123
```

### 方法 2: 手动 SSH 部署

```bash
# 1. SSH 到服务器
ssh root@openaero.cn

# 2. 登录 GitHub Container Registry
export GITHUB_TOKEN=your_token
echo $GITHUB_TOKEN | docker login ghcr.io -u TigerYY --password-stdin

# 3. 拉取镜像
docker pull ghcr.io/tigeryy/openaero-web:test-20251123

# 4. 进入部署目录
cd /opt/openaero

# 5. 设置环境变量
export DOCKER_IMAGE=ghcr.io/tigeryy/openaero-web:test-20251123
export COMPOSE_FILE=docker-compose.registry.yml

# 6. 停止旧容器
docker compose -f docker-compose.registry.yml down || \
docker stop openaero-web && docker rm openaero-web

# 7. 启动新容器
docker compose -f docker-compose.registry.yml up -d || \
docker run -d \
  --name openaero-web \
  -p 3000:3000 \
  --restart unless-stopped \
  $DOCKER_IMAGE

# 8. 检查状态
docker ps | grep openaero-web
docker logs openaero-web --tail 50
```

### 方法 3: 使用部署脚本（如果已在服务器上）

```bash
# SSH 到服务器
ssh root@openaero.cn

# 进入项目目录
cd /opt/openaero

# 设置环境变量
export GITHUB_TOKEN=your_token
export DOCKER_IMAGE=ghcr.io/tigeryy/openaero-web:test-20251123
export COMPOSE_FILE=docker-compose.registry.yml

# 执行部署脚本
./scripts/deploy-from-registry.sh
```

## 故障排查

### 错误: "no matching manifest for linux/arm64/v8"

**原因**: 平台不匹配（本地 Mac ARM64 vs 服务器 Linux AMD64）

**解决**: 
- 这是正常的，在服务器上可以正常拉取
- 如果需要在本地测试，使用 `--platform linux/amd64`:
  ```bash
  docker pull --platform linux/amd64 ghcr.io/tigeryy/openaero-web:test-20251123
  ```

### 错误: "unauthorized: authentication required"

**原因**: GitHub Token 无效或过期

**解决**:
```bash
# 重新登录
export GITHUB_TOKEN=new_token
echo $GITHUB_TOKEN | docker login ghcr.io -u TigerYY --password-stdin
```

### 错误: "Get https://ghcr.io/v2/: net/http: TLS handshake timeout"

**原因**: 网络连接问题

**解决**:
1. 检查网络连接
2. 检查防火墙设置
3. 尝试使用代理（如果需要）

### 错误: "pull access denied"

**原因**: 镜像不存在或没有访问权限

**解决**:
1. 确认镜像名称正确
2. 确认 Token 有访问权限
3. 检查镜像是否已推送:
   ```bash
   curl -H "Authorization: Bearer $GITHUB_TOKEN" \
     https://ghcr.io/v2/tigeryy/openaero-web/tags/list
   ```

## 验证部署

### 检查容器状态

```bash
# 在服务器上
docker ps | grep openaero-web
docker logs openaero-web --tail 50
```

### 健康检查

```bash
# 在服务器上
curl http://localhost:3000/api/health

# 或从外部
curl http://openaero.cn/api/health
```

### 查看镜像信息

```bash
docker images | grep openaero-web
docker inspect ghcr.io/tigeryy/openaero-web:test-20251123
```

## 快速命令参考

```bash
# 登录
echo $GITHUB_TOKEN | docker login ghcr.io -u TigerYY --password-stdin

# 拉取
docker pull ghcr.io/tigeryy/openaero-web:test-20251123

# 运行
docker run -d --name openaero-web -p 3000:3000 \
  ghcr.io/tigeryy/openaero-web:test-20251123

# 查看日志
docker logs -f openaero-web

# 停止
docker stop openaero-web
docker rm openaero-web
```

## 安全建议

1. **不要在脚本中硬编码 Token**
   - 使用环境变量
   - 使用 SSH 密钥认证

2. **使用 SSH 密钥认证**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ssh-copy-id root@openaero.cn
   ```

3. **限制 Token 权限**
   - 只授予必要的权限
   - 定期轮换 Token

4. **使用 Docker Secrets** (生产环境)
   ```bash
   echo $GITHUB_TOKEN | docker secret create github_token -
   ```

---

**最后更新**: 2025-01-23

