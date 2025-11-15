import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdminAuth } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse, logAuditAction } from '@/lib/api-helpers';
import { SolutionStatus } from '@prisma/client';

interface RouteParams {
  params: {
    id: string;
  };
}

const publishSchema = z.object({
  action: z.enum(['PUBLISH', 'ARCHIVE'], {
    errorMap: () => ({ message: 'action 必须是 PUBLISH 或 ARCHIVE' })
  }),
});

// POST /api/solutions/[id]/publish - 发布或下架方案
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = params;
    const body = await request.json();

    // 验证输入数据
    const validatedData = publishSchema.parse(body);

    // 获取方案
    const solution = await prisma.solution.findUnique({
      where: { id },
      include: {
        creator: true
      }
    });

    if (!solution) {
      return createErrorResponse('方案不存在', 404);
    }

    let newStatus: SolutionStatus;
    let timestampField: 'publishedAt' | 'archivedAt';
    let actionMessage: string;

    if (validatedData.action === 'PUBLISH') {
      // 发布：验证状态为 APPROVED
      if (solution.status !== 'APPROVED') {
        return createErrorResponse('只有已审核通过的方案可以发布', 400);
      }
      newStatus = 'PUBLISHED';
      timestampField = 'publishedAt';
      actionMessage = '发布';
    } else {
      // 下架：验证状态为 PUBLISHED
      if (solution.status !== 'PUBLISHED') {
        return createErrorResponse('只有已发布的方案可以下架', 400);
      }
      newStatus = 'ARCHIVED';
      timestampField = 'archivedAt';
      actionMessage = '下架';
    }

    // 使用事务更新方案状态并创建审核记录
    const result = await prisma.$transaction(async (tx) => {
      // 更新方案状态
      const updatedSolution = await tx.solution.update({
        where: { id },
        data: {
          status: newStatus,
          [timestampField]: new Date(),
        }
      });

      // 创建审核记录（记录状态转换）
      await tx.solutionReview.create({
        data: {
          solutionId: id,
          reviewerId: authResult.user.id,
          fromStatus: solution.status,
          toStatus: newStatus,
          status: 'COMPLETED',
          decision: validatedData.action === 'PUBLISH' ? 'APPROVED' : 'REJECTED',
          comments: `${actionMessage}方案`,
          reviewedAt: new Date(),
        }
      });

      return updatedSolution;
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: validatedData.action === 'PUBLISH' ? 'SOLUTION_PUBLISHED' : 'SOLUTION_ARCHIVED',
      resource: 'solution',
      resourceId: id,
      oldValue: {
        status: solution.status,
      },
      newValue: {
        status: newStatus,
        [timestampField]: new Date().toISOString(),
      },
    });

    return createSuccessResponse(
      {
        id: result.id,
        status: result.status,
        publishedAt: result.publishedAt?.toISOString() || null,
        archivedAt: result.archivedAt?.toISOString() || null,
      },
      `方案${actionMessage}成功`
    );
  } catch (error) {
    console.error('发布/下架方案失败:', error);
    
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }
    
    return createErrorResponse(
      error instanceof Error ? error : new Error('发布/下架方案失败'),
      500
    );
  }
}

