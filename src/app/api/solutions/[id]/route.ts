import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { solutionService } from '@/backend/solution/solution.service';
import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { updateSolutionSchema } from '@/lib/validations';
import { ApiResponse } from '@/types';
import { logAuditAction, createSuccessResponse, createErrorResponse } from '@/lib/api-helpers';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/solutions/[id] - 获取单个方案详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const solution = await prisma.solution.findUnique({
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
      return createErrorResponse('方案不存在', 404);
    }

    return createSuccessResponse({
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
    }, '获取方案详情成功');
  } catch (error) {
    console.error('获取方案详情失败:', error);
    return createErrorResponse('获取方案详情失败', 500);
  }
}

// PUT /api/solutions/[id] - 更新方案
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse('未授权访问', 401);
    }

    const { id } = params;
    const body = await request.json();
    
    // 获取旧值用于审计日志
    const oldSolution = await prisma.solution.findUnique({ where: { id } });
    
    // 验证输入数据
    const validatedData = updateSolutionSchema.parse(body);

    const solution = await solutionService.updateSolution(id, validatedData, authResult.user.id);

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_UPDATED',
      resource: 'solution',
      resourceId: solution.id,
      oldValue: oldSolution ? {
        title: oldSolution.title,
        category: oldSolution.category,
        price: oldSolution.price,
        status: oldSolution.status,
      } : undefined,
      newValue: {
        title: solution.title,
        category: solution.category,
        price: solution.price,
        status: solution.status,
      },
    });

    return createSuccessResponse({
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
    }, '更新方案成功');
  } catch (error: any) {
    console.error('更新方案失败:', error);
    return createErrorResponse(error.message || '更新方案失败', error.statusCode || 500);
  }
}

// DELETE /api/solutions/[id] - 删除方案
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse('未授权访问', 401);
    }

    const { id } = params;

    // 获取旧值用于审计日志
    const oldSolution = await prisma.solution.findUnique({ where: { id } });
    if (!oldSolution) {
      return createErrorResponse('方案不存在', 404);
    }

    await solutionService.deleteSolution(id, authResult.user.id);

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_DELETED',
      resource: 'solution',
      resourceId: id,
      oldValue: {
        title: oldSolution.title,
        category: oldSolution.category,
        price: oldSolution.price,
        status: oldSolution.status,
      },
    });

    return createSuccessResponse(null, '删除方案成功');
  } catch (error: any) {
    console.error('删除方案失败:', error);
    return createErrorResponse(error.message || '删除方案失败', error.statusCode || 500);
  }
}