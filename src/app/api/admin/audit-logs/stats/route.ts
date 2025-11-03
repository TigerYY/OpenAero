import { NextRequest, NextResponse } from 'next/server';

import { authenticateToken } from '@/backend/auth/auth.middleware';
import { prisma } from '@/lib/prisma';

// GET /api/admin/audit-logs/stats - 获取审计日志统计
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult;
    }

    const user = (request as any).user;
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '权限不足，仅管理员可以访问审计统计' },
        { status: 403 }
      );
    }

    // 获取今天的日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 并行获取各种统计数据
    const [
      total,
      todayCount,
      successCount,
      failedCount,
      warningCount,
      byAction,
      byResource,
      byUser
    ] = await Promise.all([
      // 总操作数
      prisma.auditLog.count(),
      
      // 今日操作数
      prisma.auditLog.count({
        where: {
          timestamp: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      
      // 成功操作数
      prisma.auditLog.count({
        where: { status: 'SUCCESS' },
      }),
      
      // 失败操作数
      prisma.auditLog.count({
        where: { status: 'FAILED' },
      }),
      
      // 警告操作数
      prisma.auditLog.count({
        where: { status: 'WARNING' },
      }),
      
      // 按操作类型分组统计
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: {
          action: true,
        },
        orderBy: {
          _count: {
            action: 'desc',
          },
        },
        take: 10,
      }),
      
      // 按资源类型分组统计
      prisma.auditLog.groupBy({
        by: ['resourceType'],
        _count: {
          resourceType: true,
        },
        orderBy: {
          _count: {
            resourceType: 'desc',
          },
        },
        take: 10,
      }),
      
      // 按用户分组统计
      prisma.auditLog.groupBy({
        by: ['userEmail'],
        _count: {
          userEmail: true,
        },
        orderBy: {
          _count: {
            userEmail: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    // 格式化统计结果
    const stats = {
      total,
      today: todayCount,
      success: successCount,
      failed: failedCount,
      warning: warningCount,
      byAction: byAction.map(item => ({
        action: item.action,
        count: item._count.action,
      })),
      byResource: byResource.map(item => ({
        resource: item.resourceType,
        count: item._count.resourceType,
      })),
      byUser: byUser.map(item => ({
        user: item.userEmail,
        count: item._count.userEmail,
      })),
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('获取审计统计失败:', error);
    return NextResponse.json(
      { error: '获取审计统计失败' },
      { status: 500 }
    );
  }
}