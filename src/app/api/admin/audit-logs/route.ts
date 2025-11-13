/**
 * 审计日志查询 API
 * GET /api/admin/audit-logs - 获取审计日志列表
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  requireAdminAuth,
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createPaginatedResponse,
} from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const auditLogsQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  action: z.string().optional(),
  resource: z.string().optional(),
  userId: z.string().optional(),
  success: z.string().optional().transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

/**
 * GET - 获取审计日志列表
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const searchParams = request.nextUrl.searchParams;
    const queryResult = auditLogsQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      action: searchParams.get('action'),
      resource: searchParams.get('resource'),
      userId: searchParams.get('userId'),
      success: searchParams.get('success'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      search: searchParams.get('search'),
    });

    if (!queryResult.success) {
      return createValidationErrorResponse(queryResult.error);
    }

    const { page, limit, action, resource, userId, success, startDate, endDate, search } =
      queryResult.data;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }

    if (resource) {
      where.resource = { contains: resource, mode: 'insensitive' };
    }

    if (userId) {
      where.userId = userId;
    }

    if (success !== undefined) {
      where.success = success;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { resourceId: { contains: search, mode: 'insensitive' } },
        { errorMessage: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          userId: true,
          action: true,
          resource: true,
          resourceId: true,
          success: true,
          errorMessage: true,
          metadata: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // 获取用户信息（如果需要）
    const userIds = [...new Set(logs.map((log) => log.userId).filter(Boolean))];
    const users = userIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { user_id: { in: userIds } },
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            display_name: true,
          },
        })
      : [];

    const userMap = new Map(users.map((u) => [u.user_id, u]));

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.userId
        ? userMap.get(log.userId)?.display_name ||
          `${userMap.get(log.userId)?.first_name || ''} ${userMap.get(log.userId)?.last_name || ''}`.trim() ||
          'Unknown'
        : 'System',
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      success: log.success,
      errorMessage: log.errorMessage,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    }));

    return createPaginatedResponse(
      formattedLogs,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      '获取审计日志成功'
    );
  } catch (error) {
    console.error('获取审计日志失败:', error);
    return createErrorResponse(
      '获取审计日志失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}
