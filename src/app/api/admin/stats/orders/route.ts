import { OrderStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 获取订单总数
    const totalOrders = await prisma.order.count();

    // 获取已完成订单数
    const completedOrders = await prisma.order.count({
      where: { status: OrderStatus.DELIVERED }
    });

    // 获取待处理订单数
    const pendingOrders = await prisma.order.count({
      where: { status: OrderStatus.PENDING }
    });

    // 获取已取消订单数
    const cancelledOrders = await prisma.order.count({
      where: { status: OrderStatus.CANCELLED }
    });

    // 获取订单状态分布
    const statusDistribution = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    // 获取订单创建趋势（最近30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orderTrend = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        createdAt: true,
        total: true
      }
    });

    // 按天聚合订单趋势
    const trendByDay: Record<string, { count: number; revenue: number }> = {};
    orderTrend.forEach((order: { createdAt: Date; total: any }) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (date) {
        if (!trendByDay[date]) {
          trendByDay[date] = { count: 0, revenue: 0 };
        }
        trendByDay[date].count += 1;
        trendByDay[date].revenue += parseFloat(order.total.toString());
      }
    });

    // 获取总收入
    const totalRevenue = await prisma.order.aggregate({
      where: {
        status: {
          in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED]
        }
      },
      _sum: {
        total: true
      }
    });

    // 获取平均订单价值
    const averageOrderValue = totalOrders > 0 ? 
      parseFloat(totalRevenue._sum.total?.toString() || '0') / completedOrders : 0;

    // 获取最新订单
    const recentOrders = await prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // 获取热门方案（按订单数排序）
    const popularSolutions = await prisma.orderSolution.groupBy({
      by: ['solutionId'],
      _count: {
        id: true
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // 获取方案详情
    const solutionIds = popularSolutions.map(item => item.solutionId);
    const solutions = await prisma.solution.findMany({
      where: {
        id: {
          in: solutionIds
        }
      },
      select: {
        id: true,
        title: true
      }
    });

    const popularSolutionsWithDetails = popularSolutions.map(item => {
      const solution = solutions.find(s => s.id === item.solutionId);
      return {
        solutionId: item.solutionId,
        title: solution?.title || '未知方案',
        orderCount: item._count.id || 0,
        totalQuantity: item._sum.quantity || 0
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total: totalOrders,
          completed: completedOrders,
          pending: pendingOrders,
          cancelled: cancelledOrders,
          completionRate: totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(2) : '0',
          totalRevenue: parseFloat(totalRevenue._sum.total?.toString() || '0'),
          averageOrderValue: averageOrderValue.toFixed(2)
        },
        statusDistribution: statusDistribution.map((item: { status: OrderStatus; _count: { id?: number } }) => ({
          status: item.status,
          count: item._count?.id || 0
        })),
        orderTrend: Object.entries(trendByDay).map(([date, data]) => ({
          date,
          count: data.count,
          revenue: data.revenue
        })),
        recentOrders: recentOrders.map((order: {
          id: string;
          orderNumber: string | null;
          status: OrderStatus;
          total: any;
          createdAt: Date;
          user: { firstName: string | null; lastName: string | null; email: string } | null;
        }) => ({
          id: order.id,
          orderNumber: order.orderNumber || '未知',
          status: order.status,
          total: parseFloat(order.total.toString()),
          createdAt: order.createdAt,
          customerName: order.user ? 
            `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || order.user.email : 
            '未知用户'
        })),
        popularSolutions: popularSolutionsWithDetails
      }
    });

  } catch (error) {
    console.error('获取订单统计失败:', error);
    return NextResponse.json(
      { success: false, error: '获取订单统计失败' },
      { status: 500 }
    );
  }
}