import { Prisma, ProductStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createErrorResponse } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

const productQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 20)),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  categorySlug: z.string().optional(),
  minPrice: z
    .string()
    .optional()
    .transform(val => (val ? parseFloat(val) : undefined)),
  maxPrice: z
    .string()
    .optional()
    .transform(val => (val ? parseFloat(val) : undefined)),
  isFeatured: z
    .string()
    .optional()
    .transform(val => (val === 'true' ? true : val === 'false' ? false : undefined)),
  inStock: z
    .string()
    .optional()
    .transform(val => val === 'true'),
  brand: z.string().optional(),
  rating: z
    .string()
    .optional()
    .transform(val => (val ? parseFloat(val) : undefined)),
  sortBy: z
    .enum(['createdAt', 'price', 'rating', 'salesCount', 'name', 'reviewCount'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// 获取商品列表（公开接口）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    // 将 null 转换为 undefined，因为 Zod optional() 期望 undefined 而不是 null
    const getParam = (key: string) => searchParams.get(key) || undefined;

    const queryResult = productQuerySchema.safeParse({
      page: getParam('page'),
      limit: getParam('limit'),
      search: getParam('search'),
      categoryId: getParam('categoryId'),
      categorySlug: getParam('categorySlug'),
      minPrice: getParam('minPrice'),
      maxPrice: getParam('maxPrice'),
      isFeatured: getParam('isFeatured'),
      inStock: getParam('inStock'),
      brand: getParam('brand'),
      rating: getParam('rating'),
      sortBy: getParam('sortBy'),
      sortOrder: getParam('sortOrder'),
    });

    if (!queryResult.success) {
      if (process.env.NODE_ENV === 'development') {
        console.error('查询参数验证失败:', queryResult.error.errors);
      }
      return createErrorResponse(
        `查询参数无效: ${queryResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        400
      );
    }

    const {
      page,
      limit,
      search,
      categoryId,
      categorySlug,
      minPrice,
      maxPrice,
      isFeatured,
      inStock,
      brand,
      rating,
      sortBy,
      sortOrder,
    } = queryResult.data;

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.PUBLISHED,
      is_active: true,
    };

    // 搜索条件（支持多字段搜索）
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { short_desc: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 分类筛选
    if (categoryId) {
      where.category_id = categoryId;
    }

    if (categorySlug) {
      where.category = {
        slug: categorySlug,
      };
    }

    // 价格范围筛选
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    // 特色商品筛选
    if (isFeatured !== undefined) {
      where.is_featured = isFeatured;
    }

    // 品牌筛选
    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }

    // 评分筛选
    if (rating !== undefined) {
      where.rating = { gte: rating };
    }

    // 库存筛选
    if (inStock) {
      where.inventory = {
        available: { gt: 0 },
        status: 'IN_STOCK',
      };
    }

    // 构建排序条件
    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    if (sortBy === 'price') {
      orderBy.price = sortOrder;
    } else if (sortBy === 'rating') {
      orderBy.rating = sortOrder;
    } else if (sortBy === 'salesCount') {
      orderBy.sales_count = sortOrder;
    } else if (sortBy === 'reviewCount') {
      orderBy.review_count = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.created_at = sortOrder;
    } else {
      orderBy.created_at = sortOrder;
    }

    // 获取商品列表
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
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
          sales_count: true,
          is_featured: true,
          brand: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          inventory: {
            select: {
              available: true,
              status: true,
            },
          },
          created_at: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // 格式化返回数据（转换为 camelCase）
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDesc: product.short_desc,
      price: Number(product.price),
      originalPrice: product.original_price ? Number(product.original_price) : null,
      images: product.images,
      rating: product.rating ? Number(product.rating) : null,
      reviewCount: product.review_count,
      salesCount: product.sales_count,
      isFeatured: product.is_featured,
      brand: product.brand,
      category: product.category,
      inStock: product.inventory?.available ? product.inventory.available > 0 : false,
      createdAt: product.created_at.toISOString(),
    }));

    // 使用 createPaginatedResponse，但需要返回正确的格式
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        products: formattedProducts, // 前端期望 products 字段
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
      message: '获取商品列表成功',
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('获取商品列表失败:', error);
    }
    return createErrorResponse(
      '获取商品列表失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}
