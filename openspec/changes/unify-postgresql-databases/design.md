# 统一PostgreSQL数据库配置 - 设计文档

## 架构决策

### 1. 数据库选型统一

**决策**: 所有环境统一使用PostgreSQL 15+

**理由**:
- **一致性**: 开发、测试、生产环境使用相同数据库类型
- **功能完整性**: PostgreSQL支持Json、Decimal等高级数据类型
- **性能优势**: 生产级数据库，支持复杂查询和事务
- **生态完善**: 丰富的工具链和监控支持

### 2. Schema管理策略

**决策**: 单一Schema文件管理

**实现方案**:
- 主Schema文件: `prisma/schema.prisma` (PostgreSQL专用)
- 删除兼容文件: `prisma/schema-postgres.prisma` (合并到主文件)
- 环境适配: 通过环境变量控制数据库连接

### 3. 环境配置策略

#### 开发环境
```env
DATABASE_URL="postgresql://openaero_user:password@localhost:5432/openaero_dev"
```

#### 测试环境  
```env
DATABASE_URL="postgresql://openaero_user:password@localhost:5432/openaero_test"
```

#### 生产环境
```env
DATABASE_URL="postgresql://username:password@prod-db:5432/openaero_prod"
```

## 技术实现细节

### 1. Schema文件重构

**当前问题**:
```prisma
// schema.prisma (SQLite)
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// 不支持的类型
model Solution {
  specs Json?    // SQLite不支持
  price Decimal  // SQLite不支持
}
```

**重构方案**:
```prisma
// schema.prisma (PostgreSQL)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 支持完整类型
model Solution {
  specs Json?    // PostgreSQL支持
  price Decimal  // PostgreSQL支持
}
```

### 2. 数据类型映射

| 数据类型 | SQLite处理 | PostgreSQL原生 | 优势 |
|---------|-----------|---------------|------|
| Json | String存储 | Json类型 | 查询性能提升 |
| Decimal | Float近似 | Decimal精确 | 财务计算准确 |
| Array | 逗号分隔 | Array类型 | 类型安全 |

### 3. 连接池配置优化

**开发环境配置**:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/openaero_dev?connection_limit=10&pool_timeout=10"
```

**生产环境配置**:
```env
DATABASE_URL="postgresql://user:pass@prod-db:5432/openaero_prod?connection_limit=50&pool_timeout=30"
```

## 部署架构

### 1. 本地开发环境

```yaml
# docker-compose.dev.yml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: openaero_dev
      POSTGRES_USER: openaero
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
```

### 2. 生产环境架构

```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: "openaero_prod"
        - name: POSTGRES_USER
          value: "openaero"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
```

## 数据迁移策略

### 1. 开发环境迁移

**步骤**:
1. 备份现有SQLite数据（如有重要数据）
2. 创建PostgreSQL数据库
3. 运行Prisma迁移
4. 重新生成测试数据

**优势**: 开发环境数据可重新生成，迁移风险低

### 2. 生产环境准备

**验证步骤**:
1. 在测试环境验证PostgreSQL配置
2. 性能基准测试
3. 数据一致性验证
4. 回滚方案测试

## 监控和运维

### 1. 健康检查

```typescript
// 数据库健康检查
const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error };
  }
};
```

### 2. 性能监控

**监控指标**:
- 连接池使用率
- 查询响应时间
- 事务成功率
- 数据库大小增长

## 安全考虑

### 1. 连接安全

- 生产环境启用SSL连接
- 使用强密码策略
- 定期轮换数据库凭据

### 2. 访问控制

- 最小权限原则
- 网络隔离
- 审计日志

## 兼容性保证

### 1. 向后兼容

- 保持现有API接口不变
- 数据类型映射透明
- 错误处理机制一致

### 2. 向前兼容

- 支持未来数据库版本升级
- 预留扩展字段
- 文档化迁移路径

## 验收标准

### 功能验收
- [ ] 开发环境PostgreSQL连接正常
- [ ] 所有CRUD操作功能正常
- [ ] 复杂查询性能达标
- [ ] 事务处理正确

### 性能验收  
- [ ] 查询响应时间 < 100ms (95%分位)
- [ ] 连接池使用率 < 80%
- [ ] 内存使用稳定

### 运维验收
- [ ] 监控指标可观测
- [ ] 备份恢复流程验证
- [ ] 故障切换测试通过

---

**设计确认**: CodeBuddy  
**审核状态**: 待审核  
**版本**: 1.0