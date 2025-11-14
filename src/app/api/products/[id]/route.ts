/**
 * 产品详情 API
 * GET /api/products/[id] - 获取产品详情（支持通过 id 或 slug 查询）
 */

import { ProductStatus, ReviewStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * 判断字符串是否为 UUID 格式
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * GET /api/products/[id] - 获取产品详情
 * 支持通过 id（UUID）或 slug（字符串）查询
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const identifier = id;

    // 判断是 id 还是 slug
    const isId = isUUID(identifier);

    // 构建查询条件
    const where: any = {
      status: ProductStatus.PUBLISHED,
      isActive: true,
    };

    if (isId) {
      where.id = identifier;
    } else {
      where.slug = identifier;
    }

    const product = await prisma.product.findUnique({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        solution: {
          select: {
            id: true,
            title: true,
            description: true,
            features: true,
            specs: true,
            creator: {
              select: {
                id: true,
                bio: true,
                website: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        inventory: {
          select: {
            quantity: true,
            available: true,
            status: true,
            minStock: true,
          },
        },
        reviews: {
          where: {
            status: ReviewStatus.COMPLETED,
          },
          select: {
            id: true,
            rating: true,
            title: true,
            content: true,
            images: true,
            isVerified: true,
            helpfulCount: true,
            createdAt: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    if (!product) {
      return createErrorResponse('商品不存在', 404);
    }

    // 增加浏览次数
    await prisma.product.update({
      where: { id: product.id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    // 获取相关商品推荐
    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDesc: true,
        price: true,
        originalPrice: true,
        images: true,
        rating: true,
        reviewCount: true,
        inventory: {
          select: {
            available: true,
          },
        },
      },
      orderBy: {
        salesCount: 'desc',
      },
      take: 8,
    });

    // 格式化返回数据
    const formattedProduct = {
      ...product,
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
      costPrice: undefined, // 不返回成本价给前端
      weight: product.weight ? Number(product.weight) : null,
      rating: product.rating ? Number(product.rating) : null,
      inStock: product.inventory?.available ? product.inventory.available > 0 : false,
      stockQuantity: product.inventory?.available || 0,
      relatedProducts: relatedProducts.map(p => ({
        ...p,
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        rating: p.rating ? Number(p.rating) : null,
        inStock: p.inventory?.available ? p.inventory.available > 0 : false,
        inventory: undefined, // 移除inventory字段，只保留inStock
      })),
    };

    return createSuccessResponse({ product: formattedProduct }, '获取商品详情成功');
  } catch (error) {
    console.error('获取商品详情失败:', error);
    return createErrorResponse(
      '获取商品详情失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

