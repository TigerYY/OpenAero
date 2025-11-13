/**
 * 产品推荐工具库
 */

import { prisma } from '@/lib/prisma';

export interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  rating: number | null;
  reviewCount: number;
  salesCount: number;
  reason: string; // 推荐原因
  score: number; // 推荐分数
}

/**
 * 基于浏览历史推荐产品
 */
export async function getRecommendationsByViewHistory(
  userId: string,
  limit: number = 10
): Promise<RecommendedProduct[]> {
  // 获取用户浏览历史（假设有 ProductView 表）
  // 如果没有，可以使用订单历史或其他数据源
  const userOrders = await prisma.order.findMany({
    where: {
      userId,
      status: {
        in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'],
      },
    },
    include: {
      orderItems: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    take: 20, // 获取最近的订单
  });

  // 提取用户购买过的产品类别
  const purchasedCategories = new Set<string>();
  const purchasedProducts = new Set<string>();

  userOrders.forEach((order) => {
    order.orderItems.forEach((item) => {
      if (item.product.categoryId) {
        purchasedCategories.add(item.product.categoryId);
      }
      purchasedProducts.add(item.product.id);
    });
  });

  // 基于类别推荐相似产品
  const recommendations = await prisma.product.findMany({
    where: {
      status: 'PUBLISHED',
      isActive: true,
      id: {
        notIn: Array.from(purchasedProducts), // 排除已购买的产品
      },
      categoryId: {
        in: Array.from(purchasedCategories), // 相同类别
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      rating: true,
      reviewCount: true,
      salesCount: true,
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { salesCount: 'desc' },
      { rating: 'desc' },
    ],
    take: limit,
  });

  return recommendations.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    images: product.images,
    rating: product.rating ? Number(product.rating) : null,
    reviewCount: product.reviewCount,
    salesCount: product.salesCount,
    reason: `基于您的购买历史，为您推荐${product.category.name}类别中的热门产品`,
    score: (product.salesCount || 0) * 0.6 + (product.rating || 0) * 0.4,
  }));
}

/**
 * 基于购买历史推荐产品
 */
export async function getRecommendationsByPurchaseHistory(
  userId: string,
  limit: number = 10
): Promise<RecommendedProduct[]> {
  // 获取用户购买过的产品
  const userOrders = await prisma.order.findMany({
    where: {
      userId,
      status: {
        in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'],
      },
    },
    include: {
      orderItems: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  const purchasedProductIds = new Set<string>();
  const categoryPreferences: Record<string, number> = {};

  userOrders.forEach((order) => {
    order.orderItems.forEach((item) => {
      purchasedProductIds.add(item.product.id);
      if (item.product.categoryId) {
        categoryPreferences[item.product.categoryId] =
          (categoryPreferences[item.product.categoryId] || 0) + 1;
      }
    });
  });

  // 按类别偏好排序
  const sortedCategories = Object.entries(categoryPreferences)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([categoryId]) => categoryId);

  // 推荐相同类别的高评分产品
  const recommendations = await prisma.product.findMany({
    where: {
      status: 'PUBLISHED',
      isActive: true,
      id: {
        notIn: Array.from(purchasedProductIds),
      },
      categoryId: {
        in: sortedCategories,
      },
      rating: {
        gte: 4.0, // 只推荐高评分产品
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      rating: true,
      reviewCount: true,
      salesCount: true,
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { rating: 'desc' },
      { salesCount: 'desc' },
    ],
    take: limit,
  });

  return recommendations.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    images: product.images,
    rating: product.rating ? Number(product.rating) : null,
    reviewCount: product.reviewCount,
    salesCount: product.salesCount,
    reason: `您经常购买${product.category.name}类别，为您推荐高评分产品`,
    score: (product.rating || 0) * 0.7 + (product.salesCount || 0) * 0.3,
  }));
}

/**
 * 获取热门产品推荐
 */
export async function getPopularProducts(
  limit: number = 10,
  categoryId?: string
): Promise<RecommendedProduct[]> {
  const where: any = {
    status: 'PUBLISHED',
    isActive: true,
  };

  if (categoryId) {
    where.categoryId = categoryId;
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      rating: true,
      reviewCount: true,
      salesCount: true,
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { salesCount: 'desc' },
      { rating: 'desc' },
      { reviewCount: 'desc' },
    ],
    take: limit,
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    images: product.images,
    rating: product.rating ? Number(product.rating) : null,
    reviewCount: product.reviewCount,
    salesCount: product.salesCount,
    reason: '热门产品',
    score: (product.salesCount || 0) * 0.5 + (product.rating || 0) * 0.3 + (product.reviewCount || 0) * 0.2,
  }));
}

/**
 * 综合推荐算法（结合多种推荐策略）
 */
export async function getComprehensiveRecommendations(
  userId?: string,
  limit: number = 10
): Promise<RecommendedProduct[]> {
  const recommendations: RecommendedProduct[] = [];

  // 如果用户已登录，获取个性化推荐
  if (userId) {
    try {
      const viewHistoryRecs = await getRecommendationsByViewHistory(userId, Math.ceil(limit * 0.4));
      const purchaseHistoryRecs = await getRecommendationsByPurchaseHistory(userId, Math.ceil(limit * 0.4));
      recommendations.push(...viewHistoryRecs, ...purchaseHistoryRecs);
    } catch (error) {
      console.error('获取个性化推荐失败:', error);
    }
  }

  // 补充热门产品推荐
  const remainingLimit = limit - recommendations.length;
  if (remainingLimit > 0) {
    const popularRecs = await getPopularProducts(remainingLimit);
    recommendations.push(...popularRecs);
  }

  // 去重并按推荐分数排序
  const uniqueRecs = new Map<string, RecommendedProduct>();
  recommendations.forEach((rec) => {
    if (!uniqueRecs.has(rec.id)) {
      uniqueRecs.set(rec.id, rec);
    } else {
      // 如果已存在，选择分数更高的
      const existing = uniqueRecs.get(rec.id)!;
      if (rec.score > existing.score) {
        uniqueRecs.set(rec.id, rec);
      }
    }
  });

  return Array.from(uniqueRecs.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

