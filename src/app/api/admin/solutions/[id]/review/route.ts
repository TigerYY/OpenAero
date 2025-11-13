/**
 * 方案审核 API
 * POST /api/admin/solutions/[id]/review - 开始审核
 * PUT /api/admin/solutions/[id]/review - 完成审核
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  requireAdminAuth,
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
    const authResult = await requireAdminAuth(request);
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
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const solutionId = params.id;
    const history = await getSolutionReviewHistory(solutionId);

    return createSuccessResponse(history, '获取审核历史成功');
  } catch (error) {
    console.error('获取审核历史失败:', error);
    return createErrorResponse(
      '获取审核历史失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

