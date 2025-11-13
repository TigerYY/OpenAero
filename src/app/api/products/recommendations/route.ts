/**
 * 产品推荐 API
 * GET /api/products/recommendations - 获取产品推荐
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api-helpers';
import {
  getRecommendationsByViewHistory,
  getRecommendationsByPurchaseHistory,
  getPopularProducts,
  getComprehensiveRecommendations,
} from '@/lib/product-recommendation';

export const dynamic = 'force-dynamic';

const recommendationQuerySchema = z.object({
  type: z.enum(['view', 'purchase', 'popular', 'comprehensive']).optional().default('comprehensive'),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  categoryId: z.string().optional(),
});

/**
 * GET /api/products/recommendations - 获取产品推荐
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser(); // 可选，未登录用户也可以获取推荐

    const searchParams = request.nextUrl.searchParams;
    const queryResult = recommendationQuerySchema.safeParse({
      type: searchParams.get('type'),
      limit: searchParams.get('limit'),
      categoryId: searchParams.get('categoryId'),
    });

    if (!queryResult.success) {
      return createErrorResponse('查询参数无效', 400);
    }

    const { type, limit, categoryId } = queryResult.data;

    let recommendations;

    switch (type) {
      case 'view':
        if (!user) {
          return createErrorResponse('需要登录才能获取基于浏览历史的推荐', 401);
        }
        recommendations = await getRecommendationsByViewHistory(user.id, limit);
        break;

      case 'purchase':
        if (!user) {
          return createErrorResponse('需要登录才能获取基于购买历史的推荐', 401);
        }
        recommendations = await getRecommendationsByPurchaseHistory(user.id, limit);
        break;

      case 'popular':
        recommendations = await getPopularProducts(limit, categoryId);
        break;

      case 'comprehensive':
      default:
        recommendations = await getComprehensiveRecommendations(user?.id, limit);
        break;
    }

    return createSuccessResponse(recommendations, '获取推荐成功');
  } catch (error) {
    console.error('获取产品推荐失败:', error);
    return createErrorResponse(
      '获取产品推荐失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

