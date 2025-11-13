/**
 * 评价回复 API
 * POST /api/products/[id]/reviews/[reviewId]/replies - 添加评价回复
 */

import { NextRequest } from 'next/server';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { addReviewReply } from '@/lib/product-review';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createReplySchema = z.object({
  content: z.string().min(1, '回复内容不能为空').max(1000, '回复内容不能超过1000字符'),
});

/**
 * POST /api/products/[id]/reviews/[reviewId]/replies - 添加评价回复
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    const { id: productId, reviewId } = await params;
    if (!productId || !reviewId) {
      return createErrorResponse('产品ID或评价ID不能为空', 400);
    }

    const body = await request.json();
    const validationResult = createReplySchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const reply = await addReviewReply(reviewId, user.id, validationResult.data.content);

    // 记录审计日志
    await logAuditAction(request, {
      userId: user.id,
      action: 'PRODUCT_REVIEW_REPLY_CREATED',
      resource: 'product_reviews',
      resource_id: reviewId,
      metadata: {
        replyId: reply.id,
        productId,
      },
    });

    return createSuccessResponse(reply, '回复添加成功');
  } catch (error) {
    console.error('添加回复失败:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : '添加回复失败',
      error instanceof Error && error.message.includes('不存在') ? 404 : 500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

