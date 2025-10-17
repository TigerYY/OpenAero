# 数据库设置指南

## 📋 概述

本指南将帮助您设置开元空御项目的数据库环境，包括PostgreSQL数据库配置、Prisma ORM设置和初始数据填充。

## 🛠️ 前置要求

- Node.js 18+ 
- PostgreSQL 12+
- npm 或 yarn

## 📦 安装步骤

### 1. 安装PostgreSQL

#### macOS (使用Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
下载并安装 [PostgreSQL官方安装包](https://www.postgresql.org/download/windows/)

### 2. 创建数据库

```bash
# 连接到PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE openaero_dev;
CREATE DATABASE openaero_test;

# 创建用户（可选）
CREATE USER openaero_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE openaero_dev TO openaero_user;
GRANT ALL PRIVILEGES ON DATABASE openaero_test TO openaero_user;

# 退出
\q
```

### 3. 配置环境变量

复制环境变量示例文件：
```bash
cp env.example .env.local
```

编辑 `.env.local` 文件，更新数据库连接信息：
```env
# 数据库配置
DATABASE_URL="postgresql://openaero_user:your_password@localhost:5432/openaero_dev?schema=public"

# 测试数据库
DATABASE_URL_TEST="postgresql://openaero_user:your_password@localhost:5432/openaero_test?schema=public"
```

### 4. 运行数据库迁移

```bash
# 生成Prisma客户端
npm run db:generate

# 推送数据库模式
npm run db:push

# 或者运行迁移（推荐用于生产环境）
npm run db:migrate
```

### 5. 填充初始数据

```bash
# 运行数据库初始化脚本
npm run db:init
```

### 6. 验证数据库设置

```bash
# 测试数据库连接
node scripts/test-db.js
```

## 🔧 可用脚本

| 脚本 | 描述 |
|------|------|
| `npm run db:generate` | 生成Prisma客户端 |
| `npm run db:push` | 推送数据库模式（开发环境） |
| `npm run db:migrate` | 运行数据库迁移（生产环境） |
| `npm run db:studio` | 打开Prisma Studio（数据库管理界面） |
| `npm run db:init` | 初始化数据库并填充示例数据 |
| `npm run db:reset` | 重置数据库并重新初始化 |
| `npm run db:seed` | 仅填充示例数据 |

## 📊 数据库结构

### 主要表

- **users** - 用户表
- **creator_profiles** - 创作者档案表
- **solutions** - 解决方案表
- **categories** - 分类表
- **tags** - 标签表
- **reviews** - 评价表
- **orders** - 订单表
- **order_items** - 订单项表

### 关系

- 用户 → 创作者档案 (1:1)
- 创作者档案 → 解决方案 (1:N)
- 分类 → 解决方案 (1:N)
- 解决方案 → 标签 (N:N)
- 解决方案 → 评价 (1:N)
- 用户 → 订单 (1:N)
- 订单 → 订单项 (1:N)

## 🚀 生产环境配置

### 1. 环境变量

```env
# 生产数据库
DATABASE_URL="postgresql://username:password@host:5432/openaero_prod?schema=public"

# SSL配置（如果使用云数据库）
DATABASE_URL="postgresql://username:password@host:5432/openaero_prod?schema=public&sslmode=require"
```

### 2. 数据库迁移

```bash
# 生产环境迁移
NODE_ENV=production npm run db:migrate
```

### 3. 备份策略

```bash
# 创建备份
pg_dump -U username -h host openaero_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复备份
psql -U username -h host openaero_prod < backup_file.sql
```

## 🔍 故障排除

### 常见问题

1. **连接被拒绝**
   ```
   Error: connect ECONNREFUSED
   ```
   - 检查PostgreSQL服务是否运行
   - 验证端口5432是否开放
   - 检查防火墙设置

2. **认证失败**
   ```
   Error: password authentication failed
   ```
   - 验证用户名和密码
   - 检查pg_hba.conf配置
   - 确认用户权限

3. **数据库不存在**
   ```
   Error: database "openaero_dev" does not exist
   ```
   - 创建数据库：`CREATE DATABASE openaero_dev;`
   - 检查数据库名称拼写

4. **权限不足**
   ```
   Error: permission denied for table
   ```
   - 授予用户权限：`GRANT ALL PRIVILEGES ON DATABASE openaero_dev TO username;`
   - 检查表级权限

### 调试命令

```bash
# 检查PostgreSQL状态
brew services list | grep postgresql

# 查看PostgreSQL日志
tail -f /usr/local/var/log/postgres.log

# 测试连接
psql -U username -h localhost -d openaero_dev

# 查看数据库列表
psql -U username -c "\l"

# 查看表结构
psql -U username -d openaero_dev -c "\dt"
```

## 📈 性能优化

### 1. 索引优化

```sql
-- 为常用查询字段添加索引
CREATE INDEX idx_solutions_status ON solutions(status);
CREATE INDEX idx_solutions_category_id ON solutions(category_id);
CREATE INDEX idx_solutions_price ON solutions(price);
CREATE INDEX idx_solutions_created_at ON solutions(created_at);
```

### 2. 连接池配置

```env
# 在DATABASE_URL中添加连接池参数
DATABASE_URL="postgresql://username:password@host:5432/openaero_dev?schema=public&connection_limit=20&pool_timeout=20"
```

### 3. 查询优化

- 使用Prisma的`select`和`include`优化查询
- 避免N+1查询问题
- 使用分页限制结果集大小

## 🔒 安全建议

1. **使用强密码**
2. **限制数据库访问IP**
3. **启用SSL连接**
4. **定期更新密码**
5. **监控数据库访问日志**
6. **备份敏感数据**

## 📞 支持

如果遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查PostgreSQL和Prisma官方文档
3. 在项目Issues中报告问题
4. 联系技术支持：support@openaero.cn

---

**最后更新**: 2025年1月27日  
**版本**: v1.0
