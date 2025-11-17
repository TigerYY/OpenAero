import { NextRequest, NextResponse } from 'next/server';

import { authenticateRequest } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';
import { detectAlerts, Alert } from '@/lib/admin/alert-utils';
import { dashboardCache } from '@/lib/admin/dashboard-cache';

// GET /api/admin/dashboard/alerts - 获取预警列表
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
    const userRoles = authResult.user.roles || [];
    if (!userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
      const response: ApiResponse<null> = {
        success: false,
        error: '权限不足，仅管理员可以查看预警',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    // 获取统计数据用于预警检测
    const timeRangeParam = request.nextUrl.searchParams.get('timeRange');
    const days = parseInt(timeRangeParam || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 检查缓存
    const cachedData = await dashboardCache.getAlerts(days);
    if (cachedData) {
      return NextResponse.json(cachedData, { 
        status: 200,
        headers: {
          'X-Cache': 'HIT',
        },
      });
    }

    // 获取关键指标
    const [
      pendingSolutions,
      totalSolutions,
      previousSolutions,
      totalUsers,
      previousUsers,
      completedReviews,
    ] = await Promise.all([
      // 待审核方案数
      prisma.solution.count({ where: { status: 'PENDING_REVIEW' } }),
      // 当前时间段方案数
      prisma.solution.count({ where: { created_at: { gte: startDate } } }),
      // 上一时间段方案数（用于计算增长率）
      prisma.solution.count({
        where: {
          created_at: {
            gte: new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000),
            lt: startDate,
          },
        },
      }),
      // 当前时间段用户数
      prisma.userProfile.count({ where: { created_at: { gte: startDate } } }),
      // 上一时间段用户数
      prisma.userProfile.count({
        where: {
          created_at: {
            gte: new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000),
            lt: startDate,
          },
        },
      }),
      // 已完成审核记录（用于计算平均审核时间）
      prisma.solutionReview.findMany({
        where: {
          status: 'COMPLETED',
          reviewed_at: { gte: startDate, not: null },
          decision: { in: ['APPROVED', 'REJECTED'] },
        },
        select: {
          solution_id: true,
          reviewed_at: true,
          solution: {
            select: {
              submitted_at: true,
              created_at: true,
            },
          },
        },
      }),
    ]);

    // 计算用户增长率
    const userGrowth = previousUsers > 0
      ? ((totalUsers - previousUsers) / previousUsers * 100)
      : totalUsers > 0 ? 100 : 0;

    // 计算平均审核时间
    let avgReviewTime = 0;
    const reviewTimes: number[] = [];
    for (const review of completedReviews) {
      const reviewedAt = review.reviewed_at;
      const submittedAt = review.solution.submitted_at || review.solution.created_at;
      if (reviewedAt && submittedAt) {
        const hours = (reviewedAt.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);
        if (hours > 0) {
          reviewTimes.push(hours);
        }
      }
    }
    if (reviewTimes.length > 0) {
      const totalTime = reviewTimes.reduce((a, b) => a + b, 0);
      avgReviewTime = Math.round((totalTime / reviewTimes.length) * 10) / 10;
    }

    // 检测预警
    const alerts = detectAlerts({
      pendingSolutions,
      userGrowth,
      avgReviewTime,
    });

    // 按级别排序（critical > warning > info）
    const levelOrder = { critical: 3, warning: 2, info: 1 };
    alerts.sort((a, b) => levelOrder[b.level] - levelOrder[a.level]);

    const response: ApiResponse<{
      alerts: Alert[];
      summary: {
        total: number;
        critical: number;
        warning: number;
        info: number;
      };
    }> = {
      success: true,
      data: {
        alerts,
        summary: {
          total: alerts.length,
          critical: alerts.filter(a => a.level === 'critical').length,
          warning: alerts.filter(a => a.level === 'warning').length,
          info: alerts.filter(a => a.level === 'info').length,
        },
      },
      message: '预警数据获取成功'
    };

    // 缓存响应数据
    dashboardCache.setAlerts(days, response);

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'X-Cache': 'MISS',
      },
    });

  } catch (error) {
    console.error('获取预警失败:', error);

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取预警失败',
      data: null
    };

    return NextResponse.json(response, { status: 500 });
  }
}

