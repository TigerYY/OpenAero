import { NextRequest, NextResponse } from 'next/server';

import { dashboardCache } from '@/lib/admin/dashboard-cache';
import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';

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
    const userRoles = authResult.user.roles || [];
    if (!userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
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

    // 检查缓存
    const cacheKey = `stats:${days}`;
    const cachedData = await dashboardCache.getStats(days);
    if (cachedData) {
      return NextResponse.json(cachedData, { 
        status: 200,
        headers: {
          'X-Cache': 'HIT',
        },
      });
    }

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
      prisma.solution.count({ where: { created_at: { gte: startDate } } }),
      
      // 用户统计（使用 userProfile）- 支持多角色
      prisma.userProfile.count(),
      prisma.userProfile.count({ 
        where: { 
          roles: { has: 'CREATOR' }
        } 
      }),
      prisma.userProfile.count({ 
        where: { 
          roles: { hasSome: ['ADMIN', 'SUPER_ADMIN'] }
        } 
      }),
      prisma.userProfile.count({ where: { created_at: { gte: startDate } } }),
      
      // 审核统计
      prisma.solutionReview.count(),
      prisma.solutionReview.count({ where: { reviewed_at: { gte: startDate } } }),
      
      // 收入统计（Solution 使用 camelCase）
      prisma.solution.aggregate({
        _sum: { price: true },
        where: { status: 'APPROVED' }
      }),
      prisma.solution.aggregate({
        _sum: { price: true },
        where: { 
          status: 'APPROVED',
          reviewed_at: { gte: startDate }
        }
      }),
      
      // 分类统计
      prisma.solution.groupBy({
        by: ['category'],
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } }
      }),
      
      // 状态趋势（最近7天）
      prisma.solution.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { updated_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      })
    ]);

    // 计算增长率
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days * 2);
    previousPeriodStart.setDate(previousPeriodStart.getDate() + days);

    const [previousSolutions, previousUsers, previousReviews] = await Promise.all([
      prisma.solution.count({
        where: {
          created_at: {
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
          reviewed_at: {
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

    // 计算平均审核时间
    // 查询已完成审核的方案，使用 SolutionReview 表来获取准确的审核时间
    const completedReviewRecords = await prisma.solutionReview.findMany({
      where: {
        status: 'COMPLETED',
        reviewed_at: { not: null },
        reviewed_at: { gte: startDate },
        decision: { in: ['APPROVED', 'REJECTED'] },
      },
      select: {
        solution_id: true,
        reviewed_at: true,
        solution: {
          select: {
            id: true,
            submitted_at: true,
            created_at: true,
          },
        },
      },
    });

    // 计算平均审核时间（小时）
    let avgReviewTime = 0;
    const reviewTimes: number[] = [];
    
    for (const record of completedReviewRecords) {
      const reviewedAt = record.reviewed_at;
      // 优先使用 submitted_at，如果没有则使用 created_at
      const submittedAt = record.solution.submitted_at || record.solution.created_at;
      
      if (reviewedAt && submittedAt) {
        const submitted = submittedAt.getTime();
        const reviewed = reviewedAt.getTime();
        const hours = (reviewed - submitted) / (1000 * 60 * 60);
        if (hours > 0) { // 只计算有效的时间差
          reviewTimes.push(hours);
        }
      }
    }

    if (reviewTimes.length > 0) {
      const totalTime = reviewTimes.reduce((a, b) => a + b, 0);
      avgReviewTime = Math.round((totalTime / reviewTimes.length) * 10) / 10; // 保留一位小数
    }

    // 获取最近活动
    const recentActivities = await prisma.solutionReview.findMany({
      take: 10,
      orderBy: { reviewed_at: 'desc' },
      select: {
        id: true,
        solution_id: true,
        reviewer_id: true,
        decision: true,
        reviewed_at: true,
      }
    });

    // 格式化活动数据
    const formattedActivities = recentActivities.map(activity => ({
      id: activity.id,
      type: 'review',
      action: activity.decision,
      description: `审核了方案`,
      timestamp: activity.reviewed_at,
      solutionId: activity.solution_id,
      reviewerId: activity.reviewer_id,
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
        avgReviewTime, // 平均审核时间（小时）
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

    // 缓存响应数据
    dashboardCache.setStats(days, response);

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'X-Cache': 'MISS',
      },
    });

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