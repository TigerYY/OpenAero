import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { createSupabaseAdmin } from '@/lib/auth/supabase-client';

// GET /api/admin/audit-logs/stats - 获取审计日志统计
export async function GET(request: NextRequest) {
  try {
    // 移除了用户认证，因为用户系统已被清除

    // 获取今天的日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Note: auditLog model doesn't exist in Prisma schema
    // Using Supabase client instead
    const supabase = createSupabaseAdmin();
    
    // 并行获取各种统计数据
    const [
      totalResult,
      todayResult,
      successResult,
      failedResult,
      warningResult,
      allLogsResult
    ] = await Promise.all([
      // 总操作数
      supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
      
      // 今日操作数
      supabase.from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString()),
      
      // 成功操作数
      supabase.from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('success', true),
      
      // 失败操作数
      supabase.from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('success', false),
      
      // 警告操作数（注意：Supabase 中没有 status 字段，使用 metadata 或其他字段）
      supabase.from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('success', true), // 临时使用 success=true 作为警告
      
      // 获取所有日志用于分组统计
      supabase.from('audit_logs').select('action, resource, user_id'),
    ]);
    
    const total = totalResult.count || 0;
    const todayCount = todayResult.count || 0;
    const successCount = successResult.count || 0;
    const failedCount = failedResult.count || 0;
    const warningCount = warningResult.count || 0;
    
    // 手动分组统计
    const allLogs = allLogsResult.data || [];
    
    // 按操作类型分组
    const actionMap = new Map<string, number>();
    allLogs.forEach((log: any) => {
      const action = log.action || 'UNKNOWN';
      actionMap.set(action, (actionMap.get(action) || 0) + 1);
    });
    const byAction = Array.from(actionMap.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // 按资源类型分组
    const resourceMap = new Map<string, number>();
    allLogs.forEach((log: any) => {
      const resource = log.resource || 'UNKNOWN';
      resourceMap.set(resource, (resourceMap.get(resource) || 0) + 1);
    });
    const byResource = Array.from(resourceMap.entries())
      .map(([resource, count]) => ({ resource, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // 按用户分组（需要获取用户邮箱）
    const userMap = new Map<string, number>();
    allLogs.forEach((log: any) => {
      const userId = log.user_id || 'SYSTEM';
      userMap.set(userId, (userMap.get(userId) || 0) + 1);
    });
    const byUser = Array.from(userMap.entries())
      .map(([userId, count]) => ({ user: userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 格式化统计结果
    const stats = {
      total,
      today: todayCount,
      success: successCount,
      failed: failedCount,
      warning: warningCount,
      byAction,
      byResource,
      byUser,
    };

    return NextResponse.json(stats);

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('获取审计统计失败:', error);}
    return NextResponse.json(
      { error: '获取审计统计失败' },
      { status: 500 }
    );
  }
}