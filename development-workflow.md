# OpenAero 开发工作流与代码规范

## 文档版本: 1.0
创建日期: 2025年1月27日
状态: 供团队评审

---

## 1. 开发环境设置

### 1.1 环境要求
```bash
# 必需软件版本
Node.js: 18.0.0+
npm: 9.0.0+
Git: 2.30.0+
Docker: 20.10.0+
Docker Compose: 2.0.0+

# 推荐IDE
VS Code: 1.80.0+
推荐扩展:
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- ESLint
- GitLens
- Thunder Client (API测试)
```

### 1.2 项目初始化
```bash
# 1. 克隆项目
git clone https://github.com/TigerYY/OpenAero.git
cd OpenAero/openaero.web

# 2. 安装依赖
npm install

# 3. 环境配置
cp .env.example .env.local
# 编辑 .env.local 文件，配置必要的环境变量

# 4. 数据库设置
npm run db:generate
npm run db:push

# 5. 启动开发服务器
npm run dev
```

### 1.3 开发工具配置

#### 1.3.1 VS Code工作区配置
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

#### 1.3.2 ESLint配置
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "no-console": "warn",
    "no-debugger": "error"
  },
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  }
}
```

#### 1.3.3 Prettier配置
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

## 2. Git工作流规范

### 2.1 分支策略
```bash
# 主分支
main                    # 生产环境分支，受保护
develop                 # 开发环境分支，集成所有功能

# 功能分支 (Feature Branches)
feature/user-auth       # 用户认证功能
feature/product-crud    # 产品CRUD功能
feature/payment-integration # 支付集成
feature/creator-dashboard # 创作者仪表盘

# 修复分支 (Bug Fix Branches)
hotfix/critical-bug     # 紧急修复，直接合并到main
bugfix/login-issue      # 普通bug修复，合并到develop

# 发布分支 (Release Branches)
release/v1.0.0          # 版本发布准备
release/v1.1.0          # 下一个版本准备
```

### 2.2 分支命名规范
```bash
# 功能分支
feature/<功能描述>
feature/user-registration
feature/product-search
feature/payment-gateway

# 修复分支
bugfix/<问题描述>
bugfix/login-validation
bugfix/payment-timeout
hotfix/security-patch

# 发布分支
release/<版本号>
release/v1.0.0
release/v1.1.0

# 实验分支
experiment/<实验描述>
experiment/new-ui-design
experiment/microservices-migration
```

### 2.3 提交信息规范
```bash
# 提交信息格式
<type>(<scope>): <description>

# 类型说明
feat:     新功能
fix:      修复bug
docs:     文档更新
style:    代码格式调整（不影响功能）
refactor: 代码重构
test:     测试相关
chore:    构建过程或辅助工具的变动
perf:     性能优化
ci:       CI/CD相关
build:    构建系统相关

# 作用域说明
auth:     认证相关
user:     用户管理
product:  产品管理
payment:  支付相关
api:      API相关
ui:       用户界面
db:       数据库相关
config:   配置文件

# 示例
feat(auth): add user registration with email verification
fix(api): resolve product creation validation error
docs(readme): update installation instructions
style(components): format button component code
refactor(db): optimize product query performance
test(api): add unit tests for user service
chore(deps): update next.js to version 14.1.0
perf(ui): optimize image loading with lazy loading
ci(github): add automated testing workflow
build(docker): update dockerfile for production
```

### 2.4 代码审查流程
```bash
# 1. 创建功能分支
git checkout -b feature/user-authentication
git push -u origin feature/user-authentication

# 2. 开发功能
# ... 编写代码 ...

# 3. 提交代码
git add .
git commit -m "feat(auth): implement user login functionality"
git push

# 4. 创建Pull Request
# 在GitHub上创建PR，选择develop分支作为目标

# 5. 代码审查
# 团队成员审查代码，提出修改建议

# 6. 修改代码
# 根据审查意见修改代码
git add .
git commit -m "fix(auth): address code review feedback"
git push

# 7. 合并PR
# 审查通过后，合并到develop分支
```

## 3. 代码规范

### 3.1 TypeScript规范

#### 3.1.1 类型定义
```typescript
// 接口命名：PascalCase + I前缀
interface IUser {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

// 类型别名：PascalCase
type UserRole = 'admin' | 'creator' | 'customer'
type ProductStatus = 'draft' | 'pending' | 'approved' | 'rejected'

// 枚举：PascalCase
enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}

