/**
 * 产品评价 API
 * GET /api/products/[id]/reviews - 获取产品评价列表
 * POST /api/products/[id]/reviews - 创建产品评价
 */

import { NextRequest } from 'next/server';
import { ReviewStatus } from '@prisma/client';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  createValidationErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import {
  createProductReview,
  getProductReviews,
  getProductReviewStats,
} from '@/lib/product-review';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const reviewQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  status: z.nativeEnum(ReviewStatus).optional(),
  rating: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
});

const createReviewSchema = z.object({
  orderId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  content: z.string().max(2000).optional(),
  images: z.array(z.string().url()).optional(),
  videos: z.array(z.string().url()).optional(),
});

/**
 * GET /api/products/[id]/reviews - 获取产品评价列表
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

    const searchParams = request.nextUrl.searchParams;
    const queryResult = reviewQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      rating: searchParams.get('rating'),
    });

    if (!queryResult.success) {
      return createErrorResponse('查询参数无效', 400);
    }

    const { page, limit, status, rating } = queryResult.data;

    // 对于公开访问，只返回已审核通过的评价
    const reviewStatus = status || ReviewStatus.APPROVED;

    const result = await getProductReviews(productId, page, limit, reviewStatus, rating);

    return createPaginatedResponse(
      result.reviews,
      {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
      '获取评价列表成功'
    );
  } catch (error) {
    console.error('获取评价列表失败:', error);
    return createErrorResponse(
      '获取评价列表失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

/**
 * POST /api/products/[id]/reviews - 创建产品评价
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    const { id } = await params;
    const productId = id;
    if (!productId) {
      return createErrorResponse('产品ID不能为空', 400);
    }

    const body = await request.json();
    const validationResult = createReviewSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const reviewData = {
      productId,
      userId: user.id,
      ...validationResult.data,
    };

    const review = await createProductReview(reviewData);

    // 记录审计日志
    await logAuditAction(request, {
      userId: user.id,
      action: 'PRODUCT_REVIEW_CREATED',
      resource: 'products',
      resource_id: productId,
      metadata: {
        reviewId: review.id,
        rating: review.rating,
        orderId: review.orderId,
      },
    });

    return createSuccessResponse(review, '评价提交成功，等待审核');
  } catch (error) {
    console.error('创建评价失败:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : '创建评价失败',
      error instanceof Error && error.message.includes('已评价') ? 400 : 500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

