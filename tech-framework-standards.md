# OpenAero 技术框架与开发规范

## 文档版本: 1.0
创建日期: 2025年1月27日
状态: 供团队评审

---

## 1. 项目概述

### 1.1 技术框架目标
- **可扩展性**: 支持从MVP到大型生态平台的平滑演进
- **可维护性**: 代码结构清晰，便于团队协作和长期维护
- **高性能**: 支持高并发访问和大量数据处理
- **安全性**: 保护用户数据和平台安全
- **国际化**: 支持多语言和多地区部署

### 1.2 开发规范目标
- **代码质量**: 统一的代码风格和最佳实践
- **团队协作**: 清晰的开发流程和职责分工
- **持续集成**: 自动化测试和部署流程
- **文档完善**: 完整的技术文档和API文档

## 2. 技术架构设计

### 2.1 整体架构原则

#### 2.1.1 分层架构
```
┌─────────────────────────────────────────┐
│                表现层 (Presentation)     │
│  Next.js Frontend + Mobile App (Future) │
├─────────────────────────────────────────┤
│                业务层 (Business)         │
│     API Gateway + Microservices        │
├─────────────────────────────────────────┤
│                数据层 (Data)             │
│    PostgreSQL + Redis + File Storage   │
├─────────────────────────────────────────┤
│                基础设施 (Infrastructure) │
│    Vercel + AWS + Monitoring + CI/CD   │
└─────────────────────────────────────────┘
```

#### 2.1.2 微服务架构演进路径
```
阶段1 (MVP): 单体应用
├── Next.js Full-Stack App
├── Supabase (Database + Auth + Storage)
└── Vercel (Deployment)

阶段2 (Growth): 服务分离
├── Frontend (Next.js)
├── API Gateway (Next.js API Routes)
├── User Service (Supabase + Custom Logic)
├── Product Service (Supabase + Custom Logic)
└── Notification Service (External)

阶段3 (Scale): 微服务架构
├── Frontend (Next.js)
├── API Gateway (Kong/AWS API Gateway)
├── User Service (Node.js + PostgreSQL)
├── Product Service (Node.js + PostgreSQL)
├── Creator Service (Node.js + PostgreSQL)
├── Payment Service (Node.js + PostgreSQL)
├── Notification Service (Node.js + Redis)
├── File Service (Node.js + AWS S3)
└── Analytics Service (Node.js + ClickHouse)
```

### 2.2 技术栈选择

#### 2.2.1 前端技术栈
```typescript
// 核心框架
- Next.js 14+ (App Router)
- React 18+ (Concurrent Features)
- TypeScript 5+

// UI框架
- Tailwind CSS 3+
- Headless UI (Accessibility)
- Framer Motion (Animations)
- Radix UI (Advanced Components)

// 状态管理
- Zustand (Global State)
- TanStack Query (Server State)
- React Hook Form (Form State)

// 开发工具
- ESLint + Prettier (Code Quality)
- Husky + Lint-staged (Git Hooks)
- Storybook (Component Development)
- Playwright (E2E Testing)
```

#### 2.2.2 后端技术栈
```typescript
// 核心框架
- Node.js 18+ (LTS)
- Next.js API Routes (初期)
- Express.js (微服务阶段)

// 数据库
- PostgreSQL 15+ (主数据库)
- Redis 7+ (缓存 + 会话)
- Prisma (ORM)

// 认证授权
- NextAuth.js (初期)
- Supabase Auth (初期)
- Custom JWT (微服务阶段)

// 文件存储
- AWS S3 (生产环境)
- Cloudflare R2 (备选)
- Supabase Storage (初期)
```

#### 2.2.3 基础设施
```yaml
# 部署平台
- Vercel (Frontend + API)
- AWS (Backend Services)
- Cloudflare (CDN + Security)

# 监控运维
- Vercel Analytics (性能监控)
- Sentry (错误监控)
- DataDog (基础设施监控)
- LogRocket (用户行为分析)

# CI/CD
- GitHub Actions (自动化)
- Docker (容器化)
- Kubernetes (微服务编排)
```

## 3. 项目结构规范

