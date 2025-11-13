# API响应辅助函数使用指南

本文档介绍如何使用 `src/lib/api-helpers.ts` 中的统一响应函数来简化API路由代码。

## 概述

为了减少重复代码并统一API响应格式，我们创建了一组统一的响应函数。这些函数可以替代手动的 `NextResponse.json()` 调用，提供一致的响应格式和更好的类型安全。

## 可用函数

### 1. createSuccessResponse<T>

创建成功响应。

```typescript
import { createSuccessResponse } from '@/lib/api-helpers';

// 基本用法
return createSuccessResponse(data, '操作成功');

// 指定状态码
return createSuccessResponse(data, '创建成功', 201);
```

**参数:**
- `data: T` - 响应数据
- `message?: string` - 可选的成功消息
- `status: number = 200` - HTTP状态码（默认200）

**返回:** `NextResponse<ApiResponse<T>>`

### 2. createErrorResponse

创建错误响应。

```typescript
import { createErrorResponse } from '@/lib/api-helpers';

// 使用字符串
return createErrorResponse('操作失败', 500);

// 使用Error对象
try {
  // ...
} catch (error) {
  return createErrorResponse(error instanceof Error ? error : new Error('操作失败'), 500);
}

// 包含详细信息
return createErrorResponse('验证失败', 400, { field: 'email', reason: '格式无效' });
```

**参数:**
- `error: string | Error` - 错误消息或Error对象
- `status: number = 500` - HTTP状态码（默认500）
- `details?: unknown` - 可选的错误详情

**返回:** `NextResponse<ApiResponse<null>>`

### 3. createValidationErrorResponse

创建验证错误响应（用于Zod等验证库）。

```typescript
import { createValidationErrorResponse } from '@/lib/api-helpers';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const result = schema.safeParse(body);
if (!result.success) {
  return createValidationErrorResponse(result.error);
}
```

**参数:**
- `errors: z.ZodError | Record<string, string[]>` - Zod错误或字段错误对象

**返回:** `NextResponse<ApiResponse<null>>`

### 4. createPaginatedResponse<T>

创建分页响应。

```typescript
import { createPaginatedResponse } from '@/lib/api-helpers';

const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '10');
const skip = (page - 1) * limit;

const [data, total] = await Promise.all([
  db.solution.findMany({ skip, take: limit }),
  db.solution.count(),
]);

return createPaginatedResponse(data, page, limit, total, '获取列表成功');
```

**参数:**
- `data: T[]` - 数据数组
- `page: number` - 当前页码
- `limit: number` - 每页数量
- `total: number` - 总记录数
- `message?: string` - 可选的成功消息

**返回:** `NextResponse<ApiResponse<T[]> & { pagination: {...} }>`

### 5. withErrorHandler

错误处理包装器，自动捕获错误并返回统一格式。

```typescript
import { withErrorHandler } from '@/lib/api-helpers';

export const GET = withErrorHandler(
  async (request: NextRequest) => {
    // 业务逻辑
    const data = await fetchData();
    return createSuccessResponse(data);
  },
  '获取数据失败' // 可选的错误消息
);
```

**参数:**
- `handler: T` - API处理函数
- `errorMessage?: string` - 可选的错误消息

**返回:** 包装后的处理函数

## 迁移示例

### 之前（手动响应）

```typescript
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json({
      success: true,
      data,
      message: '获取成功'
    });
  } catch (error) {
    console.error('获取失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取失败',
      data: null
    }, { status: 500 });
  }
}
```

### 之后（使用辅助函数）

```typescript
import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return createSuccessResponse(data, '获取成功');
  } catch (error) {
    console.error('获取失败:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('获取失败'),
      500
    );
  }
}
```

### 使用错误处理包装器

```typescript
import { withErrorHandler, createSuccessResponse } from '@/lib/api-helpers';

export const GET = withErrorHandler(
  async (request: NextRequest) => {
    const data = await fetchData();
    return createSuccessResponse(data, '获取成功');
  },
  '获取数据失败'
);
```

## 最佳实践

1. **统一使用辅助函数**: 所有新的API路由应使用这些辅助函数，而不是手动创建响应。

2. **逐步迁移**: 现有路由可以逐步迁移，优先迁移高频使用的路由。

3. **错误处理**: 
   - 使用 `createErrorResponse` 处理一般错误
   - 使用 `createValidationErrorResponse` 处理验证错误
   - 考虑使用 `withErrorHandler` 包装整个处理函数

4. **类型安全**: 所有函数都提供完整的TypeScript类型支持，确保类型安全。

5. **一致性**: 使用统一函数确保所有API响应格式一致，便于前端处理。

## 响应格式

所有响应都遵循 `ApiResponse<T>` 格式：

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

分页响应额外包含 `pagination` 字段：

```typescript
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## 相关文件

- `src/lib/api-helpers.ts` - 辅助函数实现
- `src/types/index.ts` - `ApiResponse` 类型定义

