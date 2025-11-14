import { NextRequest, NextResponse } from 'next/server';

import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';
import { convertSnakeToCamel } from '@/lib/field-mapper';

// GET /api/admin/dashboard/stats - 获取管理员仪表板统计数据
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份和权限
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.error || NextResponse.json(
        {
          success: false,
          error: '未授权访问',
          data: null
        } as ApiResponse<null>,
        { status: 401 }
      );
    }

    // 检查管理员权限（包括 ADMIN 和 SUPER_ADMIN）
    if (authResult.user.role !== 'ADMIN' && authResult.user.role !== 'SUPER_ADMIN') {
      const response: ApiResponse<null> = {
        success: false,
        error: '权限不足，仅管理员可以查看仪表板统计',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    // 获取时间范围参数（支持 timeRange 和 days）
    const timeRangeParam = request.nextUrl.searchParams.get('timeRange');
    const daysParam = request.nextUrl.searchParams.get('days');
    const days = parseInt(timeRangeParam || daysParam || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 并行获取各种统计数据
    const [
      // 方案统计
      totalSolutions,
      pendingReviewSolutions,
      approvedSolutions,
      rejectedSolutions,
      recentSolutions,
      
      // 用户统计
      totalUsers,
      totalCreators,
      totalAdmins,
      recentUsers,
      
      // 审核统计
      totalReviews,
      recentReviews,
      
      // 收入统计
      totalRevenue,
      recentRevenue,
      
      // 分类统计
      categoryStats,
      
      // 状态趋势
      statusTrends
    ] = await Promise.all([
      // 方案统计
      prisma.solution.count(),
      prisma.solution.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.solution.count({ where: { status: 'APPROVED' } }),
      prisma.solution.count({ where: { status: 'REJECTED' } }),
      prisma.solution.count({ where: { createdAt: { gte: startDate } } }), // Solution 使用 camelCase
      
      // 用户统计（使用 userProfile）
      prisma.userProfile.count(),
      prisma.userProfile.count({ where: { role: 'CREATOR' } }),
      prisma.userProfile.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } }),
      prisma.userProfile.count({ where: { created_at: { gte: startDate } } }),
      
      // 审核统计
      prisma.solutionReview.count(),
      prisma.solutionReview.count({ where: { reviewedAt: { gte: startDate } } }), // SolutionReview 使用 camelCase
      
      // 收入统计（Solution 使用 camelCase）
      prisma.solution.aggregate({
        _sum: { price: true },
        where: { status: 'APPROVED' }
      }),
      prisma.solution.aggregate({
        _sum: { price: true },
        where: { 
          status: 'APPROVED',
          reviewedAt: { gte: startDate }
        }
      }),
      
      // 分类统计
      prisma.solution.groupBy({
        by: ['category'],
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } }
      }),
      
      // 状态趋势（最近7天，Solution 使用 camelCase）
      prisma.solution.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      })
    ]);

    // 计算增长率
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days * 2);
    previousPeriodStart.setDate(previousPeriodStart.getDate() + days);

    const [previousSolutions, previousUsers, previousReviews] = await Promise.all([
      prisma.solution.count({
        where: {
          createdAt: { // Solution 使用 camelCase
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      }),
      prisma.userProfile.count({
        where: {
          created_at: { // UserProfile 使用 snake_case
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      }),
      prisma.solutionReview.count({
        where: {
          reviewedAt: { // SolutionReview 使用 camelCase
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      })
    ]);

    // 计算增长率
    const solutionGrowthRate = previousSolutions > 0 
      ? ((recentSolutions - previousSolutions) / previousSolutions * 100)
      : recentSolutions > 0 ? 100 : 0;

    const userGrowthRate = previousUsers > 0
      ? ((recentUsers - previousUsers) / previousUsers * 100)
      : recentUsers > 0 ? 100 : 0;

    const reviewGrowthRate = previousReviews > 0
      ? ((recentReviews - previousReviews) / previousReviews * 100)
      : recentReviews > 0 ? 100 : 0;

    // 获取最近活动（SolutionReview 使用 camelCase 字段名）
    const recentActivities = await prisma.solutionReview.findMany({
      take: 10,
      orderBy: { reviewedAt: 'desc' }, // SolutionReview 使用 camelCase
      select: {
        id: true,
        solutionId: true, // SolutionReview 使用 camelCase
        reviewerId: true, // SolutionReview 使用 camelCase
        decision: true,
        reviewedAt: true, // SolutionReview 使用 camelCase
      }
    });

    // 格式化活动数据（SolutionReview 字段已经是 camelCase）
    const formattedActivities = recentActivities.map(activity => ({
      id: activity.id,
      type: 'review',
      action: activity.decision,
      description: `审核了方案`,
      timestamp: activity.reviewedAt,
      solutionId: activity.solutionId,
      reviewerId: activity.reviewerId,
    }));

    // 格式化响应数据以匹配前端期望的格式
    const stats = {
      solutions: {
        total: totalSolutions,
        pending: pendingReviewSolutions,
        approved: approvedSolutions,
        rejected: rejectedSolutions,
      },
      users: {
        total: totalUsers,
        admins: totalAdmins,
      },
      reviews: {
        totalReviews,
        avgReviewTime: 0, // TODO: 计算平均审核时间
      },
      recentActivity: {
        newSolutions: recentSolutions,
        newUsers: recentUsers,
        completedReviews: recentReviews,
      },
      growth: {
        solutionsGrowth: Math.round(solutionGrowthRate * 100) / 100,
        usersGrowth: Math.round(userGrowthRate * 100) / 100,
        reviewsGrowth: Math.round(reviewGrowthRate * 100) / 100,
      },
      categories: categoryStats.map(cat => ({
        name: cat.category || '未分类',
        count: cat._count.category,
        percentage: totalSolutions > 0 ? (cat._count.category / totalSolutions * 100) : 0,
      })),
      statusTrend: statusTrends.map(trend => ({
        date: new Date().toISOString().split('T')[0],
        approved: trend.status === 'APPROVED' ? trend._count.status : 0,
        rejected: trend.status === 'REJECTED' ? trend._count.status : 0,
        pending: trend.status === 'PENDING_REVIEW' ? trend._count.status : 0,
      })),
    };

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      message: '统计数据获取成功'
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('获取仪表板统计失败:', error);

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取统计数据失败',
      data: null
    };

    return NextResponse.json(response, { status: 500 });
  }
}