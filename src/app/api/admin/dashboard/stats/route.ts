import { NextRequest, NextResponse } from 'next/server';

import { authenticateRequest } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
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

    // 检查管理员权限
    if (authResult.user.role !== 'ADMIN') {
      const response: ApiResponse<null> = {
        success: false,
        error: '权限不足，仅管理员可以查看仪表板统计',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    // 获取时间范围参数
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
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
      db.solution.count(),
      db.solution.count({ where: { status: 'PENDING_REVIEW' } }),
      db.solution.count({ where: { status: 'APPROVED' } }),
      db.solution.count({ where: { status: 'REJECTED' } }),
      db.solution.count({ where: { createdAt: { gte: startDate } } }),
      
      // 用户统计
      db.user.count(),
      db.user.count({ where: { role: 'CREATOR' } }),
      db.user.count({ where: { role: 'ADMIN' } }),
      db.user.count({ where: { createdAt: { gte: startDate } } }),
      
      // 审核统计
      db.solutionReview.count(),
      db.solutionReview.count({ where: { reviewedAt: { gte: startDate } } }),
      
      // 收入统计
      db.solution.aggregate({
        _sum: { price: true },
        where: { status: 'APPROVED' }
      }),
      db.solution.aggregate({
        _sum: { price: true },
        where: { 
          status: 'APPROVED',
          reviewedAt: { gte: startDate }
        }
      }),
      
      // 分类统计
      db.solution.groupBy({
        by: ['category'],
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } }
      }),
      
      // 状态趋势（最近7天）
      db.solution.groupBy({
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
      db.solution.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      }),
      db.user.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      }),
      db.solutionReview.count({
        where: {
          reviewedAt: {
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

    // 获取最近活动
    const recentActivities = await db.solutionReview.findMany({
      take: 10,
      orderBy: { reviewedAt: 'desc' },
      include: {
        solution: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // 格式化活动数据
    const formattedActivities = recentActivities.map(activity => ({
      id: activity.id,
      type: 'review',
      action: activity.decision,
      description: `${activity.reviewer.firstName || activity.reviewer.email} ${activity.decision === 'APPROVED' ? '批准了' : '拒绝了'} 方案 "${activity.solution.title}"`,
      timestamp: activity.reviewedAt,
      solutionId: activity.solution.id,
      solutionTitle: activity.solution.title,
      reviewerName: `${activity.reviewer.firstName || ''} ${activity.reviewer.lastName || ''}`.trim() || activity.reviewer.email
    }));

    const stats = {
      // 概览统计
      overview: {
        totalSolutions,
        totalUsers,
        totalCreators,
        totalAdmins,
        pendingReviewSolutions,
        approvedSolutions,
        rejectedSolutions,
        totalReviews,
        totalRevenue: totalRevenue._sum.price || 0,
        recentRevenue: recentRevenue._sum.price || 0
      },
      
      // 增长统计
      growth: {
        solutions: {
          current: recentSolutions,
          previous: previousSolutions,
          rate: Math.round(solutionGrowthRate * 100) / 100
        },
        users: {
          current: recentUsers,
          previous: previousUsers,
          rate: Math.round(userGrowthRate * 100) / 100
        },
        reviews: {
          current: recentReviews,
          previous: previousReviews,
          rate: Math.round(reviewGrowthRate * 100) / 100
        }
      },
      
      // 分类统计
      categories: categoryStats.map(cat => ({
        name: cat.category,
        count: cat._count.category
      })),
      
      // 状态趋势
      statusTrends: statusTrends.map(trend => ({
        status: trend.status,
        count: trend._count.status
      })),
      
      // 最近活动
      recentActivities: formattedActivities,
      
      // 时间范围
      period: {
        days,
        startDate,
        endDate: new Date()
      }
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