### 3.1 目录结构
```
openaero.web/
├── .github/                    # GitHub配置
│   ├── workflows/             # CI/CD流程
│   ├── ISSUE_TEMPLATE/        # Issue模板
│   └── PULL_REQUEST_TEMPLATE/ # PR模板
├── .vscode/                   # VSCode配置
├── docs/                      # 项目文档
│   ├── api/                   # API文档
│   ├── architecture/          # 架构文档
│   ├── deployment/            # 部署文档
│   └── development/           # 开发文档
├── src/                       # 源代码
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/           # 认证相关页面
│   │   ├── (dashboard)/      # 仪表盘页面
│   │   ├── (marketing)/      # 营销页面
│   │   ├── api/              # API路由
│   │   ├── globals.css       # 全局样式
│   │   └── layout.tsx        # 根布局
│   ├── components/            # 组件库
│   │   ├── ui/               # 基础UI组件
│   │   ├── layout/           # 布局组件
│   │   ├── business/         # 业务组件
│   │   └── forms/            # 表单组件
│   ├── lib/                  # 工具库
│   │   ├── auth.ts           # 认证工具
│   │   ├── db.ts             # 数据库连接
│   │   ├── utils.ts          # 通用工具
│   │   ├── validations.ts    # 数据验证
│   │   └── constants.ts      # 常量定义
│   ├── hooks/                # 自定义Hooks
│   ├── stores/               # 状态管理
│   ├── types/                # TypeScript类型
│   └── styles/               # 样式文件
├── prisma/                   # 数据库模式
├── public/                   # 静态资源
├── tests/                    # 测试文件
│   ├── unit/                 # 单元测试
│   ├── integration/          # 集成测试
│   └── e2e/                  # 端到端测试
├── scripts/                  # 脚本文件
├── .env.example              # 环境变量示例
├── .gitignore               # Git忽略文件
├── .eslintrc.json           # ESLint配置
├── .prettierrc              # Prettier配置
├── next.config.js           # Next.js配置
├── tailwind.config.js       # Tailwind配置
├── tsconfig.json            # TypeScript配置
├── package.json             # 依赖管理
└── README.md                # 项目说明
```

### 3.2 命名规范

#### 3.2.1 文件命名
```typescript
// 组件文件：PascalCase
Button.tsx
ProductCard.tsx
UserProfile.tsx

// 页面文件：kebab-case
page.tsx
about-us/page.tsx
solutions/[slug]/page.tsx

// 工具文件：camelCase
authUtils.ts
dataValidation.ts
apiClient.ts

// 常量文件：UPPER_SNAKE_CASE
API_ENDPOINTS.ts
ERROR_MESSAGES.ts
CONFIG_CONSTANTS.ts
```

#### 3.2.2 变量命名
```typescript
// 变量：camelCase
const userName = 'john_doe'
const productList = []
const isAuthenticated = true

// 常量：UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.openaero.cn'
const MAX_RETRY_ATTEMPTS = 3

// 函数：camelCase
const getUserById = (id: string) => {}
const validateEmail = (email: string) => {}

// 类：PascalCase
class UserService {}
class ProductRepository {}

// 接口：PascalCase + I前缀
interface IUser {}
interface IProductData {}
```

## 4. 代码规范

### 4.1 TypeScript规范

#### 4.1.1 类型定义
```typescript
// 基础类型定义
interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

// 枚举定义
enum UserRole {
  ADMIN = 'admin',
  CREATOR = 'creator',
  CUSTOMER = 'customer'
}

// 联合类型
type ProductStatus = 'draft' | 'pending' | 'approved' | 'rejected'

// 泛型接口
interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

// 工具类型
type CreateUserRequest = Omit<User, 'id' | 'createdAt' | 'updatedAt'>
type UpdateUserRequest = Partial<Pick<User, 'name' | 'email'>>
```

#### 4.1.2 函数定义
```typescript
// 函数重载
function getUser(id: string): Promise<User>
function getUser(email: string): Promise<User>
function getUser(identifier: string): Promise<User> {
  // 实现
}

// 异步函数
async function fetchUserData(id: string): Promise<ApiResponse<User>> {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch user')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching user:', error)
    throw error
  }
}

// 高阶函数
const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args)
    } catch (error) {
      console.error('Function error:', error)
      return null
    }
  }
}
```

### 4.2 React组件规范

