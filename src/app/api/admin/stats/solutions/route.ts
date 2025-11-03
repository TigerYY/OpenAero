import { SolutionStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // 获取方案总数
    const totalSolutions = await prisma.solution.count();

    // 获取已发布方案数
    const publishedSolutions = await prisma.solution.count({
      where: { status: SolutionStatus.PUBLISHED }
    });

    // 获取待审核方案数
    const pendingSolutions = await prisma.solution.count({
      where: { status: SolutionStatus.PENDING_REVIEW }
    });

    // 获取方案状态分布
    const statusDistribution = await prisma.solution.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    // 获取方案分类统计
    const categoryStats = await prisma.solution.groupBy({
      by: ['category'],
      _count: {
        id: true
      }
    });

    // 获取方案创建趋势（最近30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const creationTrend = await prisma.solution.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        createdAt: true
      }
    });

    // 按天聚合创建趋势
    const trendByDay: Record<string, number> = {};
    creationTrend.forEach((solution: { createdAt: Date }) => {
      const date = solution.createdAt.toISOString().split('T')[0];
      if (date) {
        trendByDay[date] = (trendByDay[date] || 0) + 1;
      }
    });

    // 获取最受欢迎的方案（按订单数排序）
    const popularSolutions = await prisma.solution.findMany({
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: {
        orders: {
          _count: 'desc'
        }
      },
      take: 10
    });

    // 获取最新方案
    const recentSolutions = await prisma.solution.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total: totalSolutions,
          published: publishedSolutions,
          pending: pendingSolutions,
          approvalRate: totalSolutions > 0 ? (publishedSolutions / totalSolutions * 100).toFixed(2) : '0'
        },
        statusDistribution: statusDistribution.map((item: { status: SolutionStatus; _count: { id?: number } }) => {
          const count = item._count?.id;
          return {
            status: item.status,
            count: count || 0
          };
        }),
        categoryStats: categoryStats.map((item: { category: string; _count: { id?: number } }) => {
          const count = item._count?.id;
          return {
            category: item.category,
            count: count || 0
          };
        }),
        creationTrend: Object.entries(trendByDay).map(([date, count]) => ({
          date,
          count
        })),
        popularSolutions: popularSolutions.map((solution: any) => {
          const orderCount = solution._count?.orders || 0;
          return {
            id: solution.id,
            title: solution.title,
            orderCount
          };
        }),
        recentSolutions: recentSolutions.map((solution: { 
          id: string; 
          title: string; 
          status: SolutionStatus; 
          createdAt: Date; 
          user: { firstName: string | null; lastName: string | null } | null 
        }) => ({
          id: solution.id,
          title: solution.title,
          status: solution.status,
          createdAt: solution.createdAt,
          creatorName: solution.user ? `${solution.user.firstName || ''} ${solution.user.lastName || ''}`.trim() || '未知' : '未知'
        }))
      }
    });

  } catch (error) {
    console.error('获取方案统计失败:', error);
    return NextResponse.json(
      { success: false, error: '获取方案统计失败' },
      { status: 500 }
    );
  }
}