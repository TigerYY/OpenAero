import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

/**
 * 输入验证中间件
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      const body = await request.json();
      const result = schema.parse(body);
      
      // 将验证后的数据添加到请求中
      (request as any).validatedBody = result;
      
      return null;
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { 
            error: '输入验证失败',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: '无效的JSON数据' },
        { status: 400 }
      );
    }
  };
}

/**
 * 查询参数验证中间件
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (request: NextRequest): NextResponse | null => {
    try {
      const query = Object.fromEntries(request.nextUrl.searchParams);
      const result = schema.parse(query);
      
      // 将验证后的数据添加到请求中
      (request as any).validatedQuery = result;
      
      return null;
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { 
            error: '查询参数验证失败',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: '无效的查询参数' },
        { status: 400 }
      );
    }
  };
}

/**
 * 参数验证中间件
 */
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (request: NextRequest): NextResponse | null => {
    try {
      const params = getRouteParams(request);
      const result = schema.parse(params);
      
      // 将验证后的数据添加到请求中
      (request as any).validatedParams = result;
      
      return null;
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { 
            error: '路由参数验证失败',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: '无效的路由参数' },
        { status: 400 }
      );
    }
  };
}

/**
 * 获取路由参数（简化实现）
 */
function getRouteParams(request: NextRequest): Record<string, string> {
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  
  // 从URL中提取参数（简化实现）
  const params: Record<string, string> = {};
  
  // 这里需要根据实际路由结构来提取参数
  // 例如：/api/users/[id] -> { id: '123' }
  const pathSegments = pathname.split('/');
  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const paramName = segment.slice(1, -1);
      const paramValue = pathSegments[i + 1];
      if (paramValue) {
        params[paramName] = paramValue;
      }
    }
  }
  
  return params;
}

/**
 * 组合验证中间件
 */
export function validateAll<TBody, TQuery, TParams>(
  bodySchema?: z.ZodSchema<TBody>,
  querySchema?: z.ZodSchema<TQuery>,
  paramsSchema?: z.ZodSchema<TParams>
) {
  const middlewares: Array<(req: NextRequest) => Promise<NextResponse | null>> = [];
  
  if (bodySchema) {
    middlewares.push(validateBody(bodySchema));
  }
  
  if (querySchema) {
    middlewares.push(validateQuery(querySchema));
  }
  
  if (paramsSchema) {
    middlewares.push(validateParams(paramsSchema));
  }
  
  return async (request: NextRequest): Promise<NextResponse | null> => {
    for (const middleware of middlewares) {
      const result = await middleware(request);
      if (result) {
        return result;
      }
    }
    return null;
  };
}

/**
 * 常用验证模式
 */
export const validationPatterns = {
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string()
    .min(8, '密码至少8个字符')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/\d/, '密码必须包含数字')
    .regex(/[^a-zA-Z0-9]/, '密码必须包含特殊字符'),
  name: z.string().min(1, '姓名不能为空').max(50, '姓名不能超过50个字符'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码'),
  url: z.string().url('请输入有效的URL地址'),
  uuid: z.string().uuid('请输入有效的UUID'),
  positiveInt: z.number().int().positive('必须为正整数'),
  nonEmptyString: z.string().min(1, '不能为空字符串'),
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为YYYY-MM-DD')
} as const;