// 泛型：单字母大写
interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

// 函数类型
type EventHandler<T> = (event: T) => void
type AsyncFunction<T, R> = (input: T) => Promise<R>
```

#### 3.1.2 函数定义
```typescript
// 函数声明：camelCase
function getUserById(id: string): Promise<IUser | null> {
  // 实现
}

// 箭头函数
const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0)
}

// 异步函数
async function fetchUserData(id: string): Promise<ApiResponse<IUser>> {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
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

#### 3.1.3 错误处理
```typescript
// 自定义错误类
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

class ValidationError extends AppError {
  constructor(message: string, public field: string) {
    super(message, 400)
    this.name = 'ValidationError'
  }
}

// 错误处理函数
const handleError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, 500, false)
  }
  
  return new AppError('Unknown error occurred', 500, false)
}

// 使用示例
try {
  const user = await getUserById('invalid-id')
  if (!user) {
    throw new ValidationError('User not found', 'id')
  }
} catch (error) {
  const appError = handleError(error)
  console.error('Error:', appError.message)
}
```

### 3.2 React组件规范

#### 3.2.1 组件结构
```typescript
// 组件文件结构
import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { IUser, UserRole } from '@/types/user'

// Props接口定义
interface UserCardProps {
  user: IUser
  onEdit?: (user: IUser) => void
  onDelete?: (userId: string) => void
  className?: string
  showActions?: boolean
}

// 组件实现
export function UserCard({
  user,
  onEdit,
  onDelete,
  className,
  showActions = true
}: UserCardProps) {
  // Hooks
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // 事件处理函数
  const handleEdit = useCallback(() => {
    onEdit?.(user)
  }, [user, onEdit])
  
  const handleDelete = useCallback(async () => {
    if (!confirm('确定要删除这个用户吗？')) return
    
    setIsLoading(true)
    try {
      await onDelete?.(user.id)
    } catch (error) {
      console.error('删除用户失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user.id, onDelete])
  
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])
  
  // 渲染
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{user.name}</h3>
          <p className="text-gray-600">{user.email}</p>
          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
            {user.role}
          </span>
        </div>
        
        {showActions && (
          <div className="flex gap-2">
            <Button
              onClick={handleEdit}
              variant="outline"
              size="sm"
            >
              编辑
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? '删除中...' : '删除'}
            </Button>
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-500">
            创建时间: {user.createdAt.toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-500">
            更新时间: {user.updatedAt.toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  )
}

// 默认导出
export default UserCard
```

#### 3.2.2 自定义Hooks
```typescript
// hooks/useUser.ts
import { useState, useEffect } from 'react'
import { IUser } from '@/types/user'
import { apiClient } from '@/lib/api-client'

interface UseUserOptions {
  autoFetch?: boolean
  onError?: (error: Error) => void
}

export function useUser(userId: string, options: UseUserOptions = {}) {
  const { autoFetch = true, onError } = options
  
  const [user, setUser] = useState<IUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchUser = useCallback(async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      setError(null)
      const userData = await apiClient.getUser(userId)
      setUser(userData)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [userId, onError])

  const updateUser = useCallback(async (updates: Partial<IUser>) => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      const updatedUser = await apiClient.updateUser(user.id, updates)
      setUser(updatedUser)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [user, onError])

  useEffect(() => {
    if (autoFetch) {
      fetchUser()
    }
  }, [fetchUser, autoFetch])

  return {
    user,
    loading,
    error,
    fetchUser,
    updateUser,
    refetch: fetchUser
  }
}
```

### 3.3 API设计规范

#### 3.3.1 API路由结构
```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { validateAuth } from '@/lib/auth'

// 请求验证模式
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'creator', 'customer']).optional()
})

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'creator', 'customer']).optional()
})

// GET /api/users - 获取用户列表
export async function GET(request: NextRequest) {
  try {
    // 验证认证
    const authResult = await validateAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') as 'admin' | 'creator' | 'customer' | null

    // 构建查询条件
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } }
        ]
      }),
      ...(role && { role })
    }

    // 查询数据
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/users - 创建用户
export async function POST(request: NextRequest) {
  try {
    // 验证认证
    const authResult = await validateAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // 创建用户
    const user = await prisma.user.create({
      data: {
        ...validatedData,
        role: validatedData.role || 'customer'
      }
    })

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User created successfully'
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### 3.3.2 API客户端
```typescript
// lib/api-client.ts
class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // 用户相关API
  async getUsers(params?: {
    page?: number
    limit?: number
    search?: string
    role?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.role) searchParams.set('role', params.role)

    const queryString = searchParams.toString()
    return this.request(`/users${queryString ? `?${queryString}` : ''}`)
  }

  async getUser(id: string) {
    return this.request(`/users/${id}`)
  }

  async createUser(data: CreateUserRequest) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateUser(id: string, data: UpdateUserRequest) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE'
    })
  }
}