#### 4.2.1 组件结构
```typescript
// 组件文件结构
import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

// 类型定义
interface ProductCardProps {
  product: Product
  onEdit?: (product: Product) => void
  onDelete?: (productId: string) => void
  className?: string
}

// 组件实现
export function ProductCard({
  product,
  onEdit,
  onDelete,
  className
}: ProductCardProps) {
  // Hooks
  const [isLoading, setIsLoading] = useState(false)
  
  // 事件处理
  const handleEdit = useCallback(() => {
    onEdit?.(product)
  }, [product, onEdit])
  
  const handleDelete = useCallback(async () => {
    setIsLoading(true)
    try {
      await onDelete?.(product.id)
    } finally {
      setIsLoading(false)
    }
  }, [product.id, onDelete])
  
  // 渲染
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <h3 className="text-lg font-semibold">{product.name}</h3>
      <p className="text-gray-600">{product.description}</p>
      <div className="mt-4 flex gap-2">
        <Button onClick={handleEdit} variant="outline">
          编辑
        </Button>
        <Button 
          onClick={handleDelete} 
          variant="destructive"
          disabled={isLoading}
        >
          {isLoading ? '删除中...' : '删除'}
        </Button>
      </div>
    </div>
  )
}

// 默认导出
export default ProductCard
```

#### 4.2.2 自定义Hooks
```typescript
// hooks/useProduct.ts
import { useState, useEffect } from 'react'
import { Product } from '@/types/product'

export function useProduct(productId: string) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/products/${productId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch product')
        }
        const data = await response.json()
        setProduct(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (productId) {
      fetchProduct()
    }
  }, [productId])

  return { product, loading, error }
}
```

### 4.3 API设计规范

#### 4.3.1 RESTful API设计
```typescript
// API路由结构
// GET    /api/products           - 获取产品列表
// GET    /api/products/:id       - 获取单个产品
// POST   /api/products           - 创建产品
// PUT    /api/products/:id       - 更新产品
// DELETE /api/products/:id       - 删除产品

// API响应格式
interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// 错误处理
class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
```

#### 4.3.2 API实现示例
```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  price: z.number().positive(),
  category: z.string().min(1)
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category')

    const where = category ? { category } : {}
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createProductSchema.parse(body)

    const product = await prisma.product.create({
      data: validatedData
    })

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product created successfully'
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errors: error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    console.error('Error creating product:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## 5. 开发流程规范

### 5.1 Git工作流

#### 5.1.1 分支策略
```bash
# 主分支
main                    # 生产环境分支
develop                 # 开发环境分支

# 功能分支
feature/user-auth       # 用户认证功能
feature/product-crud    # 产品CRUD功能
feature/payment-integration # 支付集成

# 修复分支
hotfix/critical-bug     # 紧急修复
bugfix/login-issue      # 登录问题修复

# 发布分支
release/v1.0.0          # 版本发布准备
```

#### 5.1.2 提交规范
```bash
# 提交信息格式
<type>(<scope>): <description>

# 类型说明
feat:     新功能
fix:      修复bug
docs:     文档更新
style:    代码格式调整
refactor: 代码重构
test:     测试相关
chore:    构建过程或辅助工具的变动

# 示例
feat(auth): add user registration with email verification
fix(api): resolve product creation validation error
docs(readme): update installation instructions
style(components): format button component code
refactor(db): optimize product query performance
test(api): add unit tests for user service
chore(deps): update next.js to version 14.1.0
```

### 5.2 代码审查规范

#### 5.2.1 Pull Request模板
```markdown
## 变更描述
简要描述本次变更的内容和目的

## 变更类型
- [ ] 新功能
- [ ] 修复
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化
- [ ] 其他

## 测试
- [ ] 单元测试已通过
- [ ] 集成测试已通过
- [ ] 手动测试已完成
- [ ] 性能测试已通过

## 检查清单
- [ ] 代码符合项目规范
- [ ] 已添加必要的注释
- [ ] 已更新相关文档
- [ ] 已考虑向后兼容性
- [ ] 已考虑安全性影响

## 相关Issue
Closes #123
```

#### 5.2.2 代码审查要点
```typescript
// 1. 代码质量
- 代码是否清晰易懂
- 是否有适当的注释
- 是否遵循命名规范
- 是否有重复代码

// 2. 功能正确性
- 是否满足需求
- 是否有边界情况处理
- 是否有错误处理
- 是否有性能问题

// 3. 安全性
- 是否有SQL注入风险
- 是否有XSS风险
- 是否有权限控制
- 是否有数据验证

// 4. 可维护性
- 是否易于测试
- 是否易于扩展
- 是否易于调试
- 是否有适当的日志
```

### 5.3 测试规范

#### 5.3.1 测试金字塔
```
        E2E Tests (少量)
       /              \
   Integration Tests (适量)
  /                      \
