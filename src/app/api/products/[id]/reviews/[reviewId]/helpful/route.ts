/**
 * 评价有用性 API
 * POST /api/products/[id]/reviews/[reviewId]/helpful - 标记评价为有用
 */

import { NextRequest } from 'next/server';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api-helpers';
import { markReviewHelpful } from '@/lib/product-review';

export const dynamic = 'force-dynamic';

/**
 * POST /api/products/[id]/reviews/[reviewId]/helpful - 标记评价为有用
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

    const { reviewId } = await params;
    if (!reviewId) {
      return createErrorResponse('评价ID不能为空', 400);
    }

    await markReviewHelpful(reviewId);

    return createSuccessResponse(null, '已标记为有用');
  } catch (error) {
    console.error('标记评价失败:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : '标记评价失败',
      error instanceof Error && error.message.includes('不存在') ? 404 : 500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

