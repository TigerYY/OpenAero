import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, logAuditAction, requireCreatorAuth } from '@/lib/api-helpers';
import { SolutionStatus } from '@prisma/client';

// POST /api/solutions/[id]/submit - 提交方案审核
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份和 CREATOR 权限（使用统一的权限检查函数）
    const authResult = await requireCreatorAuth(request);
    if (!authResult.success) {
      return authResult.error || createErrorResponse('未授权访问', 401);
    }

    const solutionId = params.id;

    // 获取方案
    const solution = await prisma.solution.findUnique({
      where: { id: solutionId },
      include: {
        creator: true,
        assets: true,
        _count: {
          select: {
            assets: true
          }
        }
      }
    });

    if (!solution) {
      return createErrorResponse('方案不存在', 404);
    }

    // 验证用户为方案所有者（ADMIN/SUPER_ADMIN 可以提交任何方案）
    const userRoles = Array.isArray(authResult.user?.roles) 
      ? authResult.user.roles 
      : (authResult.user?.role ? [authResult.user.role] : []);
    const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
    
    if (!isAdmin && solution.creatorId !== solution.creator?.id) {
      return createErrorResponse('无权提交此方案', 403);
    }

    // 验证方案状态为 DRAFT 或 REJECTED
    if (solution.status !== 'DRAFT' && solution.status !== 'REJECTED') {
      return createErrorResponse('只有草稿或已驳回的方案可以提交审核', 400);
    }

    // 验证必填字段完整性
    if (!solution.title || !solution.description || !solution.category) {
      return createErrorResponse('方案信息不完整，请填写标题、描述和分类', 400);
    }

    // 验证至少一个 asset
    if (solution._count.assets === 0) {
      return createErrorResponse('至少需要上传一个资产（图片、文档或视频）', 400);
    }

    const oldStatus = solution.status;

    // 使用事务：更新方案状态并创建审核记录
    const result = await prisma.$transaction(async (tx) => {
      // 更新方案状态为 PENDING_REVIEW
      const updatedSolution = await tx.solution.update({
        where: { id: solutionId },
        data: {
          status: 'PENDING_REVIEW',
          submittedAt: new Date(),
        }
      });

      // 创建 SolutionReview 记录（fromStatus → toStatus）
      await tx.solutionReview.create({
        data: {
          solutionId: solutionId,
          reviewerId: authResult.user.id, // 提交者ID（虽然还不是审核者，但记录提交操作）
          fromStatus: oldStatus,
          toStatus: 'PENDING_REVIEW',
          status: 'PENDING',
          decision: 'PENDING',
          comments: '方案已提交审核',
        }
      });

      return updatedSolution;
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_SUBMITTED',
      resource: 'solution',
      resourceId: solutionId,
      oldValue: {
        status: oldStatus,
      },
      newValue: {
        status: 'PENDING_REVIEW',
        submittedAt: result.submittedAt?.toISOString(),
      },
    });

    return createSuccessResponse(
      {
        id: result.id,
        status: result.status,
        submittedAt: result.submittedAt?.toISOString(),
      },
      '方案已成功提交审核'
    );

  } catch (error: any) {
    console.error('提交方案审核失败:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('提交审核失败'),
      error.statusCode || 500
    );
  }
}