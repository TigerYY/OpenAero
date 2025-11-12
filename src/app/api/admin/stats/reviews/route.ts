import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30'; // 默认30天

    // 计算时间范围
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 获取评价总数
    const totalReviews = await prisma.review.count();

    // 获取新评价数量
    const newReviews = await prisma.review.count({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    });

    // 获取平均评分
    const averageRating = await prisma.review.aggregate({
      _avg: {
        rating: true
      }
    });

    // 获取评分分布
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      _count: {
        id: true
      },
      orderBy: {
        rating: 'asc'
      }
    });

    // 获取评价趋势
    const reviewTrend = await prisma.review.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      select: {
        createdAt: true,
        rating: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // 按日期聚合评价趋势
    const trendByDay: Record<string, { count: number; totalRating: number }> = {};
    reviewTrend.forEach((review) => {
      const date = review.createdAt.toISOString().split('T')[0];
      if (date) {
        if (!trendByDay[date]) {
          trendByDay[date] = { count: 0, totalRating: 0 };
        }
        trendByDay[date].count += 1;
        trendByDay[date].totalRating += review.rating;
      }
    });

    // 获取最受好评的方案
    const topRatedSolutions = await prisma.solution.findMany({
      select: {
        id: true,
        title: true,
        reviews: {
          select: {
            rating: true
          }
        }
      },
      where: {
        reviews: {
          some: {}
        }
      }
    });

    // 计算每个方案的平均评分
    const solutionsWithRating = topRatedSolutions
      .map(solution => {
        const totalRating = solution.reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = solution.reviews.length > 0 ? totalRating / solution.reviews.length : 0;
        return {
          id: solution.id,
          title: solution.title,
          averageRating: Math.round(averageRating * 100) / 100,
          reviewCount: solution.reviews.length
        };
      })
      .filter(solution => solution.reviewCount >= 3) // 至少3个评价
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 10);

    // 获取最近的评价
    const recentReviews = await prisma.review.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        solution: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // 计算增长率
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);
    
    const previousNewReviews = await prisma.review.count({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: startDate
        }
      }
    });

    const growthRate = previousNewReviews > 0 ? ((newReviews - previousNewReviews) / previousNewReviews) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalReviews,
          newReviews,
          averageRating: Math.round((averageRating._avg.rating || 0) * 100) / 100,
          growthRate: Math.round(growthRate * 100) / 100
        },
        ratingDistribution: ratingDistribution.map(item => ({
          rating: item.rating,
          count: item._count.id
        })),
        reviewTrend: Object.entries(trendByDay).map(([date, data]) => ({
          date,
          count: data.count,
          averageRating: Math.round((data.totalRating / data.count) * 100) / 100
        })),
        topRatedSolutions: solutionsWithRating,
        recentReviews: recentReviews.map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment?.substring(0, 100) + (review.comment && review.comment.length > 100 ? '...' : ''),
          createdAt: review.createdAt.toISOString(),
          userName: `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim() || '匿名用户',
          solutionTitle: review.solution.title
        }))
      }
    });

  } catch (error) {
    console.error('获取评价统计失败:', error);
    return NextResponse.json(
      { success: false, error: '获取评价统计失败' },
      { status: 500 }
    );
  }
}