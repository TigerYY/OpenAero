import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  requireAdminAuth,
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createPaginatedResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 获取用户列表的查询参数验证
const getUsersQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
  role: z.enum(['USER', 'CREATOR', 'REVIEWER', 'FACTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']).optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

/**
 * GET /api/admin/users - 获取用户列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = getUsersQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { page, limit, role, status, search, dateFrom, dateTo } = validationResult.data;

    // 构建查询条件（使用 UserProfile）
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { display_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) {
        where.created_at.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.created_at.lte = new Date(dateTo);
      }
    }

    // 计算分页
    const skip = (page - 1) * limit;

    // 并行获取用户列表和总数
    const [users, total] = await Promise.all([
      prisma.userProfile.findMany({
        where,
        select: {
          id: true,
          user_id: true,
          first_name: true,
          last_name: true,
          display_name: true,
          avatar: true,
          role: true,
          status: true,
          created_at: true,
          updated_at: true,
          last_login_at: true,
          is_blocked: true,
          blocked_reason: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.userProfile.count({ where }),
    ]);

    // 格式化响应数据
    const formattedUsers = users.map((user) => ({
      id: user.user_id,
      email: '', // 需要从 Supabase Auth 获取
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.display_name,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      isBlocked: user.is_blocked,
      blockedReason: user.blocked_reason,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_login_at,
    }));

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'GET_USER_LIST',
      resource: 'user_profiles',
      metadata: {
        page,
        limit,
        total,
        filters: { role, status, search },
      },
    });

    return createPaginatedResponse(
      formattedUsers,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      '获取用户列表成功'
    );
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return createErrorResponse(
      '获取用户列表失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

// 创建用户的请求体验证
const createUserSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少8个字符'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['USER', 'CREATOR', 'REVIEWER', 'FACTORY_MANAGER', 'ADMIN']).default('USER'),
});

/**
 * POST /api/admin/users - 创建新用户
 * 注意：由于使用 Supabase Auth，需要通过 Supabase Admin API 创建用户
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const body = await request.json();
    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const validatedData = validationResult.data;

    // TODO: 使用 Supabase Admin API 创建用户
    // 1. 在 Supabase Auth 中创建用户
    // 2. 自动创建 UserProfile（通过触发器）
    // 3. 更新 UserProfile 的额外信息

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'CREATE_USER',
      resource: 'user_profiles',
      metadata: {
        email: validatedData.email,
        role: validatedData.role,
      },
    });

    return createErrorResponse('用户创建功能需要集成 Supabase Admin API', 501);
  } catch (error) {
    console.error('创建用户失败:', error);
    return createErrorResponse(
      '创建用户失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}