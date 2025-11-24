/**
 * 评价回复 API
 * POST /api/products/[slug]/reviews/[reviewId]/replies - 添加评价回复
 */

import { ProductStatus } from '@prisma/client';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { getServerUser } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';
import { addReviewReply } from '@/lib/product-review';

export const dynamic = 'force-dynamic';

const createReplySchema = z.object({
  content: z.string().min(1, '回复内容不能为空').max(1000, '回复内容不能超过1000字符'),
});

/**
 * 判断字符串是否为 UUID 格式
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * POST /api/products/[slug]/reviews/[reviewId]/replies - 添加评价回复
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; reviewId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    const { slug, reviewId } = await params;
    if (!reviewId) {
      return createErrorResponse('评价ID不能为空', 400);
    }

    // 验证产品是否存在
    const isId = isUUID(slug);
    const product = await prisma.product.findFirst({
      where: {
        ...(isId ? { id: slug } : { slug }),
        status: ProductStatus.PUBLISHED,
        is_active: true,
      },
      select: { id: true },
    });

    if (!product) {
      return createErrorResponse('商品不存在', 404);
    }

    const productId = product.id;

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
    if (process.env.NODE_ENV === 'development') {
      console.error('添加回复失败:', error);
    }
    return createErrorResponse(
      error instanceof Error ? error.message : '添加回复失败',
      error instanceof Error && error.message.includes('不存在') ? 404 : 500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}
