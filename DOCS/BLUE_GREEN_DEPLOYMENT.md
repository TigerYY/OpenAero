# 蓝绿部署方案分析

## 📋 当前部署架构分析

### 现状

- **部署方式**: PM2 单实例部署
- **应用端口**: 3000（单一端口）
- **反向代理**: Nginx 直接代理到 localhost:3000
- **切换方式**: 直接重启应用（有短暂停机）

### 是否支持蓝绿部署？

**❌ 当前架构不支持蓝绿部署**

**原因**:

1. **单实例运行**: 只有一个应用实例在运行
2. **单一端口**: 只监听 3000 端口
3. **直接切换**: 部署时需要停止旧版本，启动新版本
4. **无负载均衡**: Nginx 直接指向单一实例

---

## 🎯 蓝绿部署需求

### 什么是蓝绿部署？

蓝绿部署是一种零停机部署策略：

- **蓝环境（Blue）**: 当前生产环境（运行旧版本）
- **绿环境（Green）**: 新部署环境（运行新版本）
- **流量切换**: 通过负载均衡器在两个环境间切换
- **快速回退**: 如果新版本有问题，可以立即切回旧版本

### 优势

- ✅ **零停机时间**: 部署过程中服务不中断
- ✅ **快速回退**: 发现问题可以立即切回旧版本
- ✅ **安全部署**: 新版本完全启动后再切换流量
- ✅ **并行测试**: 可以在绿环境测试新版本

---

## 🚀 实现蓝绿部署的方案

### 方案 1：基于端口的蓝绿部署（推荐）

**架构设计**:

```
Nginx (负载均衡)
    ├── Blue 环境 (端口 3000) - 当前生产
    └── Green 环境 (端口 3001) - 新版本
```

**实现步骤**:

#### 1. 修改 Nginx 配置

创建新的 Nginx 配置 `/etc/nginx/sites-available/openaero`:

```nginx
# 上游服务器配置
upstream openaero_backend {
    # 默认指向蓝环境（当前生产）
    server localhost:3000 weight=1 max_fails=3 fail_timeout=30s;
    # 绿环境（部署时启用）
    # server localhost:3001 weight=0 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name openaero.cn;

    ssl_certificate /etc/letsencrypt/live/openaero.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/openaero.cn/privkey.pem;

    location / {
        proxy_pass http://openaero_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 2. 创建部署脚本

创建 `scripts/blue-green-deploy.sh`:

```bash
#!/bin/bash

# 蓝绿部署脚本
# 使用方法: ./scripts/blue-green-deploy.sh [blue|green]

set -e

CURRENT_ENV="${1:-blue}"
APP_DIR="/opt/openaero-web"
BLUE_PORT=3000
GREEN_PORT=3001
PM2_BLUE="openaero-web-blue"
PM2_GREEN="openaero-web-green"

echo "🚀 开始蓝绿部署..."

# 确定目标环境
if [ "$CURRENT_ENV" = "blue" ]; then
    TARGET_ENV="green"
    TARGET_PORT=$GREEN_PORT
    TARGET_PM2=$PM2_GREEN
    CURRENT_PORT=$BLUE_PORT
    CURRENT_PM2=$PM2_BLUE
else
    TARGET_ENV="blue"
    TARGET_PORT=$BLUE_PORT
    TARGET_PM2=$PM2_BLUE
    CURRENT_PORT=$GREEN_PORT
    CURRENT_PM2=$PM2_GREEN
fi

echo "当前环境: $CURRENT_ENV (端口 $CURRENT_PORT)"
echo "目标环境: $TARGET_ENV (端口 $TARGET_PORT)"

# 1. 部署到目标环境
echo "📦 部署到 $TARGET_ENV 环境..."
cd "$APP_DIR"

# 拉取最新代码
git pull origin 006-user-auth-system

# 安装依赖
npm ci --production

# 构建应用
npm run build

# 2. 启动目标环境
echo "🚀 启动 $TARGET_ENV 环境..."
pm2 start npm --name "$TARGET_PM2" -- start -- --port $TARGET_PORT
pm2 save

