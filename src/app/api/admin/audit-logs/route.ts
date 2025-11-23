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
import { createSupabaseAdmin } from '@/lib/auth/supabase-client';

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

    // Note: auditLog model doesn't exist in Prisma schema
    // Using Supabase client instead
    const supabase = createSupabaseAdmin();
    
    // Build Supabase query
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);
    
    // Apply filters
    if (where.userId) {
      query = query.eq('user_id', where.userId);
    }
    if (where.action) {
      query = query.eq('action', where.action);
    }
    if (where.resource) {
      query = query.eq('resource', where.resource);
    }
    if (where.success !== undefined) {
      query = query.eq('success', where.success);
    }
    if (where.createdAt) {
      if (where.createdAt.gte) {
        query = query.gte('created_at', where.createdAt.gte.toISOString());
      }
      if (where.createdAt.lte) {
        query = query.lte('created_at', where.createdAt.lte.toISOString());
      }
    }
    if (where.OR && where.OR.length > 0) {
      // Handle search - extract search term from OR conditions
      const searchConditions = where.OR as any[];
      const searchTerms: string[] = [];
      searchConditions.forEach(condition => {
        if (condition.action?.contains) searchTerms.push(condition.action.contains);
        if (condition.resource?.contains) searchTerms.push(condition.resource.contains);
        if (condition.resourceId?.contains) searchTerms.push(condition.resourceId.contains);
        if (condition.errorMessage?.contains) searchTerms.push(condition.errorMessage.contains);
      });
      const searchTerm = searchTerms[0]; // Use first search term
      if (searchTerm) {
        // Supabase doesn't support OR directly, so we'll search in multiple fields
        query = query.or(`action.ilike.%${searchTerm}%,resource.ilike.%${searchTerm}%,resource_id.ilike.%${searchTerm}%,error_message.ilike.%${searchTerm}%`);
      }
    }
    
    const { data: logsData, error, count } = await query;
    
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch audit logs:', error);
      }
      return createErrorResponse('获取审计日志失败', 500);
    }
    
    const logs = (logsData || []).map((log: any) => ({
      id: log.id,
      userId: log.user_id,
      action: log.action,
      resource: log.resource,
      resourceId: log.resource_id,
      success: log.success,
      errorMessage: log.error_message,
      metadata: log.metadata,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      createdAt: log.created_at,
    }));
    
    const total = count || 0;

    // 获取用户信息（如果需要）
    const userIds = [...new Set(logs.map((log: any) => log.userId).filter(Boolean))];
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

    const formattedLogs = logs.map((log: any) => ({
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
      page,
      limit,
      total,
      '获取审计日志成功'
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('获取审计日志失败:', error);}
    return createErrorResponse(
      '获取审计日志失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}
