import { SolutionStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const metric = searchParams.get('metric') || 'all';

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const result: any = {};

    if (metric === 'all' || metric === 'users') {
      // 用户相关指标
      const totalUsers = await prisma.user.count();
      const newUsersToday = await prisma.user.count({
        where: {
          createdAt: {
            gte: oneDayAgo
          }
        }
      });
      const newUsersLastHour = await prisma.user.count({
        where: {
          createdAt: {
            gte: oneHourAgo
          }
        }
      });

      result.users = {
        total: totalUsers,
        newToday: newUsersToday,
        newLastHour: newUsersLastHour,
        timestamp: now.toISOString()
      };
    }

    if (metric === 'all' || metric === 'orders') {
      // 订单相关指标
      const totalOrders = await prisma.order.count();
      const newOrdersToday = await prisma.order.count({
        where: {
          createdAt: {
            gte: oneDayAgo
          }
        }
      });
      const newOrdersLastHour = await prisma.order.count({
        where: {
          createdAt: {
            gte: oneHourAgo
          }
        }
      });

      // 今日收入
      const todayRevenue = await prisma.order.aggregate({
        where: {
          createdAt: {
            gte: oneDayAgo
          },
          status: 'DELIVERED'
        },
        _sum: {
          total: true
        }
      });

      result.orders = {
        total: totalOrders,
        newToday: newOrdersToday,
        newLastHour: newOrdersLastHour,
        revenueToday: Number(todayRevenue._sum.total) || 0,
        timestamp: now.toISOString()
      };
    }

    if (metric === 'all' || metric === 'solutions') {
      // 方案相关指标
      const totalSolutions = await prisma.solution.count();
      const newSolutionsToday = await prisma.solution.count({
        where: {
          createdAt: {
            gte: oneDayAgo
          }
        }
      });
      const pendingSolutions = await prisma.solution.count({
        where: {
          status: SolutionStatus.PENDING_REVIEW
        }
      });

      result.solutions = {
        total: totalSolutions,
        newToday: newSolutionsToday,
        pendingReview: pendingSolutions,
        timestamp: now.toISOString()
      };
    }

    if (metric === 'all' || metric === 'reviews') {
      // 评价相关指标
      const totalReviews = await prisma.review.count();
      const newReviewsToday = await prisma.review.count({
        where: {
          createdAt: {
            gte: oneDayAgo
          }
        }
      });

      // 平均评分
      const averageRating = await prisma.review.aggregate({
        _avg: {
          rating: true
        }
      });

      result.reviews = {
        total: totalReviews,
        newToday: newReviewsToday,
        averageRating: Math.round((averageRating._avg.rating || 0) * 100) / 100,
        timestamp: now.toISOString()
      };
    }

    if (metric === 'all' || metric === 'system') {
      // 系统指标（模拟数据）
      result.system = {
        cpuUsage: Math.round(Math.random() * 30 + 20), // 20-50%
        memoryUsage: Math.round(Math.random() * 20 + 60), // 60-80%
        diskUsage: Math.round(Math.random() * 10 + 45), // 45-55%
        activeConnections: Math.round(Math.random() * 100 + 50), // 50-150
        responseTime: Math.round(Math.random() * 50 + 100), // 100-150ms
        timestamp: now.toISOString()
      };
    }

    // 如果请求特定指标，只返回该指标
    if (metric !== 'all') {
      const specificResult = result[metric];
      if (!specificResult) {
        return NextResponse.json(
          { success: false, error: '不支持的监控指标' },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        data: specificResult
      });
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('获取监控数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取监控数据失败' },
      { status: 500 }
    );
  }
}

// WebSocket连接处理（用于实时推送）
export async function POST(request: NextRequest) {
  try {
    const { action, clientId } = await request.json();

    if (action === 'subscribe') {
      // 这里应该实现WebSocket连接逻辑
      // 由于Next.js API Routes不直接支持WebSocket，
      // 实际项目中可能需要使用Socket.io或其他WebSocket库
      
      return NextResponse.json({
        success: true,
        message: '订阅成功',
        clientId: clientId || `client_${Date.now()}`
      });
    }

    if (action === 'unsubscribe') {
      return NextResponse.json({
        success: true,
        message: '取消订阅成功'
      });
    }

    return NextResponse.json(
      { success: false, error: '不支持的操作' },
      { status: 400 }
    );

  } catch (error) {
    console.error('处理监控请求失败:', error);
    return NextResponse.json(
      { success: false, error: '处理监控请求失败' },
      { status: 500 }
    );
  }
}