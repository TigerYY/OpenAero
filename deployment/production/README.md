# OpenAero 生产环境部署指南

## 概述

本文档描述了如何将 OpenAero 应用部署到生产环境 `root@openaero.cn`。

## 部署方案

采用 Docker 容器化部署方案，具有以下优势：
- 环境隔离，部署简单
- 易于回滚和版本管理
- 资源占用可控
- 支持零停机更新

## 前置要求

### 服务器要求
- Ubuntu 20.04+ 或 CentOS 7+
- Docker 20.10+
- Docker Compose 2.0+
- Git 2.0+
- Nginx 1.18+

### 网络要求
- 域名：openaero.cn
- SSL证书：Let's Encrypt（已配置）
- 端口：80, 443, 3000

## 部署步骤

### 方法一：快速部署（推荐）

```bash
# 在本地执行
./deployment/production/quick-deploy.sh
```

### 方法二：手动部署

1. **上传部署脚本**
```bash
scp deployment/production/deploy.sh root@openaero.cn:/tmp/
```

2. **在服务器上执行部署**
```bash
ssh root@openaero.cn
chmod +x /tmp/deploy.sh
/tmp/deploy.sh latest
```

## 配置说明

### 环境变量

部署脚本会自动创建 `.env.production` 文件，包含以下配置：

- `NODE_ENV=production` - 生产环境标识
- `NEXTAUTH_URL=https://openaero.cn` - 应用URL
- `NEXTAUTH_SECRET` - 认证密钥（需要修改）
- `DATABASE_URL` - 数据库连接（需要修改）
- `PORT=3000` - 应用端口
- `DEFAULT_LOCALE=zh-CN` - 默认语言

### Nginx配置

部署脚本会自动更新 Nginx 配置，包括：
- SSL重定向
- 反向代理到应用
- 静态文件缓存
- 安全头设置
- 健康检查端点

## 部署后验证

### 1. 健康检查
```bash
curl https://openaero.cn/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2025-10-25T12:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "version": "1.0.0",
  "memory": {
    "used": 45,
    "total": 128
  }
}
```

### 2. 功能测试
- 访问首页：https://openaero.cn
- 测试语言切换
- 验证响应式设计
- 检查所有页面加载

### 3. 性能测试
```bash
# 使用curl测试响应时间
curl -w "@curl-format.txt" -o /dev/null -s https://openaero.cn

# curl-format.txt 内容：
#      time_namelookup:  %{time_namelookup}\n
#         time_connect:  %{time_connect}\n
#      time_appconnect:  %{time_appconnect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                      ----------\n
#           time_total:  %{time_total}\n
```

## 监控和维护

### 查看容器状态
```bash
docker ps | grep openaero
```

### 查看容器日志
```bash
docker logs openaero-web
```

### 重启应用
```bash
docker restart openaero-web
```

### 更新应用
```bash
# 重新运行部署脚本
/tmp/deploy.sh latest
```

## 故障排除

### 常见问题

1. **容器启动失败**
   - 检查环境变量配置
   - 查看容器日志：`docker logs openaero-web`
   - 验证端口是否被占用：`netstat -tlnp | grep 3000`

2. **Nginx配置错误**
   - 测试配置：`nginx -t`
   - 查看错误日志：`tail -f /var/log/nginx/error.log`

3. **健康检查失败**
   - 检查应用是否正常启动
   - 验证端口3000是否可访问
   - 查看应用日志

### 回滚操作

如果需要回滚到之前的版本：

```bash
# 停止当前容器
docker stop openaero-web
docker rm openaero-web

# 恢复备份
cd /opt/backup/openaero
tar -xzf backup-YYYYMMDD-HHMMSS.tar.gz -C /opt/openaero-web

# 启动旧版本
docker run -d --name openaero-web --restart unless-stopped -p 3000:3000 --env-file /opt/openaero-web/.env.production openaero-web:previous
```

## 安全注意事项

1. **环境变量安全**
   - 不要将敏感信息提交到代码仓库
   - 使用强密码和随机密钥
   - 定期轮换密钥

2. **网络安全**
   - 确保防火墙配置正确
   - 定期更新SSL证书
   - 监控异常访问

3. **数据安全**
   - 定期备份数据库
   - 加密敏感数据
   - 限制数据库访问权限

## 联系支持

如果在部署过程中遇到问题，请联系：
- 技术负责人：开发团队
- 服务器管理员：root@openaero.cn
- 项目仓库：https://github.com/TigerYY/OpenAero
