/**
 * 方案审核 API
 * POST /api/admin/solutions/[id]/review - 开始审核
 * PUT /api/admin/solutions/[id]/review - 完成审核
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  requireAdminAuth,
  requireReviewerAuth,
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { startReview, completeReview, getSolutionReviewHistory } from '@/lib/solution-review';
import { ReviewDecision } from '@prisma/client';

export const dynamic = 'force-dynamic';

const startReviewSchema = z.object({
  reviewerId: z.string().min(1, '审核员ID不能为空'),
});

const completeReviewSchema = z.object({
  reviewId: z.string().optional(), // 可选，如果没有提供则查找进行中的审核
  decision: z.nativeEnum(ReviewDecision),
  score: z.number().min(1).max(10).optional(),
  comments: z.string().max(2000, '审核意见不能超过2000个字符').optional(),
  qualityScore: z.number().min(1).max(10).optional(),
  completeness: z.number().min(1).max(10).optional(),
  innovation: z.number().min(1).max(10).optional(),
  marketPotential: z.number().min(1).max(10).optional(),
  decisionNotes: z.string().max(1000, '决策说明不能超过1000个字符').optional(),
  suggestions: z.array(z.string()).optional(),
});

/**
 * POST - 开始审核（分配审核员）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const solutionId = params.id;
    const body = await request.json();
    const validationResult = startReviewSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { reviewerId } = validationResult.data;

    const review = await startReview(solutionId, reviewerId);

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_REVIEW_STARTED',
      resource: 'solution_reviews',
      resource_id: review.id,
      metadata: {
        solutionId,
        reviewerId,
      },
    });

    return createSuccessResponse(review, '审核已开始', 201);
  } catch (error) {
    console.error('开始审核失败:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : '开始审核失败',
      error instanceof Error && error.message.includes('不存在') ? 404 : 500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

/**
 * PUT - 完成审核（批准/拒绝/需要修改）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 使用统一的审核员权限检查（REVIEWER 或 ADMIN）
    const authResult = await requireReviewerAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const solutionId = params.id;
    const body = await request.json();
    const validationResult = completeReviewSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const review = await completeReview(solutionId, validationResult.data);

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_REVIEW_COMPLETED',
      resource: 'solution_reviews',
      resource_id: review.id,
      metadata: {
        solutionId,
        decision: validationResult.data.decision,
        score: validationResult.data.score,
      },
    });

    // TODO: 发送审核结果通知邮件

    return createSuccessResponse(review, '审核已完成');
  } catch (error) {
    console.error('完成审核失败:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : '完成审核失败',
      error instanceof Error && error.message.includes('不存在') ? 404 : 500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

/**
 * GET - 获取方案的审核历史
 * **增强**：包含 fromStatus/toStatus 信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // **增强**：允许 CREATOR 查看自己方案的审核历史
    const authResult = await requireAdminAuth(request);
    let isAuthorized = authResult.success;

    // 如果不是管理员，尝试验证是否为 CREATOR
    if (!isAuthorized) {
      const { authenticateRequest } = await import('@/lib/auth-helpers');
      const creatorAuth = await authenticateRequest(request);
      
      if (creatorAuth.success && creatorAuth.user) {
        // 验证方案是否属于当前 CREATOR
        const { prisma } = await import('@/lib/prisma');
        const solution = await prisma.solution.findUnique({
          where: { id: params.id },
          select: { creatorId: true }
        });

        if (solution && (solution as any).creatorId === creatorAuth.user.id) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return createErrorResponse('未授权访问', 401);
    }

    const solutionId = params.id;
    const history = await getSolutionReviewHistory(solutionId);

    // **新增**：格式化返回数据，确保包含 fromStatus/toStatus
    const formattedHistory = history.map(review => ({
      id: review.id,
      solutionId: review.solutionId,
      reviewerId: review.reviewerId,
      status: review.status,
      fromStatus: review.fromStatus, // **新增**：审核前状态
      toStatus: review.toStatus, // **新增**：审核后状态
      score: review.score,
      comments: review.comments,
      qualityScore: review.qualityScore,
      completeness: review.completeness,
      innovation: review.innovation,
      marketPotential: review.marketPotential,
      decision: review.decision,
      decisionNotes: review.decisionNotes,
      suggestions: review.suggestions,
      reviewStartedAt: review.reviewStartedAt?.toISOString() || null,
      reviewedAt: review.reviewedAt?.toISOString() || null,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      reviewer: review.reviewer,
      solution: review.solution,
    }));

    return createSuccessResponse(formattedHistory, '获取审核历史成功');
  } catch (error) {
    console.error('获取审核历史失败:', error);
    return createErrorResponse(
      '获取审核历史失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

