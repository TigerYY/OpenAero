/**
 * 产品详情 API
 * GET /api/products/[slug] - 获取产品详情（支持通过 id 或 slug 查询）
 */

import { Prisma, ProductStatus, ReviewStatus } from '@prisma/client';
import { NextRequest } from 'next/server';

import { createSuccessResponse, createErrorResponse } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 判断字符串是否为 UUID 格式
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * GET /api/products/[slug] - 获取产品详情
 * 支持通过 id（UUID）或 slug（字符串）查询
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const identifier = slug;

    // 判断是 id 还是 slug
    const isId = isUUID(identifier);

    // 构建查询条件
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.PUBLISHED,
      is_active: true,
    };

    if (isId) {
      where.id = identifier;
    } else {
      where.slug = identifier;
    }

    const product = await prisma.product.findFirst({
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
                    first_name: true,
                    last_name: true,
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
            min_stock: true,
          },
        },
        components: {
          orderBy: {
            sort_order: 'asc',
          },
        },
        quotationInfo: true,
        productReviews: {
          where: {
            status: ReviewStatus.COMPLETED,
          },
          select: {
            id: true,
            rating: true,
            title: true,
            content: true,
            images: true,
            is_verified: true,
            helpful_count: true,
            created_at: true,
            user: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 20,
        },
        _count: {
          select: {
            productReviews: true,
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
        view_count: {
          increment: 1,
        },
      },
    });

    // 获取相关商品推荐
    const relatedProducts = await prisma.product.findMany({
      where: {
        category_id: product.category_id,
        id: { not: product.id },
        status: ProductStatus.PUBLISHED,
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        short_desc: true,
        price: true,
        original_price: true,
        images: true,
        rating: true,
        review_count: true,
        inventory: {
          select: {
            available: true,
          },
        },
      },
      orderBy: {
        sales_count: 'desc',
      },
      take: 8,
    });

    // 格式化返回数据（转换为 camelCase）
    const formattedProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDesc: product.short_desc,
      sku: product.sku,
      brand: product.brand,
      model: product.model,
      price: Number(product.price),
      originalPrice: product.original_price ? Number(product.original_price) : null,
      images: product.images,
      videos: product.videos,
      documents: product.documents,
      weight: product.weight ? Number(product.weight) : null,
      dimensions: product.dimensions,
      color: product.color,
      material: product.material,
      rating: product.rating ? Number(product.rating) : null,
      reviewCount: product.review_count,
      salesCount: product.sales_count,
      viewCount: product.view_count,
      isFeatured: product.is_featured,
      category: product.category,
      solution: product.solution
        ? {
            id: product.solution.id,
            title: product.solution.title,
            description: product.solution.description,
            features: product.solution.features,
            specs: product.solution.specs,
            creator: product.solution.creator
              ? {
                  id: product.solution.creator.id,
                  bio: product.solution.creator.bio,
                  website: product.solution.creator.website,
                  user: product.solution.creator.user
                    ? {
                        firstName: product.solution.creator.user.first_name,
                        lastName: product.solution.creator.user.last_name,
                      }
                    : null,
                }
              : null,
          }
        : null,
      inStock: product.inventory?.available ? product.inventory.available > 0 : false,
      stockQuantity: product.inventory?.available || 0,
      components:
        product.components?.map(comp => ({
          id: comp.id,
          category: comp.category,
          name: comp.name,
          specification: comp.specification,
          unitPrice: Number(comp.unit_price),
          sortOrder: comp.sort_order,
        })) || [],
      quotationInfo: product.quotationInfo
        ? {
            priceNotes: product.quotationInfo.price_notes,
            features: product.quotationInfo.features,
            support: product.quotationInfo.support,
            service: product.quotationInfo.service,
            delivery: product.quotationInfo.delivery,
            payment: product.quotationInfo.payment,
            validityDays: product.quotationInfo.validity_days,
            validityStartDate: product.quotationInfo.validity_start_date?.toISOString(),
          }
        : null,
      reviews: product.productReviews.map(review => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.content,
        createdAt: review.created_at.toISOString(),
        user: {
          firstName: review.user.first_name,
          lastName: review.user.last_name,
        },
        helpful: review.helpful_count,
        notHelpful: 0, // 如果需要可以添加
      })),
      relatedProducts: relatedProducts.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        shortDesc: p.short_desc,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : null,
        images: p.images,
        rating: p.rating ? Number(p.rating) : null,
        reviewCount: p.review_count,
        inStock: p.inventory?.available ? p.inventory.available > 0 : false,
      })),
    };

    return createSuccessResponse({ product: formattedProduct }, '获取商品详情成功');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('获取商品详情失败:', error);
    }
    return createErrorResponse(
      '获取商品详情失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}
