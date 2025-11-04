import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateToken } from '@/backend/auth/auth.middleware';

import { prisma } from '@/lib/prisma';

// 获取审计日志的查询参数验证
const getAuditLogsQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('50').transform(Number),
  search: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  status: z.enum(['SUCCESS', 'FAILED', 'WARNING']).optional(),
  user: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  ipAddress: z.string().optional(),
});

// GET /api/admin/audit-logs - 获取审计日志列表
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult;
    }

    const adminUser = (request as any).user;
    if (adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '权限不足，仅管理员可以访问审计日志' },
        { status: 403 }
      );
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = getAuditLogsQuerySchema.parse(queryParams);

    const {
      page,
      limit,
      search,
      action,
      resource,
      status,
      user: userEmail,
      dateFrom,
      dateTo,
      ipAddress
    } = validatedQuery;

    // 构建查询条件
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (resource) {
      where.resourceType = resource;
    }

    if (status) {
      where.status = status;
    }

    if (userEmail) {
      where.userEmail = userEmail;
    }

    if (ipAddress) {
      where.ipAddress = { contains: ipAddress };
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resourceType: { contains: search, mode: 'insensitive' } },
        { resourceName: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) {
        where.timestamp.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.timestamp.lte = new Date(dateTo);
      }
    }

    // 计算分页
    const skip = (page - 1) * limit;

    // 并行获取日志列表和总数
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs: logs.map(log => ({
        id: log.id,
        userId: log.userId,
        userEmail: log.userEmail,
        userName: log.userName,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        resourceName: log.resourceName,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        status: log.status,
        timestamp: log.timestamp,
        duration: log.duration,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('获取审计日志失败:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '查询参数格式错误' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '获取审计日志失败' },
      { status: 500 }
    );
  }
}

// POST /api/admin/audit-logs/export - 导出审计日志
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult;
    }

    const adminUser = (request as any).user;
    if (adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '权限不足，仅管理员可以导出审计日志' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { dateFrom, dateTo, format = 'json' } = body;

    // 构建查询条件
    const where: any = {};

    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) {
        where.timestamp.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.timestamp.lte = new Date(dateTo);
      }
    }

    // 获取日志数据
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 10000, // 限制导出数量
    });

    // 格式化导出数据
    const exportData = logs.map(log => ({
      id: log.id,
      userId: log.userId,
      userEmail: log.userEmail,
      userName: log.userName,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      resourceName: log.resourceName,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      status: log.status,
      timestamp: log.timestamp,
      duration: log.duration,
    }));

    if (format === 'csv') {
      // CSV格式导出（简化实现）
      const headers = ['ID', '用户', '操作', '资源', '状态', '时间', 'IP地址'];
      const csvRows = [headers.join(',')];
      
      exportData.forEach(log => {
        const row = [
          log.id,
          `"${log.userName || log.userEmail}"`,
          `"${log.action}"`,
          `"${log.resourceType}"`,
          log.status,
          new Date(log.timestamp).toISOString(),
          log.ipAddress
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      // JSON格式导出
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

  } catch (error) {
    console.error('导出审计日志失败:', error);
    return NextResponse.json(
      { error: '导出审计日志失败' },
      { status: 500 }
    );
  }
}