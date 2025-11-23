# 改进的部署策略

## 一、当前问题总结

### 主要失败原因

1. **Next.js Standalone 模式的依赖问题**
   - Standalone 模式只复制直接依赖，遗漏嵌套依赖
   - 导致运行时找不到模块（如 `resolve`、`react-is`）

2. **构建时依赖缺失**
   - `autoprefixer`、`postcss`、`tailwindcss` 在 `devDependencies`
   - 构建时需要这些依赖，但可能没有被正确传递

3. **部署策略不当**
   - 在服务器上直接构建，而不是使用预构建镜像
   - 构建环境不一致，难以调试

4. **依赖管理混乱**
   - 缺失运行时依赖（如 `ws`）
   - 依赖分类不清晰

## 二、改进方案

### 2.1 修复 Dockerfile（已实施）

**改进点**：
1. ✅ 复制完整的 `node_modules` 作为后备
2. ✅ 复制所有必要的配置文件（`postcss.config.js`、`tailwind.config.js`）
3. ✅ 确保 Prisma 相关依赖完整复制
4. ✅ 添加缺失的依赖（`ws`）

### 2.2 新的部署流程

#### 方案 A：预构建镜像（推荐）

**流程**：
```
本地/CI → 构建 Docker 镜像 → 推送到 Registry → 服务器拉取镜像 → 启动容器
```

**优势**：
- ✅ 构建环境一致
- ✅ 部署速度快（只需拉取镜像）
- ✅ 可重复性强
- ✅ 易于回滚

**实施步骤**：

1. **本地构建并推送**：
```bash
# 构建镜像
docker build -f Dockerfile.production -t openaero-web:latest .

# 标记镜像（如果使用私有 Registry）
docker tag openaero-web:latest registry.example.com/openaero-web:latest

# 推送到 Registry
docker push registry.example.com/openaero-web:latest
```

2. **服务器部署**：
```bash
# 拉取最新镜像
docker pull registry.example.com/openaero-web:latest

# 更新 docker-compose.yml 使用镜像而不是构建
# 然后启动
docker compose -f docker-compose.supabase.yml up -d
```

3. **更新 docker-compose.supabase.yml**：
```yaml
services:
  app:
    # 使用镜像而不是构建
    image: registry.example.com/openaero-web:latest
    # 或者使用本地镜像
    # image: openaero-web:latest
    # build:  # 移除 build 配置
    #   context: .
    #   dockerfile: Dockerfile.production
    #   target: runner
```

#### 方案 B：优化服务器构建（临时方案）

如果暂时无法使用预构建镜像，优化服务器构建流程：

1. **使用 Docker BuildKit 缓存**：
```bash
DOCKER_BUILDKIT=1 docker compose -f docker-compose.supabase.yml build --build-arg BUILDKIT_INLINE_CACHE=1
```

2. **添加构建验证**：
```bash
# 构建后验证
docker compose -f docker-compose.supabase.yml exec app sh -c 'cd /app && node -e "require(\"autoprefixer\")"'
```

3. **使用构建缓存**：
```bash
# 第一次构建
docker compose -f docker-compose.supabase.yml build

# 后续构建（利用缓存）
docker compose -f docker-compose.supabase.yml build --cache-from openaero-app
```

### 2.3 CI/CD 集成（长期方案）

**GitHub Actions 工作流**：

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Docker Registry
        uses: docker/login-action@v3
        with:
          registry: registry.example.com
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.production
          push: true
          tags: registry.example.com/openaero-web:latest
          cache-from: type=registry,ref=registry.example.com/openaero-web:buildcache
          cache-to: type=registry,ref=registry.example.com/openaero-web:buildcache,mode=max
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/openaero
            docker pull registry.example.com/openaero-web:latest
            docker compose -f docker-compose.supabase.yml up -d
```

## 三、立即行动步骤

### 步骤 1：修复依赖（已完成）
- ✅ 添加 `ws` 到 `package.json`
- ✅ 更新 `Dockerfile.production`

### 步骤 2：测试本地构建
```bash
# 本地构建测试
docker build -f Dockerfile.production -t openaero-web:test .

# 运行测试
docker run -p 3000:3000 openaero-web:test
```

### 步骤 3：更新服务器部署
```bash
# 在服务器上
cd /opt/openaero
git pull
docker compose -f docker-compose.supabase.yml build --no-cache
docker compose -f docker-compose.supabase.yml up -d
```

### 步骤 4：验证部署
```bash
# 检查容器状态
docker compose -f docker-compose.supabase.yml ps

# 检查日志
docker compose -f docker-compose.supabase.yml logs app --tail 50

# 健康检查
curl http://localhost:3000/api/health
```

## 四、监控和调试

### 4.1 构建验证清单

- [ ] 构建成功，无错误
- [ ] `autoprefixer` 可访问
- [ ] `postcss.config.js` 存在
- [ ] `tailwind.config.js` 存在
- [ ] `node_modules` 完整
- [ ] Prisma 客户端生成成功
- [ ] 应用启动成功
- [ ] 健康检查通过

### 4.2 常见问题排查

**问题 1：找不到模块**
```bash
# 检查模块是否存在
docker compose exec app sh -c 'ls -la /app/node_modules/autoprefixer'

# 检查 Standalone 模式
docker compose exec app sh -c 'ls -la /app/.next/standalone/node_modules'
```

**问题 2：构建失败**
```bash
# 查看详细构建日志
docker compose build --progress=plain

# 进入构建容器调试
docker run -it --rm -v $(pwd):/app -w /app node:18-alpine sh
```

**问题 3：运行时错误**
```bash
# 查看应用日志
docker compose logs app -f

# 进入容器调试
docker compose exec app sh
```

## 五、性能优化

### 5.1 Docker 层缓存

**优化 Dockerfile**：
```dockerfile
# 先复制 package.json，利用缓存
COPY package.json package-lock.json ./
RUN npm ci

# 再复制源代码
COPY . .
RUN npm run build
```

### 5.2 多阶段构建优化

- 使用 `.dockerignore` 排除不必要的文件
- 最小化最终镜像体积
- 使用 Alpine 基础镜像

### 5.3 构建时间优化

- 使用 BuildKit 并行构建
- 使用 Registry 缓存
- 本地构建缓存

## 六、回滚策略

### 6.1 镜像版本管理

```bash
# 标记版本
docker tag openaero-web:latest openaero-web:v1.0.0

# 回滚到旧版本
docker compose -f docker-compose.supabase.yml up -d --image openaero-web:v1.0.0
```

### 6.2 代码回滚

```bash
# Git 回滚
git checkout <previous-commit>
docker compose -f docker-compose.supabase.yml build
docker compose -f docker-compose.supabase.yml up -d
```

## 七、下一步计划

1. **短期（本周）**：
   - ✅ 修复 Dockerfile
   - ✅ 添加缺失依赖
   - ✅ 测试构建和部署
   - ⏳ 设置预构建镜像流程

2. **中期（本月）**：
   - ⏳ 设置 CI/CD 自动构建
   - ⏳ 优化构建缓存
   - ⏳ 添加监控和告警

3. **长期（下个季度）**：
   - ⏳ 评估迁移到 Vercel/Netlify
   - ⏳ 或优化 Docker 部署架构
   - ⏳ 实施自动化测试和部署

