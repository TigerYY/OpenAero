/**
 * 性能监控 API
 * GET /api/admin/monitoring/performance - 获取性能监控数据
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
 * GET - 获取性能监控数据
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
    
    // 获取API响应时间统计（从审计日志中提取，如果有duration字段）
    // 注意：这需要审计日志记录duration信息
    const { data: apiCallsData } = await supabase
      .from('audit_logs')
      .select('action, created_at, metadata')
      .gte('created_at', startDate.toISOString())
      .like('action', 'API_%');
    
    const apiCalls = (apiCallsData || []).map((log: any) => ({
      action: log.action,
      createdAt: log.created_at,
      metadata: log.metadata,
    }));

    // 按小时分组统计
    const hourlyStats: Record<string, { count: number; avgDuration: number }> = {};
    apiCalls.forEach((call) => {
      const hour = new Date(call.createdAt).toISOString().slice(0, 13) + ':00:00';
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { count: 0, avgDuration: 0 };
      }
      hourlyStats[hour].count += 1;
      // 如果有duration信息，累加
      if (call.metadata && typeof call.metadata === 'object' && 'duration' in call.metadata) {
        const duration = Number(call.metadata.duration) || 0;
        hourlyStats[hour].avgDuration =
          (hourlyStats[hour].avgDuration * (hourlyStats[hour].count - 1) + duration) /
          hourlyStats[hour].count;
      }
    });

    // 获取数据库查询统计
    const { count: dbQueriesCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .ilike('action', '%QUERY%');
    
    const dbQueries = dbQueriesCount || 0;

    // 获取用户活动统计
    const { data: allActivityLogs } = await supabase
      .from('audit_logs')
      .select('user_id')
      .gte('created_at', startDate.toISOString());
    
    const userActivityMap = new Map<string, number>();
    (allActivityLogs || []).forEach((log: any) => {
      const userId = log.user_id || 'SYSTEM';
      userActivityMap.set(userId, (userActivityMap.get(userId) || 0) + 1);
    });
    const userActivity = Array.from(userActivityMap.entries()).map(([userId, count]) => ({
      userId,
      _count: { id: count },
    }));

    const totalUsers = userActivity.length;
    
    const { count: totalRequestsCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());
    
    const totalRequests = totalRequestsCount || 0;

    // 计算平均响应时间（如果有数据）
    const avgResponseTime = Object.values(hourlyStats).reduce(
      (sum, stat) => sum + stat.avgDuration,
      0
    ) / Object.keys(hourlyStats).length || 0;

    const performanceData = {
      period,
      totalRequests,
      totalUsers,
      dbQueries,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      hourlyStats: Object.entries(hourlyStats)
        .map(([hour, stats]) => ({
          hour,
          count: stats.count,
          avgDuration: Math.round(stats.avgDuration * 100) / 100,
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour)),
      peakHour: Object.entries(hourlyStats).reduce(
        (max, [hour, stats]) => (stats.count > max.count ? { hour, ...stats } : max),
        { hour: '', count: 0, avgDuration: 0 }
      ),
    };

    return createSuccessResponse(performanceData, '获取性能监控数据成功');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('获取性能监控数据失败:', error);}
    return createErrorResponse(
      '获取性能监控数据失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

