/**
 * 系统监控统计 API
 * GET /api/admin/monitoring/stats - 获取系统监控统计数据
 */

import { NextRequest } from 'next/server';
import {
  requireAdminAuth,
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET - 获取系统监控统计
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '24h'; // 24h, 7d, 30d

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // 获取审计日志统计
    const auditLogStats = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // 获取错误日志统计
    const errorLogs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
        success: false,
      },
      select: {
        id: true,
        action: true,
        createdAt: true,
        errorMessage: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    // 获取用户活动统计
    const userActivity = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // 获取资源访问统计
    const resourceStats = await prisma.auditLog.groupBy({
      by: ['resource'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // 计算成功率
    const totalLogs = await prisma.auditLog.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    const successLogs = await prisma.auditLog.count({
      where: {
        createdAt: {
          gte: startDate,
        },
        success: true,
      },
    });

    const successRate = totalLogs > 0 ? (successLogs / totalLogs) * 100 : 0;

    // 获取最近的活动
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        id: true,
        action: true,
        resource: true,
        resourceId: true,
        userId: true,
        success: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    const stats = {
      period,
      totalLogs,
      successLogs,
      errorLogs: totalLogs - successLogs,
      successRate: Math.round(successRate * 100) / 100,
      actionStats: auditLogStats.map((stat) => ({
        action: stat.action,
        count: stat._count.id,
      })),
      resourceStats: resourceStats.map((stat) => ({
        resource: stat.resource,
        count: stat._count.id,
      })),
      topUsers: userActivity.map((stat) => ({
        userId: stat.userId,
        count: stat._count.id,
      })),
      recentErrors: errorLogs.slice(0, 20).map((log) => ({
        id: log.id,
        action: log.action,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt,
      })),
      recentActivity: recentActivity.map((activity) => ({
        id: activity.id,
        action: activity.action,
        resource: activity.resource,
        resourceId: activity.resourceId,
        userId: activity.userId,
        success: activity.success,
        createdAt: activity.createdAt,
      })),
    };

    return createSuccessResponse(stats, '获取监控统计成功');
  } catch (error) {
    console.error('获取监控统计失败:', error);
    return createErrorResponse(
      '获取监控统计失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

