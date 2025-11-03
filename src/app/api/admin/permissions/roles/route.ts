import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateToken, logUserAction } from '@/backend/auth/auth.middleware';
import { prisma } from '@/lib/prisma';

// GET /api/admin/permissions/roles - 获取角色列表
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
        { error: '权限不足，仅管理员可以访问角色列表' },
        { status: 403 }
      );
    }

    // 获取角色列表，包含权限和用户数量
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          select: {
            id: true,
            name: true,
            description: true,
            resource: true,
            action: true,
            level: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { level: 'desc' },
    });

    // 格式化响应数据
    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      level: role.level,
      isSystem: role.isSystem,
      permissions: role.permissions,
      userCount: role._count.users,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    // 记录审计日志
    await logUserAction(
      user.userId,
      'GET_ROLE_LIST',
      'role',
      undefined,
      undefined,
      { count: formattedRoles.length },
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      roles: formattedRoles,
    });

  } catch (error) {
    console.error('获取角色列表失败:', error);
    return NextResponse.json(
      { error: '获取角色列表失败' },
      { status: 500 }
    );
  }
}

// 创建角色的请求体验证
const createRoleSchema = z.object({
  name: z.string().min(1, '角色名称不能为空'),
  description: z.string().optional(),
  level: z.number().min(1).max(100).default(1),
});

// POST /api/admin/permissions/roles - 创建新角色
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
        { error: '权限不足，仅管理员可以创建角色' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createRoleSchema.parse(body);

    // 检查角色是否已存在
    const existingRole = await prisma.role.findFirst({
      where: {
        name: validatedData.name,
      },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: '该角色名称已存在' },
        { status: 400 }
      );
    }

    // 创建角色
    const newRole = await prisma.role.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || '',
        level: validatedData.level,
        isSystem: false,
      },
      include: {
        permissions: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    // 记录审计日志
    await logUserAction(
      user.userId,
      'CREATE_ROLE',
      'role',
      newRole.id,
      undefined,
      { name: newRole.name, level: newRole.level },
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      message: '角色创建成功',
      role: {
        id: newRole.id,
        name: newRole.name,
        description: newRole.description,
        level: newRole.level,
        isSystem: newRole.isSystem,
        permissions: newRole.permissions,
        userCount: newRole._count.users,
        createdAt: newRole.createdAt,
        updatedAt: newRole.updatedAt,
      },
    });

  } catch (error) {
    console.error('创建角色失败:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '创建角色失败' },
      { status: 500 }
    );
  }
}