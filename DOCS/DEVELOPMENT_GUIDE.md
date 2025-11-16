# OpenAero 开发指南

**版本**: 1.0.0  
**最后更新**: 2025-01-16  
**状态**: ✅ 已发布  
**相关文档**: [系统架构](./ARCHITECTURE.md) | [API文档](./API_DOCUMENTATION.md) | [项目规范](../PROJECT_STANDARDS.md)

---

## 📋 目录

1. [快速开始](#快速开始)
2. [开发环境搭建](#开发环境搭建)
3. [项目结构](#项目结构)
4. [开发规范](#开发规范)
5. [Git工作流](#git工作流)
6. [调试技巧](#调试技巧)
7. [测试指南](#测试指南)
8. [性能优化](#性能优化)
9. [常见问题](#常见问题)

---

## 快速开始

### 前置要求

确保你的开发环境满足以下条件：

| 工具 | 版本要求 | 说明 |
|-----|---------|------|
| **Node.js** | >= 18.17.0 | JavaScript运行时 |
| **npm** | >= 9.6.7 | 包管理器 |
| **Git** | >= 2.40.0 | 版本控制 |
| **PostgreSQL** | >= 14.0 | 数据库（可选，使用Supabase时） |

### 5分钟快速启动

```bash
# 1. 克隆项目
git clone https://github.com/openaero/openaero.web.git
cd openaero.web

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp env.example .env.local
# 编辑 .env.local 填入必要配置

# 4. 初始化数据库
npm run db:push

# 5. 启动开发服务器
npm run dev

# 6. 打开浏览器访问
open http://localhost:3000
```

🎉 **恭喜！** 你的开发环境已经就绪！

---

## 开发环境搭建

### 1. 克隆项目

```bash
# 使用 HTTPS
git clone https://github.com/openaero/openaero.web.git

# 或使用 SSH
git clone git@github.com:openaero/openaero.web.git

cd openaero.web
```

### 2. 安装依赖

```bash
# 使用 npm（推荐）
npm install

# 或使用 yarn
yarn install

# 或使用 pnpm
pnpm install
```

**依赖安装时间**: 约 2-5 分钟（取决于网络速度）

### 3. 环境变量配置

#### 3.1 创建环境文件

```bash
cp env.example .env.local
```

#### 3.2 必需的环境变量

```bash
# .env.local

# ==================== 应用配置 ====================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000

# ==================== Supabase 配置 ====================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 数据库连接（Pooler连接）
DATABASE_URL=postgresql://postgres.your-project:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true

# 直连（用于Prisma Migrate）
DIRECT_URL=postgresql://postgres.your-project:password@aws-0-region.pooler.supabase.com:5432/postgres

# ==================== 认证配置 ====================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars

# ==================== 邮件配置 ====================
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=your-resend-api-key
SMTP_FROM=noreply@openaero.com

# ==================== 支付配置（可选） ====================
ALIPAY_APP_ID=your-alipay-app-id
ALIPAY_PRIVATE_KEY=your-alipay-private-key
ALIPAY_PUBLIC_KEY=alipay-public-key

WECHAT_APP_ID=your-wechat-app-id
WECHAT_MCH_ID=your-wechat-mch-id
WECHAT_API_KEY=your-wechat-api-key

# ==================== 文件存储配置 ====================
NEXT_PUBLIC_STORAGE_BUCKET=solutions
STORAGE_MAX_FILE_SIZE=104857600  # 100MB

# ==================== 其他配置 ====================
ENCRYPTION_KEY=your-encryption-key-64-chars-hex
LOG_LEVEL=debug
```

#### 3.3 获取 Supabase 配置

1. 访问 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Settings** → **API**
4. 复制以下信息：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
5. 进入 **Settings** → **Database**
6. 复制连接字符串：
   - **Pooler** (Session mode) → `DATABASE_URL`
   - **Direct connection** → `DIRECT_URL`

### 4. 数据库初始化

```bash
# 推送 Prisma Schema 到数据库
npm run db:push

# 或运行迁移（推荐生产环境）
npm run db:migrate

# 查看数据库
npm run db:studio
```

**Prisma Studio** 会在 `http://localhost:5555` 打开，你可以可视化管理数据库。

### 5. 启动开发服务器

```bash
# 标准启动
npm run dev

# 指定端口
PORT=3001 npm run dev

# 使用自定义启动脚本
./scripts/start-dev.sh
```

**访问地址**:
- 🌐 主应用: http://localhost:3000
- 📊 Prisma Studio: http://localhost:5555

---

## 项目结构

### 目录树

```
openaero.web/
├── public/                    # 静态资源
│   ├── images/               # 图片资源
│   ├── icons/                # 图标文件
│   └── locales/              # 本地化文件
│
├── src/                      # 源代码
│   ├── app/                  # Next.js 14 App Router
│   │   ├── [locale]/        # 国际化路由
│   │   │   ├── (auth)/      # 认证相关页面
│   │   │   ├── (dashboard)/ # 仪表板页面
│   │   │   ├── admin/       # 管理后台
│   │   │   └── ...
│   │   ├── api/             # API路由
│   │   │   ├── auth/        # 认证API
│   │   │   ├── solutions/   # 方案API
│   │   │   ├── orders/      # 订单API
│   │   │   └── ...
│   │   ├── layout.tsx       # 根布局
│   │   └── globals.css      # 全局样式
│   │
│   ├── components/           # React组件
│   │   ├── ui/              # 基础UI组件
│   │   ├── auth/            # 认证组件
│   │   ├── solutions/       # 方案组件
│   │   ├── orders/          # 订单组件
│   │   └── ...
│   │
│   ├── lib/                  # 工具库
│   │   ├── auth/            # 认证工具
│   │   ├── api-helpers.ts   # API辅助函数
│   │   ├── prisma.ts        # Prisma客户端
│   │   ├── supabase.ts      # Supabase客户端
│   │   └── utils.ts         # 通用工具
│   │
│   ├── backend/              # 后端业务逻辑
│   │   ├── middleware/      # 中间件
│   │   ├── solution/        # 方案服务
│   │   ├── order/           # 订单服务
│   │   └── ...
│   │
│   ├── hooks/                # React Hooks
│   │   ├── useAuth.ts       # 认证Hook
│   │   ├── useSolutions.ts  # 方案Hook
│   │   └── ...
│   │
│   ├── types/                # TypeScript类型
│   │   ├── index.ts         # 导出类型
│   │   ├── api.ts           # API类型
│   │   └── models.ts        # 数据模型类型
│   │
│   └── styles/               # 样式文件
│       └── globals.css      # 全局样式
│
├── prisma/                   # Prisma配置
│   ├── schema.prisma        # 数据库模式
│   └── migrations/          # 迁移文件
│
├── scripts/                  # 脚本文件
│   ├── start-dev.sh         # 开发启动脚本
│   ├── clean-ports.js       # 端口清理脚本
│   └── ...
│
├── tests/                    # 测试文件
│   ├── unit/                # 单元测试
│   ├── integration/         # 集成测试
│   └── e2e/                 # E2E测试
│
├── docs/                     # 文档
│   ├── ARCHITECTURE.md      # 架构文档
│   ├── API_DOCUMENTATION.md # API文档
│   └── ...
│
├── .env.example             # 环境变量示例
├── .eslintrc.json           # ESLint配置
├── .prettierrc              # Prettier配置
├── next.config.js           # Next.js配置
├── tsconfig.json            # TypeScript配置
├── tailwind.config.js       # Tailwind CSS配置
└── package.json             # 项目依赖
```

### 核心目录说明

#### `src/app/`
Next.js 14 App Router 目录：
- **路由即文件**: 每个文件夹代表一个路由段
- **特殊文件**: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- **API路由**: `src/app/api/` 下的 `route.ts` 文件

#### `src/components/`
可复用的 React 组件：
- **UI组件**: 基础组件（按钮、输入框等）
- **业务组件**: 特定功能组件（方案卡片、订单列表等）
- **布局组件**: 页面布局组件

#### `src/lib/`
工具函数和配置：
- **客户端**: Prisma、Supabase、第三方SDK
- **辅助函数**: API helpers、验证函数等
- **常量**: 配置常量、枚举等

---

## 开发规范

### 代码风格

#### TypeScript 规范

```typescript
// ✅ 推荐：使用接口定义类型
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ 推荐：使用类型别名定义联合类型
type Status = 'active' | 'inactive' | 'pending';

// ✅ 推荐：为函数参数和返回值添加类型
function createUser(data: Omit<User, 'id'>): User {
  return {
    id: generateId(),
    ...data
  };
}

// ❌ 避免：使用 any 类型
function processData(data: any) { // 不好
  // ...
}

// ✅ 推荐：使用泛型
function processData<T>(data: T): T {
  // ...
  return data;
}
```

#### 命名规范

```typescript
// 文件命名
components/SolutionCard.tsx        // ✅ PascalCase（组件）
lib/api-helpers.ts                 // ✅ kebab-case（工具）
hooks/useAuth.ts                   // ✅ camelCase + use前缀（Hook）

// 变量命名
const userName = 'John';           // ✅ camelCase（变量）
const MAX_RETRIES = 3;             // ✅ UPPER_SNAKE_CASE（常量）

// 函数命名
function getUserById(id: string) { // ✅ camelCase（函数）
  // ...
}

// 类命名
class UserService {                // ✅ PascalCase（类）
  // ...
}

// 接口命名
interface UserProfile {            // ✅ PascalCase（接口）
  // ...
}

// 枚举命名
enum OrderStatus {                 // ✅ PascalCase（枚举）
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED'
}
```

#### React 组件规范

```typescript
// ✅ 推荐：使用函数组件 + TypeScript
interface SolutionCardProps {
  solution: Solution;
  onSelect?: (id: string) => void;
}

export function SolutionCard({ solution, onSelect }: SolutionCardProps) {
  return (
    <div onClick={() => onSelect?.(solution.id)}>
      <h3>{solution.title}</h3>
      <p>{solution.description}</p>
    </div>
  );
}

// ✅ 推荐：使用 React Hooks
export function useSolution(id: string) {
  const [solution, setSolution] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchSolution(id);
  }, [id]);
  
  return { solution, loading };
}

// ✅ 推荐：使用 Server Components（App Router）
async function SolutionsPage() {
  const solutions = await getSolutions(); // 服务端获取数据
  
  return (
    <div>
      {solutions.map(solution => (
        <SolutionCard key={solution.id} solution={solution} />
      ))}
    </div>
  );
}
```

### API 开发规范

#### 路由文件结构

```typescript
// src/app/api/solutions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-helpers';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers';

// GET /api/solutions
export async function GET(request: NextRequest) {
  try {
    // 1. 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // 2. 业务逻辑
    const solutions = await getSolutions({ page, limit });
    
    // 3. 返回响应
    return createSuccessResponse(solutions, '获取成功');
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}

// POST /api/solutions
export async function POST(request: NextRequest) {
  try {
    // 1. 认证检查
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return createErrorResponse('未授权', 401);
    }
    
    // 2. 解析请求体
    const body = await request.json();
    
    // 3. 数据验证
    const validatedData = solutionSchema.parse(body);
    
    // 4. 业务逻辑
    const solution = await createSolution(validatedData, authResult.user.id);
    
    // 5. 返回响应
    return createSuccessResponse(solution, '创建成功', 201);
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}
```

#### 统一响应格式

```typescript
// 成功响应
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}

// 错误响应
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE",
  "details": { ... }
}

// 分页响应
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  },
  "message": "获取成功"
}
```

### 数据库操作规范

```typescript
// ✅ 推荐：使用 Prisma 类型安全
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    email: true,
    profile: {
      select: {
        avatar: true,
        bio: true
      }
    }
  }
});

// ✅ 推荐：使用事务处理多个操作
await prisma.$transaction([
  prisma.order.create({ data: orderData }),
  prisma.wallet.update({
    where: { userId },
    data: { balance: { decrement: amount } }
  })
]);

// ✅ 推荐：使用 try-catch 处理错误
try {
  const result = await prisma.solution.create({ data });
  return result;
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new Error('记录已存在');
    }
  }
  throw error;
}
```

---

## Git工作流

### 分支策略

```
main (生产环境)
  ↓
develop (开发环境)
  ↓
feature/xxx (功能分支)
hotfix/xxx (紧急修复)
```

### 分支命名规范

```bash
# 功能分支
feature/user-authentication
feature/solution-upload

# 修复分支
fix/payment-bug
fix/database-connection

# 紧急修复
hotfix/security-patch

# 重构分支
refactor/api-structure
```

### 提交信息规范

```bash
# 格式: <type>(<scope>): <subject>

# 类型（type）
feat:     新功能
fix:      修复bug
docs:     文档更新
style:    代码格式（不影响功能）
refactor: 重构
test:     测试相关
chore:    构建过程或辅助工具的变动

# 示例
git commit -m "feat(auth): 添加Google OAuth登录"
git commit -m "fix(payment): 修复支付宝回调验签失败"
git commit -m "docs(api): 更新API文档"
git commit -m "refactor(solution): 优化方案查询性能"
```

### 开发流程

```bash
# 1. 从develop创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# 2. 开发并提交
git add .
git commit -m "feat(scope): description"

# 3. 推送到远程
git push origin feature/new-feature

# 4. 创建 Pull Request
# 在GitHub上创建PR，目标分支为develop

# 5. 代码审查通过后合并
# 由维护者合并PR

# 6. 删除功能分支
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

---

## 调试技巧

### 1. 使用 VS Code 调试器

**配置文件** (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### 2. 日志调试

```typescript
// 开发环境日志
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG]', data);
}

// 使用调试库
import debug from 'debug';
const log = debug('app:solutions');

log('Fetching solutions with params:', params);
```

### 3. React DevTools

安装 [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)

- 检查组件树
- 查看组件 props 和 state
- 性能分析

### 4. 网络请求调试

```typescript
// 拦截fetch请求
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  console.log('[FETCH]', args[0]);
  const response = await originalFetch(...args);
  console.log('[RESPONSE]', response.status);
  return response;
};
```

---

## 测试指南

### 单元测试

```typescript
// tests/unit/lib/utils.test.ts

import { describe, it, expect } from '@jest/globals';
import { generateOrderNumber } from '@/lib/utils';

describe('generateOrderNumber', () => {
  it('should generate order number with correct format', () => {
    const orderNumber = generateOrderNumber();
    expect(orderNumber).toMatch(/^OA\d{20}$/);
  });
  
  it('should generate unique order numbers', () => {
    const numbers = new Set();
    for (let i = 0; i < 100; i++) {
      numbers.add(generateOrderNumber());
    }
    expect(numbers.size).toBe(100);
  });
});
```

### 集成测试

```typescript
// tests/integration/api/solutions.test.ts

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createMockRequest } from '@/tests/helpers';

describe('POST /api/solutions', () => {
  beforeAll(async () => {
    // 设置测试数据库
  });
  
  afterAll(async () => {
    // 清理测试数据
  });
  
  it('should create solution with valid data', async () => {
    const request = createMockRequest({
      method: 'POST',
      body: {
        title: 'Test Solution',
        description: 'Test Description',
        price: 99.99
      }
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.title).toBe('Test Solution');
  });
});
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- solutions.test.ts

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式
npm test -- --watch
```

---

## 性能优化

### 1. 代码分割

```typescript
// 动态导入组件
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false // 禁用SSR
});
```

### 2. 图片优化

```typescript
import Image from 'next/image';

<Image
  src="/solution.jpg"
  alt="Solution"
  width={800}
  height={600}
  priority // 优先加载
  placeholder="blur" // 模糊占位符
/>
```

### 3. 数据库查询优化

```typescript
// ✅ 使用索引
await prisma.solution.findMany({
  where: {
    status: 'PUBLISHED', // 有索引
    category: 'UAV'      // 有索引
  }
});

// ✅ 只查询需要的字段
await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    email: true
    // 不查询不需要的字段
  }
});

// ✅ 使用游标分页（大数据集）
await prisma.solution.findMany({
  take: 10,
  cursor: { id: lastId },
  orderBy: { createdAt: 'desc' }
});
```

### 4. 缓存策略

```typescript
// 使用 React Cache
import { cache } from 'react';

export const getSolutions = cache(async () => {
  return await prisma.solution.findMany();
});

// 使用 Next.js revalidate
export const revalidate = 3600; // 1小时

export async function getSolutions() {
  // ...
}
```

---

## 常见问题

### Q1: 端口被占用？

```bash
# 查找占用端口的进程
lsof -ti:3000

# 杀死进程
kill -9 $(lsof -ti:3000)

# 或使用项目脚本
npm run clean:ports
```

### Q2: Prisma 类型不同步？

```bash
# 重新生成 Prisma Client
npm run db:generate

# 推送 schema 变更
npm run db:push
```

### Q3: 环境变量不生效？

1. 确保变量以 `NEXT_PUBLIC_` 开头（客户端）
2. 重启开发服务器
3. 检查 `.env.local` 文件格式

### Q4: 构建失败？

```bash
# 清理缓存
rm -rf .next
npm run build
```

---

## 相关资源

- [系统架构文档](./ARCHITECTURE.md)
- [API文档](./API_DOCUMENTATION.md)
- [数据库架构](./DATABASE_SCHEMA.md)
- [项目规范](../PROJECT_STANDARDS.md)
- [Next.js 官方文档](https://nextjs.org/docs)
- [Prisma 官方文档](https://www.prisma.io/docs)
- [Supabase 官方文档](https://supabase.com/docs)

---

**文档维护**: OpenAero 技术团队  
**反馈渠道**: tech@openaero.com
