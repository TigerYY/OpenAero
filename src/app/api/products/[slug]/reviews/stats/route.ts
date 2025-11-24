/**
 * 产品评价统计 API
 * GET /api/products/[slug]/reviews/stats - 获取产品评价统计信息
 */

import { ProductStatus } from '@prisma/client';
import { NextRequest } from 'next/server';

import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { getProductReviewStats } from '@/lib/product-review';

export const dynamic = 'force-dynamic';

/**
 * 判断字符串是否为 UUID 格式
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * GET /api/products/[slug]/reviews/stats - 获取产品评价统计
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
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

    const stats = await getProductReviewStats(productId);

    return createSuccessResponse(stats, '获取评价统计成功');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('获取评价统计失败:', error);
    }
    return createErrorResponse(
      '获取评价统计失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}
