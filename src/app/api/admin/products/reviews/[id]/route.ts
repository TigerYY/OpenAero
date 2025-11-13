/**
 * 管理员评价审核 API
 * PUT /api/admin/products/reviews/[id] - 审核产品评价
 */

import { NextRequest } from 'next/server';
import { ReviewStatus } from '@prisma/client';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  requireAdminAuth,
  logAuditAction,
} from '@/lib/api-helpers';
import { reviewProductReview } from '@/lib/product-review';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const reviewReviewSchema = z.object({
  approved: z.boolean(),
  notes: z.string().max(500).optional(),
});

/**
 * PUT /api/admin/products/reviews/[id] - 审核产品评价
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

    const reviewId = params.id;
    if (!reviewId) {
      return createErrorResponse('评价ID不能为空', 400);
    }

    const body = await request.json();
    const validationResult = reviewReviewSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { approved, notes } = validationResult.data;

    await reviewProductReview(reviewId, approved, authResult.user.id, notes);

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: approved ? 'PRODUCT_REVIEW_APPROVED' : 'PRODUCT_REVIEW_REJECTED',
      resource: 'product_reviews',
      resource_id: reviewId,
      metadata: {
        approved,
        notes,
      },
    });

    return createSuccessResponse(
      null,
      approved ? '评价审核通过' : '评价已拒绝'
    );
  } catch (error) {
    console.error('审核评价失败:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : '审核评价失败',
      error instanceof Error && error.message.includes('不存在') ? 404 : 500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

