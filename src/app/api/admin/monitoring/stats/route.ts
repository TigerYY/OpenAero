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
import { createSupabaseAdmin } from '@/lib/auth/supabase-client';

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

    // Note: auditLog model doesn't exist in Prisma schema
    // Using Supabase client instead
    const supabase = createSupabaseAdmin();
    
    // 获取所有审计日志（用于统计）
    const { data: allLogs, error: logsError } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('created_at', startDate.toISOString());
    
    if (logsError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch audit logs:', logsError);
      }
      // Return empty stats on error
      return createSuccessResponse({
        auditLogStats: [],
        errorLogs: [],
        userActivity: [],
        resourceStats: [],
        successRate: 0,
        recentActivity: [],
      });
    }
    
    const logs = allLogs || [];
    
    // 手动分组统计 - 按操作类型
    const actionMap = new Map<string, number>();
    logs.forEach((log: any) => {
      const action = log.action || 'UNKNOWN';
      actionMap.set(action, (actionMap.get(action) || 0) + 1);
    });
    const auditLogStats = Array.from(actionMap.entries()).map(([action, count]) => ({
      action,
      _count: { id: count },
    }));

    // 获取错误日志统计
    const errorLogs = logs
      .filter((log: any) => !log.success)
      .map((log: any) => ({
        id: log.id,
        action: log.action,
        createdAt: log.created_at,
        errorMessage: log.error_message,
      }))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100);

    // 获取用户活动统计
    const userActivityMap = new Map<string, number>();
    logs.forEach((log: any) => {
      const userId = log.user_id || 'SYSTEM';
      userActivityMap.set(userId, (userActivityMap.get(userId) || 0) + 1);
    });
    const userActivity = Array.from(userActivityMap.entries())
      .map(([userId, count]) => ({
        userId,
        _count: { id: count },
      }))
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 10);

    // 获取资源访问统计
    const resourceMap = new Map<string, number>();
    logs.forEach((log: any) => {
      const resource = log.resource || 'UNKNOWN';
      resourceMap.set(resource, (resourceMap.get(resource) || 0) + 1);
    });
    const resourceStats = Array.from(resourceMap.entries())
      .map(([resource, count]) => ({
        resource,
        _count: { id: count },
      }))
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 10);

    // 计算成功率
    const totalLogs = logs.length;
    const successLogs = logs.filter((log: any) => log.success).length;
    const successRate = totalLogs > 0 ? (successLogs / totalLogs) * 100 : 0;

    // 获取最近的活动
    const recentActivity = logs
      .map((log: any) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resource_id,
        userId: log.user_id,
        success: log.success,
        createdAt: log.created_at,
      }))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

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
    if (process.env.NODE_ENV === 'development') {
      console.error('获取监控统计失败:', error);}
    return createErrorResponse(
      '获取监控统计失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

