# 预构建镜像部署步骤

## 概述

采用本地构建镜像 → 传输到服务器 → 服务器加载镜像的方式部署，避免在服务器上构建，提高部署速度和可靠性。

## 前提条件

1. ✅ 本地 Docker 已安装并运行
2. ✅ 服务器 SSH 访问已配置
3. ✅ 服务器 Docker 已安装
4. ✅ 服务器空间已清理（已完成，释放了 8.2GB）

## 部署步骤

### 方法 1：使用自动化脚本（推荐）

```bash
# 在本地项目根目录执行
./scripts/build-save-transfer.sh
```

这个脚本会：
1. 构建 Docker 镜像
2. 保存为 tar.gz 文件
3. 传输到服务器
4. 在服务器上加载镜像

### 方法 2：手动步骤

#### 步骤 1：本地构建镜像

```bash
# 在项目根目录
docker build -f Dockerfile.production -t openaero-web:latest .
```

#### 步骤 2：保存镜像为 tar 文件

```bash
# 保存镜像
docker save openaero-web:latest -o openaero-web-latest.tar

# 压缩（可选，但推荐）
gzip openaero-web-latest.tar
```

#### 步骤 3：传输到服务器

```bash
# 传输压缩后的镜像文件
scp openaero-web-latest.tar.gz root@openaero.cn:/opt/openaero/
```

#### 步骤 4：在服务器上加载镜像

```bash
# SSH 到服务器
ssh root@openaero.cn

# 进入项目目录
cd /opt/openaero

# 加载镜像
docker load -i openaero-web-latest.tar.gz

# 验证镜像
docker images openaero-web
```

#### 步骤 5：部署服务

```bash
# 在服务器上执行
cd /opt/openaero
bash scripts/deploy-with-image.sh
```

或者手动执行：

```bash
# 停止现有服务
docker compose -f docker-compose.supabase.yml down

# 启动服务
docker compose -f docker-compose.supabase.yml up -d

# 检查状态
docker compose -f docker-compose.supabase.yml ps

# 查看日志
docker compose -f docker-compose.supabase.yml logs -f app
```

## 验证部署

### 1. 检查容器状态

```bash
ssh root@openaero.cn "cd /opt/openaero && docker compose -f docker-compose.supabase.yml ps"
```

所有服务应该显示为 `Up` 和 `healthy`。

### 2. 检查应用健康

```bash
curl http://openaero.cn/api/health
```

### 3. 检查网站

```bash
curl -I https://openaero.cn
```

## 回滚

如果需要回滚到之前的版本：

```bash
# 在服务器上
cd /opt/openaero

# 停止当前服务
docker compose -f docker-compose.supabase.yml down

# 加载旧版本镜像（如果有保存）
docker load -i openaero-web-previous.tar.gz

# 更新 docker-compose.supabase.yml 中的镜像标签
# 然后重新启动
docker compose -f docker-compose.supabase.yml up -d
```

## 故障排查

### 问题 1：构建失败

**检查**：
- Docker daemon 是否运行：`docker info`
- 磁盘空间是否足够：`df -h`
- 查看构建日志：`docker build` 的输出

**解决**：
- 清理 Docker 缓存：`docker system prune -a`
- 检查 Dockerfile 语法
- 确保所有依赖都在 package.json 中

### 问题 2：镜像传输失败

**检查**：
- 网络连接：`ping openaero.cn`
- SSH 连接：`ssh root@openaero.cn`
- 服务器磁盘空间：`ssh root@openaero.cn 'df -h'`

**解决**：
- 检查网络连接
- 确保服务器有足够空间
- 可以分块传输大文件

### 问题 3：镜像加载失败

**检查**：
- 镜像文件是否完整：`ls -lh openaero-web-latest.tar.gz`
- Docker 是否运行：`docker info`

**解决**：
- 重新传输镜像文件
- 检查文件权限
- 确保 Docker 服务运行

### 问题 4：服务启动失败

**检查**：
- 查看日志：`docker compose -f docker-compose.supabase.yml logs app`
- 检查环境变量：`docker compose -f docker-compose.supabase.yml config`
- 检查端口占用：`netstat -tulpn | grep 3000`

**解决**：
- 检查 `.env.production` 配置
- 确保端口未被占用
- 检查网络配置

## 优化建议

### 1. 使用 Docker Registry（长期方案）

如果频繁部署，建议使用 Docker Hub 或其他 Registry：

```bash
# 登录 Docker Hub
docker login

# 标记镜像
docker tag openaero-web:latest your-username/openaero-web:latest

# 推送镜像
docker push your-username/openaero-web:latest

# 在服务器上拉取
docker pull your-username/openaero-web:latest
```

### 2. 使用 CI/CD

设置 GitHub Actions 自动构建和部署：

- 代码推送到 main 分支时自动构建
- 构建成功后自动推送到 Registry
- 自动部署到服务器

### 3. 镜像版本管理

为每个版本打标签：

```bash
# 构建时指定版本
docker build -t openaero-web:v1.0.0 -t openaero-web:latest .

# 保存时包含版本信息
docker save openaero-web:v1.0.0 -o openaero-web-v1.0.0.tar.gz
```

## 性能对比

| 方式 | 构建时间 | 部署时间 | 可靠性 |
|------|---------|---------|--------|
| 服务器构建 | 10-15 分钟 | 15-20 分钟 | 低 |
| 预构建镜像 | 5-8 分钟 | 2-3 分钟 | 高 |

**优势**：
- ✅ 构建环境一致
- ✅ 部署速度快
- ✅ 可重复性强
- ✅ 易于调试
- ✅ 支持版本管理