export const apiClient = new ApiClient()
```

## 4. 测试规范

### 4.1 测试结构
```
tests/
├── unit/                    # 单元测试
│   ├── components/         # 组件测试
│   ├── hooks/             # Hook测试
│   ├── utils/             # 工具函数测试
│   └── services/          # 服务测试
├── integration/            # 集成测试
│   ├── api/               # API测试
│   ├── database/          # 数据库测试
│   └── auth/              # 认证测试
├── e2e/                   # 端到端测试
│   ├── user-flow/         # 用户流程测试
│   ├── creator-flow/      # 创作者流程测试
│   └── admin-flow/        # 管理员流程测试
├── fixtures/              # 测试数据
├── mocks/                 # Mock数据
└── helpers/               # 测试辅助函数
```

### 4.2 单元测试示例
```typescript
// tests/unit/components/UserCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserCard } from '@/components/UserCard'
import { IUser } from '@/types/user'

// Mock数据
const mockUser: IUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
}

// Mock函数
const mockOnEdit = jest.fn()
const mockOnDelete = jest.fn()

describe('UserCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders user information correctly', () => {
    render(<UserCard user={mockUser} />)
    
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('customer')).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', () => {
    render(<UserCard user={mockUser} onEdit={mockOnEdit} />)
    
    const editButton = screen.getByText('编辑')
    fireEvent.click(editButton)
    
    expect(mockOnEdit).toHaveBeenCalledWith(mockUser)
  })

  it('calls onDelete when delete button is clicked', async () => {
    // Mock confirm dialog
    window.confirm = jest.fn(() => true)
    
    render(<UserCard user={mockUser} onDelete={mockOnDelete} />)
    
    const deleteButton = screen.getByText('删除')
    fireEvent.click(deleteButton)
    
    expect(window.confirm).toHaveBeenCalledWith('确定要删除这个用户吗？')
    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('1')
    })
  })

  it('does not call onDelete when confirm is cancelled', () => {
    window.confirm = jest.fn(() => false)
    
    render(<UserCard user={mockUser} onDelete={mockOnDelete} />)
    
    const deleteButton = screen.getByText('删除')
    fireEvent.click(deleteButton)
    
    expect(mockOnDelete).not.toHaveBeenCalled()
  })

  it('shows loading state when deleting', async () => {
    // Mock async delete function
    const asyncOnDelete = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    )
    
    render(<UserCard user={mockUser} onDelete={asyncOnDelete} />)
    
    const deleteButton = screen.getByText('删除')
    fireEvent.click(deleteButton)
    
    expect(screen.getByText('删除中...')).toBeInTheDocument()
    expect(deleteButton).toBeDisabled()
  })

  it('hides actions when showActions is false', () => {
    render(<UserCard user={mockUser} showActions={false} />)
    
    expect(screen.queryByText('编辑')).not.toBeInTheDocument()
    expect(screen.queryByText('删除')).not.toBeInTheDocument()
  })
})
```

### 4.3 集成测试示例
```typescript
// tests/integration/api/users.test.ts
import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/users/route'
import { prisma } from '@/lib/db'

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn()
    }
  }
}))

