import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateToken, logUserAction } from '@/backend/auth/auth.middleware';
import { solutionService } from '@/backend/solution/solution.service';
import { db } from '@/lib/db';
import { updateSolutionSchema } from '@/lib/validations';
import { ApiResponse } from '@/types';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/solutions/[id] - 获取单个方案详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const solution = await db.solution.findUnique({
      where: { id },
      include: {
        creator: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        },
        files: true,
        solutionReviews: {
          include: {
            reviewer: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            solutionReviews: true,
            orders: true
          }
        }
      }
    });

    if (!solution) {
      const response: ApiResponse<null> = {
        success: false,
        error: '方案不存在',
        data: null
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: solution.id,
        title: solution.title,
        description: solution.description,
        category: solution.category,
        status: solution.status,
        price: Number(solution.price),
        version: solution.version,
        tags: solution.features || [],
        images: solution.images || [],
        createdAt: solution.createdAt,
        updatedAt: solution.updatedAt,
        creatorId: solution.creatorId,
        creatorName: solution.creator?.user ? `${solution.creator.user.firstName ?? ''} ${solution.creator.user.lastName ?? ''}`.trim() || 'Unknown' : 'Unknown',
        reviewCount: (solution as any)._count?.solutionReviews || 0,
        downloadCount: (solution as any)._count?.orders || 0,
        specs: solution.specs || {},
        bom: solution.bom || [],
        files: solution.files || [],
        reviews: (solution as any).solutionReviews || []
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('获取方案详情失败:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: '获取方案详情失败',
      data: null
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/solutions/[id] - 更新方案
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticateToken(request);
    if (!authResult.success || !authResult.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: '未授权访问',
        data: null
      };
      return NextResponse.json(response, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    
    // 验证输入数据
    const validatedData = updateSolutionSchema.parse(body);

    const solution = await solutionService.updateSolution(id, validatedData, authResult.user.id);

    // 记录审计日志
    await logUserAction(
      authResult.user.id,
      'update_solution',
      'solution',
      id,
      undefined,
      body,
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
        creatorName: solution.creator?.user ? `${solution.creator.user.firstName ?? ''} ${solution.creator.user.lastName ?? ''}`.trim() || 'Unknown' : 'Unknown',
        specs: solution.specs || {},
        bom: solution.bom || []
      }
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('更新方案失败:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error.message || '更新方案失败',
      data: null
    };
    return NextResponse.json(response, { status: error.statusCode || 500 });
  }
}

// DELETE /api/solutions/[id] - 删除方案
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticateToken(request);
    if (!authResult.success || !authResult.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: '未授权访问',
        data: null
      };
      return NextResponse.json(response, { status: 401 });
    }

    const { id } = params;

    await solutionService.deleteSolution(id, authResult.user.id);

    // 记录审计日志
    await logUserAction(
      authResult.user.id,
      'delete_solution',
      'solution',
      id,
      undefined,
      {},
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    const response: ApiResponse<null> = {
      success: true,
      data: null
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('删除方案失败:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error.message || '删除方案失败',
      data: null
    };
    return NextResponse.json(response, { status: error.statusCode || 500 });
  }
}