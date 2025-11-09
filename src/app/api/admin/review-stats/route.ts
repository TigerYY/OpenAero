import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { checkAdminAuth } from '@/lib/api-auth-helpers';
import { db } from '@/lib/prisma';

// 统计查询参数验证
const statsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).optional().default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reviewerId: z.string().optional(),
});

// 获取审核统计数据
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    // 检查管理员权限
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: '权限不足' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = statsQuerySchema.parse({
      period: searchParams.get('period'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      reviewerId: searchParams.get('reviewerId'),
    });

    // 计算时间范围
    const now = new Date();
    let startDate: Date;
    const endDate: Date = new Date(query.endDate || now);

    if (query.startDate) {
      startDate = new Date(query.startDate);
    } else {
      switch (query.period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    // 基础统计查询条件
    const baseWhere = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(query.reviewerId && { reviewerId: query.reviewerId }),
    };

    // 1. 总体统计
    const [
      totalReviews,
      completedReviews,
      pendingReviews,
      inProgressReviews,
      approvedReviews,
      rejectedReviews,
    ] = await Promise.all([
      db.solutionReview.count({ where: baseWhere }),
      db.solutionReview.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
      db.solutionReview.count({ where: { ...baseWhere, status: 'PENDING' } }),
      db.solutionReview.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
      db.solutionReview.count({ where: { ...baseWhere, decision: 'APPROVED' } }),
      db.solutionReview.count({ where: { ...baseWhere, decision: 'REJECTED' } }),
    ]);

    // 2. 平均审核时间
    const completedReviewsWithTime = await db.solutionReview.findMany({
      where: {
        ...baseWhere,
        status: 'COMPLETED',
        reviewStartedAt: { not: null },
        reviewedAt: { not: null },
      },
      select: {
        reviewStartedAt: true,
        reviewedAt: true,
      },
    });

    const averageReviewTime = completedReviewsWithTime.length > 0
      ? completedReviewsWithTime.reduce((sum, review) => {
          const duration = new Date(review.reviewedAt!).getTime() - new Date(review.reviewStartedAt!).getTime();
          return sum + duration;
        }, 0) / completedReviewsWithTime.length
      : 0;

    // 3. 审核员效率统计
    const reviewerStats = await db.solutionReview.groupBy({
      by: ['reviewerId'],
      where: baseWhere,
      _count: {
        id: true,
      },
      _avg: {
        // 这里需要计算平均审核时间，但Prisma不支持直接计算时间差
        // 我们将在后续处理中计算
      },
    });

    // 获取审核员详细信息
    const reviewerDetails = await db.user.findMany({
      where: {
        id: { in: reviewerStats.map(stat => stat.reviewerId) },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const reviewerStatsWithDetails = await Promise.all(
      reviewerStats.map(async (stat) => {
        const reviewer = reviewerDetails.find(r => r.id === stat.reviewerId);
        
        // 计算该审核员的平均审核时间
        const reviewerCompletedReviews = await db.solutionReview.findMany({
          where: {
            ...baseWhere,
            reviewerId: stat.reviewerId,
            status: 'COMPLETED',
            reviewStartedAt: { not: null },
            reviewedAt: { not: null },
          },
          select: {
            reviewStartedAt: true,
            reviewedAt: true,
          },
        });

        const avgTime = reviewerCompletedReviews.length > 0
          ? reviewerCompletedReviews.reduce((sum, review) => {
              const duration = new Date(review.reviewedAt!).getTime() - new Date(review.reviewStartedAt!).getTime();
              return sum + duration;
            }, 0) / reviewerCompletedReviews.length
          : 0;

        return {
          reviewerId: stat.reviewerId,
          reviewerName: reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : '未知',
          reviewerEmail: reviewer?.email || '',
          totalReviews: stat._count.id,
          completedReviews: reviewerCompletedReviews.length,
          averageReviewTime: avgTime,
        };
      })
    );

    // 4. 时间趋势数据
    const trendData = await db.solutionReview.groupBy({
      by: ['createdAt'],
      where: baseWhere,
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 按日期分组趋势数据
    const trendByDate = trendData.reduce((acc, item) => {
      const date = item.createdAt.toISOString().split('T')[0];
      if (date) {
        acc[date] = (acc[date] || 0) + (item._count?.id || 0);
      }
      return acc;
    }, {} as Record<string, number>);

    // 5. 方案类别统计
    const categoryStats = await db.solutionReview.findMany({
      where: baseWhere,
      include: {
        solution: {
          select: {
            category: true,
          },
        },
      },
    });

    const categoryDistribution = categoryStats.reduce((acc, review) => {
      const category = review.solution?.category || '未分类';
      if (category) {
        acc[category] = (acc[category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // 6. 逾期审核统计
    const overdueReviews = await db.solutionReview.count({
      where: {
        ...baseWhere,
        status: 'IN_PROGRESS',
        reviewStartedAt: {
          lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前开始的审核
        },
      },
    });

    // 构建响应数据
    const stats = {
      overview: {
        totalReviews,
        completedReviews,
        pendingReviews,
        inProgressReviews,
        approvedReviews,
        rejectedReviews,
        overdueReviews,
        approvalRate: totalReviews > 0 ? (approvedReviews / totalReviews * 100).toFixed(1) : '0',
        averageReviewTime: Math.round(averageReviewTime / (1000 * 60 * 60)), // 转换为小时
      },
      reviewerStats: reviewerStatsWithDetails.sort((a, b) => b.totalReviews - a.totalReviews),
      trendData: Object.entries(trendByDate).map(([date, count]) => ({
        date,
        count,
      })),
      categoryDistribution: Object.entries(categoryDistribution).map(([category, count]) => ({
        category,
        count,
        percentage: totalReviews > 0 ? ((count / totalReviews) * 100).toFixed(1) : '0',
      })),
      period: query.period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('获取审核统计失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: '请求参数无效', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}