/**
 * 产品评价统计 API
 * GET /api/products/[id]/reviews/stats - 获取产品评价统计信息
 */

import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers';
import { getProductReviewStats } from '@/lib/product-review';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/[id]/reviews/stats - 获取产品评价统计
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = id;
    if (!productId) {
      return createErrorResponse('产品ID不能为空', 400);
    }

    const stats = await getProductReviewStats(productId);

    return createSuccessResponse(stats, '获取评价统计成功');
  } catch (error) {
    console.error('获取评价统计失败:', error);
    return createErrorResponse(
      '获取评价统计失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

