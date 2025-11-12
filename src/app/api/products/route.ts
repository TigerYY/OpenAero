import { ProductStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/prisma';

// 获取商品列表（公开接口）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const categorySlug = searchParams.get('categorySlug');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const isFeatured = searchParams.get('isFeatured');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {
      status: ProductStatus.PUBLISHED,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDesc: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (categorySlug) {
      where.category = {
        slug: categorySlug,
      };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) {
        where.price.gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        where.price.lte = parseFloat(maxPrice);
      }
    }

    if (isFeatured !== null) {
      where.isFeatured = isFeatured === 'true';
    }

    // 构建排序条件
    const orderBy: any = {};
    if (sortBy === 'price') {
      orderBy.price = sortOrder;
    } else if (sortBy === 'rating') {
      orderBy.rating = sortOrder;
    } else if (sortBy === 'salesCount') {
      orderBy.salesCount = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // 获取商品列表
    const [products, total] = await Promise.all([
      db.product.findMany({
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
      db.product.count({ where }),
    ]);

    // 格式化返回数据
    const formattedProducts = products.map(product => ({
      ...product,
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
      rating: product.rating ? Number(product.rating) : null,
      inStock: product.inventory?.available ? product.inventory.available > 0 : false,
    }));

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取商品列表失败:', error);
    return NextResponse.json({ error: '获取商品列表失败' }, { status: 500 });
  }
}