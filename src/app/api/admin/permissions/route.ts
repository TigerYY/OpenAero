import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateToken, logUserAction } from '@/backend/auth/auth.middleware';
import { prisma } from '@/lib/prisma';

// 获取权限列表的查询参数验证
const getPermissionsQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('50').transform(Number),
  resource: z.string().optional(),
  action: z.string().optional(),
  search: z.string().optional(),
});

// GET /api/admin/permissions - 获取权限列表
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult;
    }

    const user = (request as any).user;
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '权限不足，仅管理员可以访问权限列表' },
        { status: 403 }
      );
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = getPermissionsQuerySchema.parse(queryParams);

    const { page, limit, resource, action, search } = validatedQuery;

    // 构建查询条件
    const where: any = {};

    if (resource) {
      where.resource = resource;
    }

    if (action) {
      where.action = action;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 计算分页
    const skip = (page - 1) * limit;

    // 并行获取权限列表和总数
    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        include: {
          roles: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { level: 'desc' },
        skip,
        take: limit,
      }),
      prisma.permission.count({ where }),
    ]);

    // 记录审计日志
    await logUserAction(
      user.userId,
      'GET_PERMISSION_LIST',
      'permission',
      undefined,
      undefined,
      { page, limit, total },
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      permissions: permissions.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        resource: p.resource,
        action: p.action,
        level: p.level,
        isSystem: p.isSystem,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('获取权限列表失败:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '查询参数格式错误' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '获取权限列表失败' },
      { status: 500 }
    );
  }
}

// 创建权限的请求体验证
const createPermissionSchema = z.object({
  name: z.string().min(1, '权限名称不能为空'),
  description: z.string().optional(),
  resource: z.string().min(1, '资源类型不能为空'),
  action: z.string().min(1, '操作类型不能为空'),
  level: z.number().min(1).max(100).default(1),
});

// POST /api/admin/permissions - 创建新权限
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult;
    }

    const user = (request as any).user;
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '权限不足，仅管理员可以创建权限' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createPermissionSchema.parse(body);

    // 检查权限是否已存在
    const existingPermission = await prisma.permission.findFirst({
      where: {
        resource: validatedData.resource,
        action: validatedData.action,
      },
    });

    if (existingPermission) {
      return NextResponse.json(
        { error: '该资源操作组合已存在' },
        { status: 400 }
      );
    }

    // 创建权限
    const newPermission = await prisma.permission.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || '',
        resource: validatedData.resource,
        action: validatedData.action,
        level: validatedData.level,
        isSystem: false,
      },
    });

    // 记录审计日志
    await logUserAction(
      user.userId,
      'CREATE_PERMISSION',
      'permission',
      newPermission.id,
      undefined,
      { name: newPermission.name, resource: newPermission.resource, action: newPermission.action },
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      message: '权限创建成功',
      permission: newPermission,
    });

  } catch (error) {
    console.error('创建权限失败:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '创建权限失败' },
      { status: 500 }
    );
  }
}