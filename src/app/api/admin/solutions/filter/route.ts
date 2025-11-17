import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';

// 筛选参数验证模式
const filterSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED']).optional(),
  creatorId: z.string().optional(),
  category: z.string().optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'price', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

// GET /api/admin/solutions/filter - 管理员筛选方案
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份和权限
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.error || NextResponse.json(
        {
          success: false,
          error: '未授权访问',
          data: null
        } as ApiResponse<null>,
        { status: 401 }
      );
    }

    // 检查管理员权限
    const userRoles = authResult.user.roles || [];
    if (!userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      const response: ApiResponse<null> = {
        success: false,
        error: '权限不足，仅管理员可以筛选方案',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      status: searchParams.get('status') || undefined,
      creatorId: searchParams.get('creatorId') || undefined,
      category: searchParams.get('category') || undefined,
      priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined,
      priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20
    };

    // 验证参数
    const validatedParams = filterSchema.parse(queryParams);

    // 构建查询条件
    const where: any = {};

    if (validatedParams.status) {
      where.status = validatedParams.status;
    }

    if (validatedParams.creatorId) {
      where.creatorId = validatedParams.creatorId;
    }

    if (validatedParams.category) {
      where.category = validatedParams.category;
    }

    if (validatedParams.priceMin !== undefined || validatedParams.priceMax !== undefined) {
      where.price = {};
      if (validatedParams.priceMin !== undefined) {
        where.price.gte = validatedParams.priceMin;
      }
      if (validatedParams.priceMax !== undefined) {
        where.price.lte = validatedParams.priceMax;
      }
    }

    if (validatedParams.dateFrom || validatedParams.dateTo) {
      where.createdAt = {};
      if (validatedParams.dateFrom) {
        where.createdAt.gte = new Date(validatedParams.dateFrom);
      }
      if (validatedParams.dateTo) {
        where.createdAt.lte = new Date(validatedParams.dateTo);
      }
    }

    if (validatedParams.search) {
      where.OR = [
        { title: { contains: validatedParams.search, mode: 'insensitive' } },
        { description: { contains: validatedParams.search, mode: 'insensitive' } }
      ];
    }

    // 计算分页
    const skip = (validatedParams.page - 1) * validatedParams.limit;

    // 查询方案
    const [solutions, totalCount] = await Promise.all([
      prisma.solution.findMany({
        where,
        include: {
          creator: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true
                }
              }
            }
          }
        },
        orderBy: {
          [validatedParams.sortBy]: validatedParams.sortOrder
        },
        skip,
        take: validatedParams.limit
      }),
      prisma.solution.count({ where })
    ]);

    // 格式化返回数据
    const formattedSolutions = solutions.map(solution => ({
      id: solution.id,
      title: solution.title,
      description: solution.description,
      category: solution.category,
      price: solution.price,
      status: solution.status,
      createdAt: solution.createdAt,
      updatedAt: solution.updatedAt,
      reviewedAt: solution.reviewedAt,
      reviewNotes: solution.reviewNotes,
      creator: {
        id: solution.creator.id,
        name: `${solution.creator.user.firstName || ''} ${solution.creator.user.lastName || ''}`.trim() || solution.creator.user.email,
        email: solution.creator.user.email,
        avatar: solution.creator.user.avatar
      }
    }));

    const totalPages = Math.ceil(totalCount / validatedParams.limit);

    const response: ApiResponse<{
      solutions: typeof formattedSolutions;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
      filters: typeof validatedParams;
    }> = {
      success: true,
      data: {
        solutions: formattedSolutions,
        pagination: {
          page: validatedParams.page,
          limit: validatedParams.limit,
          total: totalCount,
          totalPages,
          hasNext: validatedParams.page < totalPages,
          hasPrev: validatedParams.page > 1
        },
        filters: validatedParams
      },
      message: `找到 ${totalCount} 个符合条件的方案`
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('筛选方案失败:', error);
    
    if (error instanceof z.ZodError) {
      const response: ApiResponse<null> = {
        success: false,
        error: JSON.stringify(error.errors),
        data: null
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '筛选方案失败',
      data: null
    };

    return NextResponse.json(response, { status: 500 });
  }
}