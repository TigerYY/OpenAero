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
import { createSupabaseAdmin } from '@/lib/auth/supabase-client';

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
      console.error('[GET /api/admin/users] 权限验证失败:', authResult);
      // 确保返回响应对象
      if (authResult.response) {
        return authResult.response;
      }
      return createErrorResponse('权限验证失败', 401);
    }
    
    console.log('[GET /api/admin/users] 权限验证成功，用户ID:', authResult.user.id, '角色:', authResult.user.role);

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

    // 检查数据库中的总用户数（不应用任何筛选条件）
    const totalUsersInDb = await prisma.userProfile.count();
    console.log('[GET /api/admin/users] 数据库中的总用户数（无筛选）:', totalUsersInDb);
    
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
    
    console.log('[GET /api/admin/users] 查询结果:', {
      usersCount: users.length,
      total,
      totalUsersInDb,
      page,
      limit,
      where,
      whereString: JSON.stringify(where, null, 2),
    });
    
    if (users.length > 0) {
      console.log('[GET /api/admin/users] 第一个用户示例:', {
        user_id: users[0].user_id,
        role: users[0].role,
        status: users[0].status,
        display_name: users[0].display_name,
      });
    } else {
      console.warn('[GET /api/admin/users] 查询返回空结果，可能原因：');
      console.warn('  1. 数据库中没有用户数据');
      console.warn('  2. 筛选条件太严格:', where);
      console.warn('  3. 分页参数问题: page=', page, 'limit=', limit, 'skip=', skip);
    }

    // 从 Supabase Auth 获取用户邮箱信息
    const supabaseAdmin = createSupabaseAdmin();
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('[GET /api/admin/users] 获取 Supabase Auth 用户失败:', authError);
    } else {
      console.log('[GET /api/admin/users] Supabase Auth 用户数量:', authUsers?.users?.length || 0);
    }
    
    // 创建 user_id -> email 映射
    const emailMap = new Map<string, string>();
    authUsers?.users.forEach(authUser => {
      emailMap.set(authUser.id, authUser.email || '');
    });
    
    console.log('[GET /api/admin/users] Email 映射数量:', emailMap.size);

    // 格式化响应数据（使用字段名转换工具）
    const formattedUsers = users.map((user) => {
      const email = emailMap.get(user.user_id) || '';
      const authUser = authUsers?.users.find(u => u.id === user.user_id);
      
      // 使用字段名转换工具将 snake_case 转换为 camelCase
      const baseUser = convertSnakeToCamel({
        id: user.user_id,
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        display_name: user.display_name,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        is_blocked: user.is_blocked,
        blocked_reason: user.blocked_reason,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at,
      });
      
      const formatted = {
        ...baseUser,
        id: user.user_id, // 保持 id 为 user_id
        email,
        emailVerified: !!authUser?.email_confirmed_at,
        solutionCount: 0, // TODO: 从数据库查询
        reviewCount: 0, // TODO: 从数据库查询
        createdAt: user.created_at.toISOString(),
        updatedAt: user.updated_at.toISOString(),
        lastLoginAt: user.last_login_at?.toISOString(),
      };
      
      if (!email) {
        console.warn('[GET /api/admin/users] 用户', user.user_id, '没有找到对应的邮箱');
      }
      
      return formatted;
    });
    
    console.log('[GET /api/admin/users] 格式化后的用户数量:', formattedUsers.length);

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
      page,
      limit,
      total,
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