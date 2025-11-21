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
        files: true,
        _count: {
          select: {
            files: true
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
    
    // 获取当前用户的 CreatorProfile ID
    const currentUserCreatorProfile = await prisma.creatorProfile.findUnique({
      where: { user_id: authResult.user.id },
      select: { id: true },
    });
    
    if (!isAdmin && (!currentUserCreatorProfile || solution.creator_id !== currentUserCreatorProfile.id)) {
      return createErrorResponse('无权提交此方案', 403);
    }

    // 验证方案状态为 DRAFT、REJECTED 或 PENDING_REVIEW（需修改的情况）
    // 如果是 PENDING_REVIEW，需要检查是否有 NEEDS_REVISION 的审核记录
    if (solution.status !== 'DRAFT' && solution.status !== 'REJECTED' && solution.status !== 'PENDING_REVIEW') {
      return createErrorResponse('只有草稿、已驳回或需修改状态的方案可以提交审核', 400);
    }
    
    // 如果是 PENDING_REVIEW 状态，检查是否有 NEEDS_REVISION 的审核记录
    if (solution.status === 'PENDING_REVIEW') {
      const needsRevisionReview = await prisma.solutionReview.findFirst({
        where: {
          solution_id: solutionId,
          decision: { in: ['NEEDS_REVISION', 'PENDING'] },
          status: 'COMPLETED',
        },
        orderBy: { created_at: 'desc' },
      });
      
      if (!needsRevisionReview) {
        return createErrorResponse('该方案正在审核中，无法重新提交', 400);
      }
      
      // 检查是否有更新的 APPROVED 审核记录
      const latestApprovedReview = await prisma.solutionReview.findFirst({
        where: {
          solution_id: solutionId,
          decision: 'APPROVED',
          status: 'COMPLETED',
          created_at: { gt: needsRevisionReview.created_at },
        },
      });
      
      if (latestApprovedReview) {
        return createErrorResponse('该方案已通过审核，无需重新提交', 400);
      }
    }

    // 验证必填字段完整性
    if (!solution.title || !solution.description || !solution.category) {
      return createErrorResponse('方案信息不完整，请填写标题、描述和分类', 400);
    }

    // 验证至少一个 asset
    if (solution._count.files === 0) {
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
          submitted_at: new Date(),
        }
      });

      // 创建 SolutionReview 记录（fromStatus → toStatus）
      await tx.solutionReview.create({
        data: {
          solution_id: solutionId,
          reviewer_id: authResult.user.id, // 提交者ID（虽然还不是审核者，但记录提交操作）
          from_status: oldStatus,
          to_status: 'PENDING_REVIEW',
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
        submittedAt: result.submitted_at?.toISOString(),
      },
    });

    return createSuccessResponse(
      {
        id: result.id,
        status: result.status,
        submittedAt: result.submitted_at?.toISOString(),
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