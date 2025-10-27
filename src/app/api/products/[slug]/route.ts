import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ProductStatus, ReviewDecision } from '@prisma/client';

// 获取单个商品详情（公开接口）
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const product = await db.product.findUnique({
      where: { 
        slug: params.slug,
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
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
            status: ReviewDecision.APPROVED,
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
            reviews: {
              where: {
                status: ReviewDecision.APPROVED,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    // 增加浏览次数
    await db.product.update({
      where: { id: product.id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    // 获取相关商品推荐
    const relatedProducts = await db.product.findMany({
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

    return NextResponse.json(formattedProduct);
  } catch (error) {
    console.error('获取商品详情失败:', error);
    return NextResponse.json({ error: '获取商品详情失败' }, { status: 500 });
  }
}