describe('/api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/users', () => {
    it('returns users list with pagination', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'user1@example.com',
          name: 'User 1',
          role: 'customer',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers)
      ;(prisma.user.count as jest.Mock).mockResolvedValue(1)

      const { req } = createMocks<NextRequest>({
        method: 'GET',
        url: 'http://localhost:3000/api/users?page=1&limit=10'
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockUsers)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      })
    })

    it('handles search parameter', async () => {
      const mockUsers = []
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers)
      ;(prisma.user.count as jest.Mock).mockResolvedValue(0)

      const { req } = createMocks<NextRequest>({
        method: 'GET',
        url: 'http://localhost:3000/api/users?search=test'
      })

      await GET(req)

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { email: { contains: 'test', mode: 'insensitive' } }
          ]
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object)
      })
    })
  })

  describe('POST /api/users', () => {
    it('creates a new user', async () => {
      const newUser = {
        email: 'newuser@example.com',
        name: 'New User',
        role: 'customer'
      }

      const createdUser = {
        id: '1',
        ...newUser,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.create as jest.Mock).mockResolvedValue(createdUser)

      const { req } = createMocks<NextRequest>({
        method: 'POST',
        body: newUser
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(createdUser)
    })

    it('returns error when email already exists', async () => {
      const newUser = {
        email: 'existing@example.com',
        name: 'New User'
      }

      const existingUser = {
        id: '1',
        email: 'existing@example.com',
        name: 'Existing User'
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser)

      const { req } = createMocks<NextRequest>({
        method: 'POST',
        body: newUser
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email already exists')
    })
  })
})
```

### 4.4 E2E测试示例
```typescript
// tests/e2e/user-management.spec.ts
import { test, expect } from '@playwright/test'

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    // 登录管理员账户
    await page.goto('/login')
    await page.fill('[name="email"]', 'admin@openaero.cn')
    await page.fill('[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should create a new user', async ({ page }) => {
    // 导航到用户管理页面
    await page.goto('/admin/users')
    
    // 点击创建用户按钮
    await page.click('button:has-text("创建用户")')
    
    // 填写用户信息
    await page.fill('[name="name"]', 'Test User')
    await page.fill('[name="email"]', 'test@example.com')
    await page.selectOption('[name="role"]', 'customer')
    
    // 提交表单
    await page.click('button[type="submit"]')
    
    // 验证用户创建成功
    await expect(page.locator('text=用户创建成功')).toBeVisible()
    await expect(page.locator('text=Test User')).toBeVisible()
  })

  test('should edit user information', async ({ page }) => {
    // 导航到用户管理页面
    await page.goto('/admin/users')
    
    // 点击编辑按钮
    await page.click('tr:has-text("test@example.com") button:has-text("编辑")')
    
    // 修改用户信息
    await page.fill('[name="name"]', 'Updated User')
    
    // 保存修改
    await page.click('button:has-text("保存")')
    
    // 验证修改成功
    await expect(page.locator('text=用户信息更新成功')).toBeVisible()
    await expect(page.locator('text=Updated User')).toBeVisible()
  })

  test('should delete user', async ({ page }) => {
    // 导航到用户管理页面
    await page.goto('/admin/users')
    
    // 点击删除按钮
    await page.click('tr:has-text("test@example.com") button:has-text("删除")')
    
    // 确认删除
    await page.click('button:has-text("确认删除")')
    
    // 验证用户删除成功
    await expect(page.locator('text=用户删除成功')).toBeVisible()
    await expect(page.locator('text=test@example.com')).not.toBeVisible()
  })
})
```

## 5. 持续集成/持续部署 (CI/CD)

### 5.1 GitHub Actions工作流
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linting
      run: npm run lint
      
    - name: Run type checking
      run: npm run type-check
      
    - name: Run unit tests
      run: npm run test:unit
      
    - name: Run integration tests
      run: npm run test:integration
      
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  e2e:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18.x
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install Playwright
      run: npx playwright install --with-deps
      
    - name: Run E2E tests
      run: npm run test:e2e
      
    - name: Upload E2E test results
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/

  build:
    runs-on: ubuntu-latest
    needs: [test, e2e]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18.x
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build application
      run: npm run build
      
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-files
        path: .next/

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
```

### 5.2 部署策略
```yaml
# 蓝绿部署策略
deployment_strategy: blue_green

# 阶段1: 蓝环境部署
blue_deployment:
  environment: staging
  url: https://staging.openaero.cn
  health_check: /health
  smoke_tests: true

# 阶段2: 绿环境部署
green_deployment:
  environment: production
  url: https://openaero.cn
  health_check: /health
  smoke_tests: true

# 阶段3: 流量切换
traffic_switch:
  method: weighted
  blue_weight: 0
  green_weight: 100
  monitoring_duration: 5m

# 阶段4: 回滚策略
rollback_strategy:
  trigger: error_rate > 5%
  method: immediate
  target: blue_environment
```

