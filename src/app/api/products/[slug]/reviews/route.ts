/**
 * 产品评价 API
 * GET /api/products/[slug]/reviews - 获取产品评价列表
 * POST /api/products/[slug]/reviews - 创建产品评价
 */

import { ProductStatus, ReviewStatus } from '@prisma/client';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  createValidationErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { getServerUser } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';
import { createProductReview, getProductReviews } from '@/lib/product-review';

export const dynamic = 'force-dynamic';

/**
 * 判断字符串是否为 UUID 格式
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * 根据 slug 或 id 获取产品 ID
 */
async function getProductIdByIdentifier(identifier: string): Promise<string | null> {
  const isId = isUUID(identifier);

  const product = await prisma.product.findFirst({
    where: {
      ...(isId ? { id: identifier } : { slug: identifier }),
      status: ProductStatus.PUBLISHED,
      is_active: true,
    },
    select: { id: true },
  });

  return product?.id || null;
}

const reviewQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 10)),
  status: z.nativeEnum(ReviewStatus).optional(),
  rating: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined)),
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
 * GET /api/products/[slug]/reviews - 获取产品评价列表
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const productId = await getProductIdByIdentifier(slug);
    if (!productId) {
      return createErrorResponse('商品不存在', 404);
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
    if (process.env.NODE_ENV === 'development') {
      console.error('获取评价列表失败:', error);
    }
    return createErrorResponse(
      '获取评价列表失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

/**
 * POST /api/products/[slug]/reviews - 创建产品评价
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    const { slug } = await params;
    const productId = await getProductIdByIdentifier(slug);
    if (!productId) {
      return createErrorResponse('商品不存在', 404);
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
    if (process.env.NODE_ENV === 'development') {
      console.error('创建评价失败:', error);
    }
    return createErrorResponse(
      error instanceof Error ? error.message : '创建评价失败',
      error instanceof Error && error.message.includes('已评价') ? 400 : 500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}
