# 容器注册表部署测试计划

## 建议：先测试容器注册表部署流程

### 为什么先测试？

#### ✅ 优势

1. **验证基础功能**
   - 确保刚创建的脚本和配置能正常工作
   - 验证 GitHub Container Registry 集成
   - 检查认证和权限设置

2. **及早发现问题**
   - 如果基础流程有问题，蓝绿部署也会受影响
   - 在简单场景下更容易定位问题
   - 避免在复杂环境中调试

3. **建立信心**
   - 验证 CI/CD 流程能正常构建和推送镜像
   - 确保服务器能成功拉取和部署
   - 为后续蓝绿部署打好基础

4. **符合最佳实践**
   - "先验证再扩展"的原则
   - 渐进式改进，降低风险
   - 每一步都确保稳定

#### ⚠️ 如果先做蓝绿部署的风险

1. **复杂度叠加**
   - 如果容器注册表有问题，蓝绿部署也会失败
   - 难以区分是哪个环节的问题
   - 调试更困难

2. **时间浪费**
   - 如果基础功能有问题，蓝绿部署的工作可能白费
   - 需要回退和修复

## 测试计划

### 阶段 1：本地测试（30分钟）

#### 1.1 测试镜像构建和推送

```bash
# 1. 设置认证
./scripts/setup-registry-auth.sh ghcr.io your-github-username

# 2. 构建并推送镜像
DOCKER_REGISTRY=ghcr.io \
DOCKER_USERNAME=your-username \
VERSION=test-$(date +%Y%m%d-%H%M%S) \
./scripts/build-and-push.sh

# 3. 验证镜像已推送
docker pull ghcr.io/your-username/openaero-web:test-xxx
```

**验证点**:
- [ ] 镜像构建成功
- [ ] 镜像推送到注册表成功
- [ ] 镜像可以拉取

#### 1.2 测试部署脚本

```bash
# 在本地 Docker 环境中测试
export DOCKER_IMAGE=ghcr.io/your-username/openaero-web:test-xxx
export COMPOSE_FILE=docker-compose.registry.yml
./scripts/deploy-from-registry.sh
```

**验证点**:
- [ ] 脚本能正常执行
- [ ] 镜像拉取成功
- [ ] 服务启动成功
- [ ] 健康检查通过

### 阶段 2：CI/CD 测试（1小时）

#### 2.1 触发 GitHub Actions 构建

```bash
# 推送到 develop 分支触发构建
git checkout develop
git commit --allow-empty -m "test: trigger CI/CD build"
git push origin develop
```

**验证点**:
- [ ] GitHub Actions 工作流运行成功
- [ ] 镜像构建成功
- [ ] 镜像推送到注册表成功
- [ ] 标签正确（latest, branch-sha）

#### 2.2 检查镜像

```bash
# 在 GitHub 上检查
# 访问: https://github.com/your-org/openaero-web/pkgs/container/openaero-web

# 或使用命令行
docker pull ghcr.io/your-org/openaero-web:latest
```

### 阶段 3：服务器部署测试（1小时）

#### 3.1 在服务器上设置认证

```bash
# SSH 到服务器
ssh root@openaero.cn

# 设置认证
export GITHUB_TOKEN=your_token
echo $GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin
```

#### 3.2 测试部署

```bash
# 在服务器上
cd /opt/openaero

# 设置环境变量
export DOCKER_IMAGE=ghcr.io/your-org/openaero-web:latest
export COMPOSE_FILE=docker-compose.registry.yml

# 执行部署
./scripts/deploy-from-registry.sh
```

**验证点**:
- [ ] 镜像拉取成功
- [ ] 服务启动成功
- [ ] 健康检查通过
- [ ] 应用可以访问

#### 3.3 验证功能

```bash
# 检查服务状态
docker compose -f docker-compose.registry.yml ps

# 检查健康
curl http://localhost:3000/api/health

# 检查日志
docker compose -f docker-compose.registry.yml logs -f app
```

### 阶段 4：回滚测试（30分钟）

#### 4.1 测试版本切换

```bash
# 切换到之前的版本
export VERSION=main-abc1234  # 使用之前的 SHA
./scripts/deploy-from-registry.sh
```

**验证点**:
- [ ] 可以切换到指定版本
- [ ] 服务正常启动
- [ ] 功能正常

## 测试检查清单

### 基础功能
- [ ] 镜像构建成功
- [ ] 镜像推送到注册表成功
- [ ] 镜像可以从注册表拉取
- [ ] 部署脚本执行成功
- [ ] 服务启动成功
- [ ] 健康检查通过

### CI/CD 集成
- [ ] GitHub Actions 工作流运行成功
- [ ] 自动构建和推送镜像
- [ ] 标签策略正确
- [ ] 多平台构建成功（如果配置）

### 服务器部署
- [ ] 认证设置成功
- [ ] 镜像拉取成功
- [ ] 服务部署成功
- [ ] 应用可以访问
- [ ] 日志正常

### 版本管理
- [ ] 可以切换到指定版本
- [ ] 回滚功能正常
- [ ] 版本标签正确

## 预期问题及解决方案

### 问题 1：认证失败

**症状**: `unauthorized: authentication required`

**解决**:
```bash
# 检查 Token 是否有效
echo $GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin

# 检查权限
# Token 需要: read:packages, write:packages
```

### 问题 2：镜像拉取慢

**症状**: 拉取时间过长

**解决**:
- 使用镜像加速器
- 或考虑使用 Docker Hub 作为备选

### 问题 3：服务启动失败

**症状**: 容器启动后立即退出

**解决**:
```bash
# 查看日志
docker compose -f docker-compose.registry.yml logs app

# 检查环境变量
docker compose -f docker-compose.registry.yml config
```

## 测试时间估算

| 阶段 | 时间 | 说明 |
|------|------|------|
| 本地测试 | 30分钟 | 快速验证基础功能 |
| CI/CD 测试 | 1小时 | 等待构建完成 |
| 服务器部署 | 1小时 | 包括问题排查 |
| 回滚测试 | 30分钟 | 验证版本管理 |
| **总计** | **约 3 小时** | 包括问题排查时间 |

## 测试通过标准

✅ **可以继续蓝绿部署的条件**:
1. 所有基础功能测试通过
2. CI/CD 流程正常工作
3. 服务器部署成功
4. 回滚功能正常
5. 没有阻塞性问题

## 下一步

测试通过后，可以开始实施蓝绿部署：
1. 创建蓝绿部署脚本
2. 配置 Nginx 流量切换
3. 实现健康检查机制
4. 添加回滚功能

---

**建议**: 先完成这个测试计划，确保基础流程稳定后再进行蓝绿部署。

