# 环境配置管理指南

## 概述

本项目使用集中化的环境配置管理系统，提供类型安全的环境变量访问和验证。

## 环境变量配置

### 配置文件位置

- **开发环境**: `.env.local` (本地开发，已添加到 `.gitignore`)
- **生产环境**: `.env.production` (生产环境，不应提交到 Git)
- **模板文件**: `env.example` (示例配置，应提交到 Git)

### 必需的环境变量

以下环境变量是应用运行所必需的：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 数据库配置
DATABASE_URL=postgresql://username:password@host:5432/database
```

### 可选的环境变量

```env
# Redis 配置（可选）
REDIS_URL=redis://localhost:6379

# 监控配置（可选）
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ORG=openaero
SENTRY_PROJECT=openaero-web

# 支付网关配置（可选）
ALIPAY_PUBLIC_KEY=your-alipay-public-key
WECHAT_PAY_KEY=your-wechat-pay-key

# 其他配置...
```

## 使用方法

### 在代码中使用环境变量

```typescript
import { env, getEnv } from '@/config/env';

// 方式 1: 使用 env 对象（推荐）
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const databaseUrl = env.DATABASE_URL;

// 方式 2: 使用 getEnv() 函数（运行时验证）
const envConfig = getEnv();
```

### 验证环境配置

```bash
# 验证环境变量配置
npm run config:validate

# 或使用 TypeScript 版本
npm run env:validate:ts
```

### 检查必需的环境变量

```typescript
import { checkRequiredEnvVars } from '@/config/env';

const { missing, present } = checkRequiredEnvVars();
if (missing.length > 0) {
  console.error('缺少必需的环境变量:', missing);
}
```

### 获取环境摘要（调试用）

```typescript
import { getEnvSummary } from '@/config/env';

const summary = getEnvSummary();
console.log('环境配置摘要:', summary);
```

## 环境配置验证

### 自动验证

环境配置会在以下场景自动验证：

1. **应用启动时**: 生产环境会进行严格验证
2. **构建时**: 开发环境允许部分缺失
3. **CI/CD 流程**: 通过 `npm run config:validate` 验证

### 验证规则

- **必需变量**: 在生产环境必须存在
- **格式验证**: URL、数字等类型会进行格式验证
- **默认值**: 部分变量提供默认值

## 不同环境的配置

### 开发环境

```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEBUG_ENV=true
NEXT_PUBLIC_LOG_LEVEL=debug
```

### 测试环境

```env
NODE_ENV=test
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_DEBUG_ENV=false
```

### 生产环境

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://openaero.cn
NEXT_PUBLIC_DEBUG_ENV=false
NEXT_PUBLIC_LOG_LEVEL=info
```

## 安全最佳实践

1. **不要提交敏感信息**: `.env.local` 和 `.env.production` 不应提交到 Git
2. **使用密钥管理服务**: 生产环境使用 AWS Secrets Manager、HashiCorp Vault 等
3. **定期轮换密钥**: 定期更新敏感密钥
4. **最小权限原则**: 只授予必要的权限
5. **环境隔离**: 不同环境使用不同的密钥和配置

## 故障排除

### 环境变量未设置

```bash
# 检查环境变量
npm run config:validate

# 查看环境摘要
node -e "require('./src/config/env').getEnvSummary()"
```

### 格式验证失败

检查环境变量的格式是否正确：
- URL 必须以 `http://` 或 `https://` 开头
- 数字类型必须是有效的数字
- 枚举类型必须匹配预定义的值

### 构建时环境变量缺失

在 Next.js 构建时，某些环境变量可能不可用。使用 `getEnvSafe()` 函数：

```typescript
import { getEnvSafe } from '@/config/env';

const env = getEnvSafe(); // 允许部分缺失
```

## 迁移指南

### 从直接使用 process.env 迁移

**之前:**
```typescript
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
```

**之后:**
```typescript
import { env } from '@/config/env';
const url = env.NEXT_PUBLIC_SUPABASE_URL;
```

### 添加新的环境变量

1. 在 `src/config/env.ts` 的 `envSchema` 中添加定义
2. 更新 `env.example` 文件
3. 更新本文档
4. 运行验证脚本确保配置正确

## 相关文档

- [部署配置指南](./deployment-configuration.md)
- [CI/CD 流程](./CI_CD.md)
- [架构评估](../ARCHITECTURE_ASSESSMENT.md)

---

**文档版本**: 1.0.0  
**最后更新**: 2025-01-XX  
**维护团队**: OpenAero 开发团队

