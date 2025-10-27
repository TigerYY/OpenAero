import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateToken, logUserAction } from '@/backend/auth/auth.middleware';
import { authenticateRequest } from '@/lib/auth-helpers';
import { ApiResponse } from '@/types';
import { solutionService } from '@/backend/solution/solution.service';
import { createSolutionSchema } from '@/lib/validations';

// GET /api/solutions - 获取方案列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 构建查询条件
    const where: any = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 获取总数
    const total = await db.solution.count({ where });

    // 获取方案列表
    const solutions = await db.solution.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        solutions: solutions.map(solution => ({
          id: solution.id,
          title: solution.title,
          description: solution.description,
          category: solution.category,
          status: solution.status,
          price: solution.price,
          version: solution.version,
          tags: solution.features || [],
          images: solution.images || [],
          createdAt: solution.createdAt,
          updatedAt: solution.updatedAt,
          creatorId: solution.creatorId,
          creatorName: solution.user?.firstName && solution.user?.lastName 
                        ? `${solution.user.firstName} ${solution.user.lastName}` 
                        : 'Unknown',
          reviewCount: solution._count.reviews,
          downloadCount: 0, // Temporarily set to 0 since orders relationship is problematic
          specs: solution.specs || {},
          bom: solution.bom || []
        })),
        total,
        page,
        limit,
        totalPages
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('获取方案列表失败:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    const response: ApiResponse<null> = {
      success: false,
      error: '获取方案列表失败',
      data: null
    };
    return NextResponse.json(response, { status: 500 });
  }
}
// POST /api/solutions - 创建新方案
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
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

    const body = await request.json();
    
    // 验证输入数据
    const validatedData = createSolutionSchema.parse(body);
    
    // 创建方案
    const solution = await solutionService.createSolution(validatedData, authResult.user.id);

    // 记录审计日志
    await logUserAction(
      authResult.user.id,
      'create_solution',
      'solution',
      solution.id,
      undefined,
      JSON.stringify({ title: solution.title, category: solution.category }),
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: solution.id,
        title: solution.title,
        description: solution.description,
        category: solution.category,
        status: solution.status,
        price: solution.price,
        version: solution.version,
        tags: solution.features || [],
        images: solution.images || [],
        createdAt: solution.createdAt,
        updatedAt: solution.updatedAt,
        creatorId: solution.creatorId,
        creatorName: solution.creator?.user?.name || 'Unknown',
        specs: solution.specs || {},
        bom: solution.bom || []
      }
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('创建方案失败:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '创建方案失败',
      data: null
    };
    return NextResponse.json(response, { status: 500 });
  }
}