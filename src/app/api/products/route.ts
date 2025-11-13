import { ProductStatus } from '@prisma/client';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
} from '@/lib/api-helpers';

const productQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  categorySlug: z.string().optional(),
  minPrice: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
  maxPrice: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
  isFeatured: z.string().optional().transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  inStock: z.string().optional().transform((val) => (val === 'true')),
  brand: z.string().optional(),
  rating: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
  sortBy: z.enum(['createdAt', 'price', 'rating', 'salesCount', 'name', 'reviewCount']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// 获取商品列表（公开接口）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryResult = productQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      categoryId: searchParams.get('categoryId'),
      categorySlug: searchParams.get('categorySlug'),
      minPrice: searchParams.get('minPrice'),
      maxPrice: searchParams.get('maxPrice'),
      isFeatured: searchParams.get('isFeatured'),
      inStock: searchParams.get('inStock'),
      brand: searchParams.get('brand'),
      rating: searchParams.get('rating'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    if (!queryResult.success) {
      return createErrorResponse('查询参数无效', 400);
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
    const where: any = {
      status: ProductStatus.PUBLISHED,
      isActive: true,
    };

    // 搜索条件（支持多字段搜索）
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDesc: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 分类筛选
    if (categoryId) {
      where.categoryId = categoryId;
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
      where.isFeatured = isFeatured;
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
    const orderBy: any = {};
    if (sortBy === 'price') {
      orderBy.price = sortOrder;
    } else if (sortBy === 'rating') {
      orderBy.rating = sortOrder;
    } else if (sortBy === 'salesCount') {
      orderBy.salesCount = sortOrder;
    } else if (sortBy === 'reviewCount') {
      orderBy.reviewCount = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // 获取商品列表
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
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
          salesCount: true,
          isFeatured: true,
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
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // 格式化返回数据
    const formattedProducts = products.map((product) => ({
      ...product,
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
      rating: product.rating ? Number(product.rating) : null,
      inStock: product.inventory?.available ? product.inventory.available > 0 : false,
    }));

    return createPaginatedResponse(
      formattedProducts,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      '获取商品列表成功'
    );
  } catch (error) {
    console.error('获取商品列表失败:', error);
    return createErrorResponse(
      '获取商品列表失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}