## 6. 代码质量保证

### 6.1 代码审查清单
```markdown
## 代码审查清单

### 功能正确性
- [ ] 代码是否满足需求
- [ ] 是否有边界情况处理
- [ ] 是否有错误处理
- [ ] 是否有性能问题

### 代码质量
- [ ] 代码是否清晰易懂
- [ ] 是否有适当的注释
- [ ] 是否遵循命名规范
- [ ] 是否有重复代码

### 安全性
- [ ] 是否有SQL注入风险
- [ ] 是否有XSS风险
- [ ] 是否有权限控制
- [ ] 是否有数据验证

### 可维护性
- [ ] 是否易于测试
- [ ] 是否易于扩展
- [ ] 是否易于调试
- [ ] 是否有适当的日志

### 性能
- [ ] 是否有性能瓶颈
- [ ] 是否有内存泄漏
- [ ] 是否有不必要的重渲染
- [ ] 是否有缓存策略
```

### 6.2 代码度量指标
```typescript
// 代码度量配置
interface CodeMetrics {
  // 代码覆盖率
  coverage: {
    statements: number
    branches: number
    functions: number
    lines: number
  }
  
  // 代码复杂度
  complexity: {
    cyclomatic: number
    cognitive: number
    maintainability: number
  }
  
  // 代码质量
  quality: {
    duplications: number
    technicalDebt: number
    codeSmells: number
    bugs: number
    vulnerabilities: number
  }
  
  // 性能指标
  performance: {
    bundleSize: number
    loadTime: number
    renderTime: number
  }
}

// 质量门禁
const qualityGates = {
  coverage: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80
  },
  complexity: {
    cyclomatic: 10,
    cognitive: 15
  },
  quality: {
    duplications: 3,
    technicalDebt: 30,
    codeSmells: 0,
    bugs: 0,
    vulnerabilities: 0
  }
}
```

## 7. 文档规范

### 7.1 代码文档
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
   * 
   * @example
   * ```typescript
   * const user = await userService.createUser({
   *   email: 'newuser@example.com',
   *   name: 'New User',
   *   role: 'customer'
   * })
   * ```
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    // 实现逻辑
  }

  /**
   * 根据ID获取用户
   * @param id - 用户ID
   * @returns Promise<User | null> 用户对象或null
   * 
   * @example
   * ```typescript
   * const user = await userService.getUserById('user123')
   * if (user) {
   *   console.log(user.name)
   * }
   * ```
   */
  async getUserById(id: string): Promise<User | null> {
    // 实现逻辑
  }
}
```

### 7.2 API文档
```markdown
# 用户管理API

## 获取用户列表

### 请求
```http
GET /api/users?page=1&limit=10&search=test&role=customer
```

### 参数
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| page | number | 否 | 页码，默认为1 |
| limit | number | 否 | 每页数量，默认为10 |
| search | string | 否 | 搜索关键词 |
| role | string | 否 | 用户角色过滤 |

### 响应
```json
{
  "success": true,
  "data": [
    {
      "id": "user123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "customer",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## 创建用户

### 请求
```http
POST /api/users
Content-Type: application/json

{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "customer"
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "id": "user456",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "customer",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  },
  "message": "User created successfully"
}
```
```

## 8. 总结

本开发工作流与代码规范文档为OpenAero项目提供了：

1. **标准化的开发环境**：统一的工具配置和项目初始化流程
2. **清晰的Git工作流**：分支策略、提交规范和代码审查流程
3. **严格的代码规范**：TypeScript、React和API设计的最佳实践
4. **完善的测试体系**：单元测试、集成测试和E2E测试
5. **自动化CI/CD**：持续集成和持续部署流程
6. **代码质量保证**：代码审查清单和质量度量指标
7. **详细的文档规范**：代码文档和API文档标准

这些规范将确保OpenAero项目在长期发展过程中保持代码质量、团队协作效率和系统稳定性，为项目的成功奠定坚实的技术基础。
