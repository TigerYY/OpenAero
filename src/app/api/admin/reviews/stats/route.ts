/**
 * 审核统计 API
 * GET /api/admin/reviews/stats - 获取审核统计信息
 */

import { NextRequest } from 'next/server';
import {
  requireAdminAuth,
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api-helpers';
import { getReviewStatistics } from '@/lib/solution-review';

export const dynamic = 'force-dynamic';

/**
 * GET - 获取审核统计
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const searchParams = request.nextUrl.searchParams;
    const reviewerId = searchParams.get('reviewerId') || undefined;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    const stats = await getReviewStatistics(reviewerId, startDate, endDate);

    return createSuccessResponse(stats, '获取审核统计成功');
  } catch (error) {
    console.error('获取审核统计失败:', error);
    return createErrorResponse(
      '获取审核统计失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