# 3. 等待目标环境就绪
echo "⏳ 等待 $TARGET_ENV 环境就绪..."
sleep 10

# 健康检查
for i in {1..30}; do
    if curl -f http://localhost:$TARGET_PORT/api/health > /dev/null 2>&1; then
        echo "✅ $TARGET_ENV 环境健康检查通过"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ $TARGET_ENV 环境健康检查失败"
        pm2 stop "$TARGET_PM2"
        exit 1
    fi
    sleep 2
done

# 4. 切换 Nginx 流量
echo "🔄 切换流量到 $TARGET_ENV 环境..."

# 更新 Nginx 配置
sed -i "s/server localhost:$CURRENT_PORT weight=1/server localhost:$CURRENT_PORT weight=0/" /etc/nginx/sites-available/openaero
sed -i "s/server localhost:$TARGET_PORT weight=0/server localhost:$TARGET_PORT weight=1/" /etc/nginx/sites-available/openaero

# 重载 Nginx
nginx -t && systemctl reload nginx

# 5. 等待流量切换完成
echo "⏳ 等待流量切换完成..."
sleep 5

# 6. 停止旧环境（可选，保留用于快速回退）
echo "⚠️  旧环境 ($CURRENT_ENV) 已停止接收流量，但保留运行以便快速回退"
echo "如需停止旧环境，运行: pm2 stop $CURRENT_PM2"

echo "✅ 蓝绿部署完成！"
echo "当前生产环境: $TARGET_ENV (端口 $TARGET_PORT)"
echo "查看日志: pm2 logs $TARGET_PM2"
```

#### 3. 快速回退脚本

创建 `scripts/blue-green-rollback.sh`:

```bash
#!/bin/bash

# 蓝绿部署回退脚本

set -e

APP_DIR="/opt/openaero-web"
BLUE_PORT=3000
GREEN_PORT=3001
PM2_BLUE="openaero-web-blue"
PM2_GREEN="openaero-web-green"

echo "🔄 开始回退..."

# 检查哪个环境正在接收流量
if grep -q "server localhost:$BLUE_PORT weight=1" /etc/nginx/sites-available/openaero; then
    CURRENT_ENV="blue"
    ROLLBACK_ENV="green"
    ROLLBACK_PORT=$GREEN_PORT
    ROLLBACK_PM2=$PM2_GREEN
elif grep -q "server localhost:$GREEN_PORT weight=1" /etc/nginx/sites-available/openaero; then
    CURRENT_ENV="green"
    ROLLBACK_ENV="blue"
    ROLLBACK_PORT=$BLUE_PORT
    ROLLBACK_PM2=$PM2_BLUE
else
    echo "❌ 无法确定当前环境"
    exit 1
fi

echo "当前环境: $CURRENT_ENV"
echo "回退到: $ROLLBACK_ENV"

# 检查回退环境是否运行
if ! pm2 list | grep -q "$ROLLBACK_PM2.*online"; then
    echo "❌ 回退环境 ($ROLLBACK_ENV) 未运行"
    exit 1
fi

# 切换流量
sed -i "s/server localhost:$BLUE_PORT weight=1/server localhost:$BLUE_PORT weight=0/" /etc/nginx/sites-available/openaero
sed -i "s/server localhost:$GREEN_PORT weight=1/server localhost:$GREEN_PORT weight=0/" /etc/nginx/sites-available/openaero
sed -i "s/server localhost:$ROLLBACK_PORT weight=0/server localhost:$ROLLBACK_PORT weight=1/" /etc/nginx/sites-available/openaero

# 重载 Nginx
nginx -t && systemctl reload nginx

echo "✅ 已回退到 $ROLLBACK_ENV 环境"
```

---

### 方案 2：基于目录的蓝绿部署

**架构设计**:

```
/opt/openaero-web-blue/  (蓝环境)
/opt/openaero-web-green/ (绿环境)
```

**实现方式**:

- 两个独立的应用目录
- 通过符号链接切换当前运行目录
- PM2 配置指向符号链接

---

### 方案 3：Docker 容器蓝绿部署

**架构设计**:

```
Nginx
    ├── openaero-blue:latest (蓝容器)
    └── openaero-green:latest (绿容器)
