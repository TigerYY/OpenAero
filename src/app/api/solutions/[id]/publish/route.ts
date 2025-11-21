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
  action: z.enum(['PUBLISH', 'ARCHIVE', 'SUSPEND', 'RESTORE'], {
    errorMap: () => ({ message: 'action 必须是 PUBLISH、ARCHIVE、SUSPEND 或 RESTORE' })
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
    let timestampField: 'published_at' | 'archived_at' | null = null;
    let actionMessage: string;

    if (validatedData.action === 'PUBLISH') {
      // 发布：验证状态为 READY_TO_PUBLISH
      if (solution.status !== 'READY_TO_PUBLISH') {
        return createErrorResponse('只有准备发布的方案可以发布，请先进行上架优化', 400);
      }
      newStatus = 'PUBLISHED';
      timestampField = 'published_at';
      actionMessage = '发布';
    } else if (validatedData.action === 'SUSPEND') {
      // 临时下架：验证状态为 PUBLISHED
      if (solution.status !== 'PUBLISHED') {
        return createErrorResponse('只有已发布的方案可以临时下架', 400);
      }
      newStatus = 'SUSPENDED';
      timestampField = null; // SUSPENDED 不改变 published_at
      actionMessage = '临时下架';
    } else if (validatedData.action === 'RESTORE') {
      // 恢复：验证状态为 SUSPENDED
      if (solution.status !== 'SUSPENDED') {
        return createErrorResponse('只有临时下架的方案可以恢复', 400);
      }
      newStatus = 'PUBLISHED';
      timestampField = null; // RESTORE 不改变 published_at
      actionMessage = '恢复';
    } else {
      // 永久下架：验证状态为 PUBLISHED
      if (solution.status !== 'PUBLISHED') {
        return createErrorResponse('只有已发布的方案可以永久下架', 400);
      }
      newStatus = 'ARCHIVED';
      timestampField = 'archived_at';
      actionMessage = '永久下架';
    }

    // 使用事务更新方案状态并创建审核记录
    const result = await prisma.$transaction(async (tx) => {
      // 构建更新数据
      const updateData: any = {
        status: newStatus,
      };
      
      // 只在需要时更新时间戳字段
      if (timestampField) {
        updateData[timestampField] = new Date();
      }

      // 更新方案状态
      const updatedSolution = await tx.solution.update({
        where: { id },
        data: updateData
      });

      // 创建审核记录（记录状态转换）
      let reviewDecision: 'APPROVED' | 'REJECTED' = 'APPROVED';
      if (validatedData.action === 'ARCHIVE') {
        reviewDecision = 'REJECTED';
      }

      await tx.solutionReview.create({
        data: {
          solution_id: id,
          reviewer_id: authResult.user.id,
          from_status: solution.status,
          to_status: newStatus,
          status: 'COMPLETED',
          decision: reviewDecision,
          comments: `${actionMessage}方案`,
          reviewed_at: new Date(),
        }
      });

      return updatedSolution;
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: validatedData.action === 'PUBLISH' ? 'SOLUTION_PUBLISHED' :
              validatedData.action === 'SUSPEND' ? 'SOLUTION_SUSPENDED' :
              validatedData.action === 'RESTORE' ? 'SOLUTION_RESTORED' :
              'SOLUTION_ARCHIVED',
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
        publishedAt: (result as any).published_at?.toISOString() || null,
        archivedAt: (result as any).archived_at?.toISOString() || null,
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

