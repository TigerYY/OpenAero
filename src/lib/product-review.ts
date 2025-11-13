/**
 * 产品评价工具库
 */

import { prisma } from '@/lib/prisma';
import { ReviewStatus } from '@prisma/client';

export interface CreateReviewData {
  productId: string;
  userId: string;
  orderId?: string;
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
  videos?: string[];
}

export interface ReviewWithDetails {
  id: string;
  productId: string;
  userId: string;
  orderId: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  images: string[];
  videos: string[];
  status: ReviewStatus;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  };
  replies?: ReviewReply[];
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  userId: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  };
}

/**
 * 创建产品评价
 */
export async function createProductReview(data: CreateReviewData): Promise<ReviewWithDetails> {
  // 验证评分范围
  if (data.rating < 1 || data.rating > 5) {
    throw new Error('评分必须在1-5之间');
  }

  // 如果提供了订单ID，验证订单是否包含该产品
  if (data.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: {
        orderItems: {
          where: { productId: data.productId },
        },
      },
    });

    if (!order || order.userId !== data.userId) {
      throw new Error('订单不存在或不属于当前用户');
    }

    if (order.orderItems.length === 0) {
      throw new Error('订单中不包含该产品');
    }
  }

  // 检查是否已经评价过（如果提供了订单ID）
  if (data.orderId) {
    const existingReview = await prisma.productReview.findUnique({
      where: {
        productId_userId_orderId: {
          productId: data.productId,
          userId: data.userId,
          orderId: data.orderId,
        },
      },
    });

    if (existingReview) {
      throw new Error('该订单已评价过该产品');
    }
  }

  // 创建评价
  const review = await prisma.productReview.create({
    data: {
      productId: data.productId,
      userId: data.userId,
      orderId: data.orderId,
      rating: data.rating,
      title: data.title,
      content: data.content,
      images: data.images || [],
      videos: data.videos || [],
      status: ReviewStatus.PENDING, // 需要审核
      isVerified: !!data.orderId, // 如果有订单ID，标记为已验证购买
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    },
  });

  // 更新产品评分和评价数量（需要重新计算平均值）
  await updateProductRating(data.productId);

  return review as ReviewWithDetails;
}

/**
 * 更新产品评分和评价数量
 */
export async function updateProductRating(productId: string): Promise<void> {
  const reviews = await prisma.productReview.findMany({
    where: {
      productId,
      status: ReviewStatus.APPROVED, // 只计算已审核通过的评价
    },
    select: {
      rating: true,
    },
  });

  if (reviews.length === 0) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: null,
        reviewCount: 0,
      },
    });
    return;
  }

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: averageRating,
      reviewCount: reviews.length,
    },
  });
}

/**
 * 获取产品评价列表
 */
export async function getProductReviews(
  productId: string,
  page: number = 1,
  limit: number = 10,
  status?: ReviewStatus,
  rating?: number
): Promise<{ reviews: ReviewWithDetails[]; total: number }> {
  const skip = (page - 1) * limit;

  const where: any = {
    productId,
  };

  if (status) {
    where.status = status;
  }

  if (rating) {
    where.rating = rating;
  }

  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.productReview.count({ where }),
  ]);

  return {
    reviews: reviews as ReviewWithDetails[],
    total,
  };
}

/**
 * 审核评价（管理员操作）
 */
export async function reviewProductReview(
  reviewId: string,
  approved: boolean,
  adminId: string,
  notes?: string
): Promise<void> {
  const review = await prisma.productReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error('评价不存在');
  }

  await prisma.productReview.update({
    where: { id: reviewId },
    data: {
      status: approved ? ReviewStatus.APPROVED : ReviewStatus.REJECTED,
    },
  });

  // 如果审核通过，更新产品评分
  if (approved) {
    await updateProductRating(review.productId);
  }
}

/**
 * 添加评价回复
 * 注意：由于 ProductReview 模型中没有回复字段，我们使用一个简单的实现
 * 将回复存储在 ProductReview 的 metadata JSON 字段中（如果存在）
 * 或者创建一个单独的 ReviewReply 表
 * 
 * 这里暂时返回一个模拟的回复对象，实际实现需要数据库支持
 */
export async function addReviewReply(
  reviewId: string,
  userId: string,
  content: string
): Promise<ReviewReply> {
  // 检查评价是否存在
  const review = await prisma.productReview.findUnique({
    where: { id: reviewId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    },
  });

  if (!review) {
    throw new Error('评价不存在');
  }

  // TODO: 实现回复功能
  // 方案1: 创建 ReviewReply 表
  // 方案2: 使用 ProductReview 的 metadata 字段存储回复数组
  // 方案3: 创建一个单独的 ReviewReplies 表
  
  // 暂时返回一个模拟的回复对象
  const reply: ReviewReply = {
    id: `reply-${Date.now()}`,
    reviewId,
    userId,
    content,
    createdAt: new Date(),
    user: {
      id: userId,
      firstName: null,
      lastName: null,
      avatar: null,
    },
  };

  // TODO: 实际保存回复到数据库
  // await prisma.reviewReply.create({ data: { ... } });

  return reply;
}

/**
 * 标记评价为有用
 */
export async function markReviewHelpful(reviewId: string): Promise<void> {
  await prisma.productReview.update({
    where: { id: reviewId },
    data: {
      helpfulCount: {
        increment: 1,
      },
    },
  });
}

/**
 * 获取产品评价统计
 */
export async function getProductReviewStats(productId: string): Promise<{
  total: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  verifiedCount: number;
}> {
  const reviews = await prisma.productReview.findMany({
    where: {
      productId,
      status: ReviewStatus.APPROVED,
    },
    select: {
      rating: true,
      isVerified: true,
    },
  });

  const total = reviews.length;
  const averageRating = total > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / total
    : 0;

  const ratingDistribution: Record<number, number> = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  reviews.forEach((review) => {
    ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
  });

  const verifiedCount = reviews.filter((review) => review.isVerified).length;

  return {
    total,
    averageRating,
    ratingDistribution,
    verifiedCount,
  };
}