```

**优势**:

- 完全隔离的环境
- 更容易管理
- 支持容器编排（Docker Compose）

---

## 📊 方案对比

| 方案        | 复杂度 | 资源消耗        | 回退速度   | 推荐度     |
| ----------- | ------ | --------------- | ---------- | ---------- |
| 基于端口    | 低     | 中等（2个实例） | 快（秒级） | ⭐⭐⭐⭐⭐ |
| 基于目录    | 中     | 中等（2个目录） | 快（秒级） | ⭐⭐⭐⭐   |
| Docker 容器 | 高     | 高（2个容器）   | 快（秒级） | ⭐⭐⭐     |

---

## 🚀 推荐实施方案

### 推荐：方案 1 - 基于端口的蓝绿部署

**理由**:

1. ✅ 实现简单，改动最小
2. ✅ 资源消耗合理（只需额外端口）
3. ✅ 回退速度快（秒级切换）
4. ✅ 与现有 PM2 架构兼容

**实施步骤**:

1. **更新 Nginx 配置**

   ```bash
   # 在服务器上
   ssh root@openaero.cn
   # 备份现有配置
   cp /etc/nginx/sites-available/openaero /etc/nginx/sites-available/openaero.backup
   # 更新配置（使用上面的 Nginx 配置）
   nano /etc/nginx/sites-available/openaero
   nginx -t && systemctl reload nginx
   ```

2. **重命名现有 PM2 进程**

   ```bash
   pm2 stop openaero-web
   pm2 delete openaero-web
   pm2 start npm --name "openaero-web-blue" -- start
   pm2 save
   ```

3. **部署部署脚本**

   ```bash
   # 从本地上传脚本
   scp scripts/blue-green-deploy.sh root@openaero.cn:/opt/openaero-web/
   scp scripts/blue-green-rollback.sh root@openaero.cn:/opt/openaero-web/
   ssh root@openaero.cn "chmod +x /opt/openaero-web/*.sh"
   ```

4. **测试部署**
   ```bash
   ssh root@openaero.cn "cd /opt/openaero-web && ./blue-green-deploy.sh blue"
   ```

---

## ⚠️ 注意事项

### 1. 资源消耗

- 需要运行两个应用实例
- 内存使用量会增加（约 2 倍）
- 确保服务器有足够资源

### 2. 数据库连接

- 两个环境共享同一个数据库
- 确保数据库连接池配置合理
- 注意并发连接数限制

### 3. 环境变量

- 两个环境使用相同的环境变量文件
- 或分别为蓝绿环境创建独立的环境变量文件

### 4. 文件存储

- 如果应用有文件上传功能，需要共享存储
- 或使用外部存储服务（如 Supabase Storage）

### 5. 会话管理

- 确保会话存储在共享位置（数据库或 Redis）
- 避免切换环境时用户会话丢失

---

## 🔍 监控和验证

### 部署后验证

```bash
# 1. 检查两个环境是否都在运行
pm2 status

# 2. 检查端口监听
netstat -tulpn | grep -E "3000|3001"

# 3. 健康检查
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health

# 4. 检查 Nginx 配置
nginx -t
curl https://openaero.cn/api/health

# 5. 查看日志
pm2 logs openaero-web-blue
pm2 logs openaero-web-green
```

---

## 📝 部署检查清单

### 部署前

- [ ] 服务器资源充足（内存、CPU）
- [ ] Nginx 配置已更新
- [ ] 部署脚本已测试
- [ ] 回退脚本已准备
- [ ] 数据库连接池配置合理

### 部署中

- [ ] 新环境健康检查通过
- [ ] 流量切换成功
- [ ] 旧环境保留运行
- [ ] 监控新环境运行状态

### 部署后

- [ ] 新环境运行正常
- [ ] 无错误日志
- [ ] 性能指标正常
- [ ] 可以快速回退

---

## 🐳 Docker 蓝绿部署方案（新增）

### 方案 4：基于 Docker 容器的蓝绿部署（推荐用于 Docker 环境）

**架构设计**:

```
Nginx (容器)
    ├── Blue 容器 (openaero-app-blue:3000) - 当前生产
    └── Green 容器 (openaero-app-green:3001) - 新版本
