# 部署准备完成 ✅

## 已完成的工作

### 1. ✅ 服务器清理
- 清理了所有旧容器、镜像和卷
- 释放了 **8.2GB** 空间**
- 清理了构建缓存（3.5GB）

### 2. ✅ 配置文件更新
- 创建了 `docker-compose.supabase.yml`（使用预构建镜像）
- 更新了 `Dockerfile.production`（修复依赖问题）
- 添加了缺失的依赖（`ws` 模块）
- 传输了部署脚本到服务器

### 3. ✅ 部署脚本准备
- `scripts/build-save-transfer.sh` - 本地构建并传输镜像
- `scripts/deploy-with-image.sh` - 服务器端部署脚本
- `scripts/cleanup-server.sh` - 服务器清理脚本

## 下一步操作

### 方式 1：使用自动化脚本（推荐）

**前提**：确保本地 Docker 正在运行

```bash
# 1. 启动 Docker Desktop（如果使用 macOS/Windows）
# 或确保 Docker daemon 运行（Linux）

# 2. 在项目根目录执行
./scripts/build-save-transfer.sh
```

这个脚本会自动：
1. 构建 Docker 镜像
2. 保存为压缩的 tar 文件
3. 传输到服务器
4. 在服务器上加载镜像

**然后**在服务器上部署：

```bash
ssh root@openaero.cn "cd /opt/openaero && bash scripts/deploy-with-image.sh"
```

### 方式 2：手动步骤

#### 步骤 1：本地构建镜像

```bash
# 确保 Docker 运行
docker info

# 构建镜像
docker build -f Dockerfile.production -t openaero-web:latest .
```

#### 步骤 2：保存并传输镜像

```bash
# 保存镜像
docker save openaero-web:latest | gzip > openaero-web-latest.tar.gz

# 传输到服务器
scp openaero-web-latest.tar.gz root@openaero.cn:/opt/openaero/
```

#### 步骤 3：在服务器上加载并部署

```bash
# SSH 到服务器
ssh root@openaero.cn

# 加载镜像
cd /opt/openaero
docker load -i openaero-web-latest.tar.gz

# 部署
bash scripts/deploy-with-image.sh
```

## 验证部署

部署完成后，验证服务：

```bash
# 检查容器状态
ssh root@openaero.cn "cd /opt/openaero && docker compose -f docker-compose.supabase.yml ps"

# 检查应用健康
curl http://openaero.cn/api/health

# 检查网站
curl -I https://openaero.cn
```

## 当前服务器状态

- ✅ Docker 空间已清理（释放 8.2GB）
- ✅ 配置文件已更新
- ✅ 部署脚本已就绪
- ⏳ 等待本地构建镜像

## 注意事项

1. **Docker 必须运行**：构建前确保本地 Docker daemon 运行
2. **网络连接**：确保可以 SSH 连接到服务器
3. **磁盘空间**：镜像文件约 400-500MB（压缩后）
4. **构建时间**：首次构建可能需要 5-10 分钟

## 故障排查

如果遇到问题，请查看：
- `DOCS/DEPLOYMENT_STEPS.md` - 详细部署步骤
- `DOCS/DEPLOYMENT_FAILURE_ANALYSIS.md` - 问题分析
- `DOCS/IMPROVED_DEPLOYMENT_STRATEGY.md` - 改进策略

## 快速命令参考

```bash
# 本地构建并传输
./scripts/build-save-transfer.sh

# 服务器部署
ssh root@openaero.cn "cd /opt/openaero && bash scripts/deploy-with-image.sh"

# 查看日志
ssh root@openaero.cn "cd /opt/openaero && docker compose -f docker-compose.supabase.yml logs -f app"

# 重启服务
ssh root@openaero.cn "cd /opt/openaero && docker compose -f docker-compose.supabase.yml restart app"
```