Unit Tests (大量)
```

#### 5.3.2 测试覆盖率要求
```typescript
// 单元测试覆盖率 >= 80%
// 集成测试覆盖率 >= 60%
// E2E测试覆盖核心用户流程

// 测试文件命名
Button.test.tsx          # 组件测试
userService.test.ts      # 服务测试
api.test.ts              # API测试
auth.e2e.spec.ts         # E2E测试
```

#### 5.3.3 测试示例
```typescript
// tests/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies correct variant styles', () => {
    render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600')
  })

  it('disables when loading', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

## 6. 部署与运维规范

### 6.1 环境管理

#### 6.1.1 环境划分
```yaml
# 开发环境 (Development)
- 用途: 本地开发和测试
- 域名: localhost:3000
- 数据库: 本地PostgreSQL
- 存储: 本地文件系统

# 测试环境 (Staging)
- 用途: 功能测试和集成测试
- 域名: staging.openaero.cn
- 数据库: 测试PostgreSQL
- 存储: 测试S3存储

# 生产环境 (Production)
- 用途: 正式服务
- 域名: openaero.cn
- 数据库: 生产PostgreSQL
- 存储: 生产S3存储
```

#### 6.1.2 环境变量管理
```bash
# .env.local (开发环境)
DATABASE_URL="postgresql://user:password@localhost:5432/openaero_dev"
NEXTAUTH_SECRET="development-secret"
NEXTAUTH_URL="http://localhost:3000"
AWS_ACCESS_KEY_ID="dev-access-key"
AWS_SECRET_ACCESS_KEY="dev-secret-key"
AWS_S3_BUCKET="openaero-dev-assets"

# .env.staging (测试环境)
DATABASE_URL="postgresql://user:password@staging-db:5432/openaero_staging"
NEXTAUTH_SECRET="staging-secret"
NEXTAUTH_URL="https://staging.openaero.cn"
AWS_ACCESS_KEY_ID="staging-access-key"
AWS_SECRET_ACCESS_KEY="staging-secret-key"
AWS_S3_BUCKET="openaero-staging-assets"

# .env.production (生产环境)
DATABASE_URL="postgresql://user:password@prod-db:5432/openaero_prod"
NEXTAUTH_SECRET="production-secret"
NEXTAUTH_URL="https://openaero.cn"
AWS_ACCESS_KEY_ID="prod-access-key"
AWS_SECRET_ACCESS_KEY="prod-secret-key"
AWS_S3_BUCKET="openaero-prod-assets"
```

### 6.2 监控与日志

#### 6.2.1 监控指标
```typescript
// 性能监控
interface PerformanceMetrics {
  // 页面性能
  pageLoadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  
  // API性能
  apiResponseTime: number
  apiErrorRate: number
  apiThroughput: number
  
  // 业务指标
  userRegistrationRate: number
  productViewRate: number
  conversionRate: number
}

// 错误监控
interface ErrorMetrics {
  errorType: 'javascript' | 'api' | 'database' | 'network'
  errorMessage: string
  stackTrace: string
  userId?: string
  sessionId: string
  timestamp: Date
  userAgent: string
  url: string
}
```

#### 6.2.2 日志规范
```typescript
// 日志级别
enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// 日志格式
interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  userId?: string
  requestId?: string
}

// 日志使用示例
import { logger } from '@/lib/logger'

// 错误日志
logger.error('User authentication failed', {
  userId: 'user123',
  error: 'Invalid credentials',
  ip: '192.168.1.1'
})

// 信息日志
logger.info('Product created successfully', {
  productId: 'prod123',
  creatorId: 'creator456',
  category: 'FPV'
})

// 调试日志
logger.debug('Database query executed', {
  query: 'SELECT * FROM products WHERE category = ?',
  params: ['FPV'],
  executionTime: 45
})
```

### 6.3 安全规范

#### 6.3.1 数据安全
```typescript
// 数据加密
import crypto from 'crypto'

const encrypt = (text: string, key: string): string => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher('aes-256-cbc', key)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

// 密码哈希
import bcrypt from 'bcrypt'

const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

// 输入验证
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s]+$/)
})
```

#### 6.3.2 API安全
```typescript
// 速率限制
import rateLimit from 'express-rate-limit'

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: 'Too many requests from this IP'
})

// CORS配置
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://openaero.cn'],
  credentials: true,
  optionsSuccessStatus: 200
}

// 安全头
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'"
}
```

## 7. 文档规范

### 7.1 技术文档结构
```
docs/
├── README.md                 # 项目概述
├── CONTRIBUTING.md           # 贡献指南
├── CHANGELOG.md              # 变更日志
├── architecture/             # 架构文档
│   ├── overview.md          # 架构概览
│   ├── database.md          # 数据库设计
│   ├── api.md               # API设计
│   └── deployment.md        # 部署架构
├── development/              # 开发文档
│   ├── setup.md             # 环境搭建
│   ├── coding-standards.md  # 编码规范
│   ├── testing.md           # 测试指南
│   └── debugging.md         # 调试指南
├── api/                      # API文档
│   ├── authentication.md    # 认证API
│   ├── products.md          # 产品API
│   └── creators.md          # 创作者API
└── deployment/               # 部署文档
    ├── production.md         # 生产环境部署
    ├── monitoring.md         # 监控配置
    └── troubleshooting.md    # 故障排除
```

### 7.2 代码文档规范
```typescript
/**
 * 用户服务类
 * 提供用户相关的业务逻辑处理
 * 
 * @example
 * ```typescript
 * const userService = new UserService()
 * const user = await userService.createUser({
 *   email: 'user@example.com',
 *   name: 'John Doe'
 * })
 * ```
 */
export class UserService {
  /**
   * 创建新用户
   * @param userData - 用户数据
   * @returns Promise<User> 创建的用户对象
   * @throws {ValidationError} 当用户数据验证失败时
   * @throws {DuplicateError} 当邮箱已存在时
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    // 实现逻辑
  }

  /**
   * 根据ID获取用户
   * @param id - 用户ID
   * @returns Promise<User | null> 用户对象或null
   */
  async getUserById(id: string): Promise<User | null> {
    // 实现逻辑
  }
}
```

## 8. 性能优化规范

### 8.1 前端性能优化
```typescript
// 代码分割
const ProductDetail = dynamic(() => import('./ProductDetail'), {
  loading: () => <ProductSkeleton />,
  ssr: false
})

// 图片优化
import Image from 'next/image'

<Image
  src="/product-image.jpg"
  alt="Product"
  width={400}
  height={300}
  priority
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>

// 缓存策略
const { data, isLoading } = useQuery({
  queryKey: ['products', category],
  queryFn: () => fetchProducts(category),
  staleTime: 5 * 60 * 1000, // 5分钟
  cacheTime: 10 * 60 * 1000, // 10分钟
})
```

### 8.2 后端性能优化
```typescript
// 数据库查询优化
const getProductsWithPagination = async (
  page: number,
  limit: number,
  category?: string
) => {
  return await prisma.product.findMany({
    where: category ? { category } : {},
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      name: true,
      price: true,
      category: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })
}

// Redis缓存
const getCachedProduct = async (id: string) => {
  const cached = await redis.get(`product:${id}`)
  if (cached) {
    return JSON.parse(cached)
  }
  
  const product = await prisma.product.findUnique({ where: { id } })
  if (product) {
    await redis.setex(`product:${id}`, 3600, JSON.stringify(product))
  }
  
  return product
}
```

## 9. 国际化规范

### 9.1 多语言支持
```typescript
// 语言配置
const supportedLocales = ['zh-CN', 'en-US', 'ja-JP'] as const
type Locale = typeof supportedLocales[number]

// 翻译文件结构
// locales/
//   ├── zh-CN/
//   │   ├── common.json
//   │   ├── products.json
//   │   └── auth.json
//   ├── en-US/
//   │   ├── common.json
//   │   ├── products.json
//   │   └── auth.json
//   └── ja-JP/
//       ├── common.json
//       ├── products.json
//       └── auth.json

// 使用示例
import { useTranslations } from 'next-intl'

export function ProductCard({ product }: { product: Product }) {
  const t = useTranslations('products')
  
  return (
    <div>
      <h3>{product.name}</h3>
      <p>{t('description')}</p>
      <button>{t('viewDetails')}</button>
    </div>
  )
}
```

## 10. 总结

本技术框架和开发规范文档为OpenAero项目提供了：

1. **完整的技术架构**：从MVP到大型平台的演进路径
2. **统一的开发规范**：代码风格、命名规范、组件设计
3. **标准化的流程**：Git工作流、代码审查、测试策略
4. **完善的运维体系**：监控、日志、安全、性能优化
5. **详细的文档规范**：技术文档、API文档、代码注释

这些规范将确保项目在长期发展过程中保持代码质量、团队协作效率和系统稳定性，为OpenAero成为全球领先的无人机生态平台奠定坚实的技术基础。
