import { OrderStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    
    // 计算时间范围
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // 获取收益总额
    const totalRevenue = await prisma.order.aggregate({
      _sum: {
        total: true,
      },
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: {
          gte: startDate,
        },
      },
    });

    // 获取收益趋势
    const revenueTrend = await prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        total: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 按日期聚合收益趋势
    const trendByDay: Record<string, number> = {};
    revenueTrend.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      const amount = Number(order.total) || 0;
      if (date) {
        trendByDay[date] = (trendByDay[date] || 0) + amount;
      }
    });

    const trendData = Object.entries(trendByDay).map(([date, amount]) => ({
      date,
      amount,
    }));

    // 获取按订单状态的收益统计
    const revenueByStatus = await prisma.order.groupBy({
      by: ['status'],
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    const distributionStats = revenueByStatus.map((item) => {
      const amount = Number(item._sum.total) || 0;
      const count = item._count.id || 0;
      
      return {
        status: item.status,
        revenue: amount,
        orderCount: count,
        percentage: 0, // 将在后面计算
      };
    });

    // 计算百分比
    const totalRevenueAmount = distributionStats.reduce((sum, item) => sum + item.revenue, 0);
    distributionStats.forEach(item => {
      item.percentage = totalRevenueAmount > 0 ? (item.revenue / totalRevenueAmount) * 100 : 0;
    });

    // 获取高价值订单
    const highValueOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        total: {
          gte: 1000
        },
        createdAt: {
          gte: startDate
        }
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        total: 'desc'
      },
      take: 10
    });

    // 计算增长率
    const previousPeriodStart = new Date(startDate);
    const periodDuration = now.getTime() - startDate.getTime();
    previousPeriodStart.setTime(startDate.getTime() - periodDuration);

    const previousRevenue = await prisma.order.aggregate({
      _sum: {
        total: true,
      },
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: {
          gte: previousPeriodStart,
          lt: startDate,
        },
      },
    });

    const currentAmount = Number(totalRevenue._sum.total) || 0;
    const previousAmount = Number(previousRevenue._sum.total) || 0;
    const growthRate = previousAmount > 0 ? ((currentAmount - previousAmount) / previousAmount) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue: currentAmount,
        growthRate,
        period,
        trend: trendData,
        distributionStats,
        highValueOrders: highValueOrders.map(order => ({
          id: order.id,
          amount: Number(order.total),
          date: order.createdAt.toISOString(),
          customerName: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || '未知用户'
        })),
        summary: {
          totalOrders: distributionStats.reduce((sum, item) => sum + item.orderCount, 0),
          averageOrderValue: distributionStats.reduce((sum, item) => sum + item.orderCount, 0) > 0 
            ? currentAmount / distributionStats.reduce((sum, item) => sum + item.orderCount, 0) 
            : 0,
          completedOrders: distributionStats.find(item => item.status === OrderStatus.DELIVERED)?.orderCount || 0,
          pendingRevenue: distributionStats.filter(item => item.status !== OrderStatus.DELIVERED)
            .reduce((sum, item) => sum + item.revenue, 0),
        },
      },
    });

  } catch (error) {
    console.error('获取收益统计失败:', error);
    return NextResponse.json(
      { success: false, error: '获取收益统计失败' },
      { status: 500 }
    );
  }
}