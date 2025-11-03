import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateToken, logUserAction } from '@/backend/auth/auth.middleware';
import { prisma } from '@/lib/prisma';

// 获取用户列表的查询参数验证
const getUsersQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
  role: z.enum(['CUSTOMER', 'CREATOR', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
  emailVerified: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// GET /api/admin/users - 获取用户列表
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
        { error: '权限不足，仅管理员可以访问用户列表' },
        { status: 403 }
      );
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = getUsersQuerySchema.parse(queryParams);

    const {
      page,
      limit,
      role,
      status,
      emailVerified,
      search,
      dateFrom,
      dateTo
    } = validatedQuery;

    // 构建查询条件
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // 计算分页
    const skip = (page - 1) * limit;

    // 并行获取用户列表和总数
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          emailVerified: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              solutions: true,
              solutionReviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // 格式化响应数据
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      solutionCount: user._count.solutions,
      reviewCount: user._count.solutionReviews,
    }));

    // 记录审计日志
    await logUserAction(
      user.userId,
      'GET_USER_LIST',
      'user',
      undefined,
      undefined,
      { page, limit, total },
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('获取用户列表失败:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '查询参数格式错误' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// 创建用户的请求体验证
const createUserSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少8个字符'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['CUSTOMER', 'CREATOR', 'ADMIN']).default('CUSTOMER'),
});

// POST /api/admin/users - 创建新用户
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
        { error: '权限不足，仅管理员可以创建用户' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱地址已被注册' },
        { status: 400 }
      );
    }

    // 创建用户
    const newUser = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: validatedData.password, // 注意：这里应该使用哈希后的密码
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: validatedData.role,
        emailVerified: true, // 管理员创建的用户默认已验证
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        status: true,
        createdAt: true,
      },
    });

    // 记录审计日志
    await logUserAction(
      user.userId,
      'CREATE_USER',
      'user',
      newUser.id,
      undefined,
      { email: newUser.email, role: newUser.role },
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      message: '用户创建成功',
      user: newUser,
    });

  } catch (error) {
    console.error('创建用户失败:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '创建用户失败' },
      { status: 500 }
    );
  }
}