```

**优势**:

- ✅ 完全隔离的环境
- ✅ 更容易管理（Docker Compose）
- ✅ 资源限制和监控
- ✅ 快速启动和停止
- ✅ 支持容器编排

**实施步骤**:

#### 1. 创建 Docker Compose 配置

已创建 `docker-compose.blue-green.yml`，包含：

- `app-blue`: Blue 环境容器（端口 3000）
- `app-green`: Green 环境容器（端口 3001）
- `nginx`: 负载均衡器

#### 2. 创建 Nginx 配置

已创建 `nginx/blue-green.conf`，包含：

- Upstream 配置（支持权重切换）
- SSL 配置
- 健康检查端点

#### 3. 部署脚本

**部署脚本**: `scripts/docker-blue-green-deploy.sh`

```bash
# 部署到 Green 环境
./scripts/docker-blue-green-deploy.sh blue latest

# 部署到 Blue 环境
./scripts/docker-blue-green-deploy.sh green latest
```

**回退脚本**: `scripts/docker-blue-green-rollback.sh`

```bash
# 快速回退
./scripts/docker-blue-green-rollback.sh
```

#### 4. 部署流程

```bash
# 1. 构建或拉取镜像
docker build -f Dockerfile.production -t openaero-web:latest .

# 2. 启动初始环境（Blue）
cd /opt/openaero-web
docker compose -f docker-compose.blue-green.yml up -d app-blue nginx

# 3. 部署新版本到 Green
./scripts/docker-blue-green-deploy.sh blue latest

# 4. 如果出现问题，快速回退
./scripts/docker-blue-green-rollback.sh
```

#### 5. 解决之前 Docker 部署失败的问题

**问题 1: Next.js Standalone 模式依赖问题**

- ✅ 已在 Dockerfile 中复制完整的 `node_modules` 作为后备
- ✅ 复制所有必要的配置文件

**问题 2: 构建时依赖缺失**

- ✅ 构建阶段安装所有依赖（包括 devDependencies）
- ✅ 确保 PostCSS 和 Tailwind 配置正确复制

**问题 3: 镜像构建不一致**

- ✅ 使用预构建镜像，不在服务器上构建
- ✅ 本地或 CI 构建镜像，推送到 Registry

---

## 🎯 总结

### 当前状态

- ❌ **PM2 方式不支持蓝绿部署**
- 单实例运行
- 部署时有短暂停机

### 改进方案对比

| 方案            | 复杂度 | 资源消耗 | 回退速度 | 推荐度         | 适用场景        |
| --------------- | ------ | -------- | -------- | -------------- | --------------- |
| 基于端口（PM2） | 低     | 中等     | 快       | ⭐⭐⭐⭐       | PM2 环境        |
| 基于目录（PM2） | 中     | 中等     | 快       | ⭐⭐⭐         | PM2 环境        |
| **Docker 容器** | **中** | **高**   | **快**   | **⭐⭐⭐⭐⭐** | **Docker 环境** |

### 推荐方案

**如果使用 Docker**:

- ✅ **方案 4（推荐）**: 基于 Docker 容器的蓝绿部署
- 完全隔离的环境
- 更容易管理
- 支持容器编排

**如果使用 PM2**:

- ✅ **方案 1**: 基于端口的蓝绿部署
- 实现简单，改动最小
- 零停机部署
- 快速回退

### 实施建议

1. 先在测试环境验证
2. 逐步迁移到生产环境
3. 建立监控和告警
4. 定期演练回退流程
5. 解决之前 Docker 部署失败的问题（已提供解决方案）

---

**最后更新**: 2025-01-23  
**维护者**: OpenAero 开发团队
