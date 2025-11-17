import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminAuth } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';
import { 
  exportLargeDataset, 
  generateExportFilename, 
  ExportFormat 
} from '@/lib/admin/export-utils';
import { dashboardCache } from '@/lib/admin/dashboard-cache';

// 快速操作验证模式
const quickActionSchema = z.object({
  action: z.enum([
    'approve_all_pending',
    'reject_all_pending', 
    'export_solutions',
    'export_users',
    'clear_old_reviews',
    'send_bulk_notification'
  ]),
  params: z.record(z.any()).optional()
});

// POST /api/admin/dashboard/quick-actions - 执行管理员快速操作
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const validatedData = quickActionSchema.parse(body);

    let result: any = null;
    let message = '';

    switch (validatedData.action) {
      case 'approve_all_pending':
        result = await approveAllPendingSolutions(authResult.user.id);
        message = `批量批准完成: ${result.approved}个方案已批准`;
        // 清除相关缓存
        dashboardCache.clearStats();
        dashboardCache.clearCharts();
        dashboardCache.clearActivities();
        break;

      case 'reject_all_pending':
        const reason = validatedData.params?.reason || '批量拒绝操作';
        result = await rejectAllPendingSolutions(authResult.user.id, reason);
        message = `批量拒绝完成: ${result.rejected}个方案已拒绝`;
        // 清除相关缓存
        dashboardCache.clearStats();
        dashboardCache.clearCharts();
        dashboardCache.clearActivities();
        break;

      case 'export_solutions':
        result = await exportSolutions(validatedData.params);
        // 如果指定了格式，返回文件数据
        if (validatedData.params?.format && validatedData.params.format !== 'json') {
          const format = validatedData.params.format as ExportFormat;
          const exportResult = await exportLargeDataset(
            result.data,
            {
              format,
              filename: generateExportFilename('solutions', format),
              sheetName: '方案数据',
            }
          );
          
          // 返回文件响应
          const contentType = format === 'excel' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/csv';
          
          return new NextResponse(exportResult.data, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
            },
          });
        }
        message = `方案数据导出完成: ${result.count}条记录`;
        break;

      case 'export_users':
        result = await exportUsers(validatedData.params);
        // 如果指定了格式，返回文件数据
        if (validatedData.params?.format && validatedData.params.format !== 'json') {
          const format = validatedData.params.format as ExportFormat;
          const exportResult = await exportLargeDataset(
            result.data,
            {
              format,
              filename: generateExportFilename('users', format),
              sheetName: '用户数据',
            }
          );
          
          // 返回文件响应
          const contentType = format === 'excel' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/csv';
          
          return new NextResponse(exportResult.data, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
            },
          });
        }
        message = `用户数据导出完成: ${result.count}条记录`;
        break;

      case 'clear_old_reviews':
        const days = validatedData.params?.days || 90;
        result = await clearOldReviews(days);
        message = `清理完成: 删除了${result.deleted}条${days}天前的审核记录`;
        break;

      case 'send_bulk_notification':
        result = await sendBulkNotification(validatedData.params);
        message = `批量通知发送完成: ${result.sent}个通知已发送`;
        break;

      default:
        throw new Error('不支持的操作类型');
    }

    // 移除了操作日志记录，因为用户系统已被清除

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('执行快速操作失败:', error);
    
    if (error instanceof z.ZodError) {
      const response: ApiResponse<null> = {
        success: false,
        error: JSON.stringify(error.errors),
        data: null
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '执行快速操作失败',
      data: null
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// 批准所有待审核方案
async function approveAllPendingSolutions(adminId: string) {
  const pendingSolutions = await prisma.solution.findMany({
    where: { status: 'PENDING_REVIEW' },
    select: {
      id: true,
      title: true,
    }
  });

  let approved = 0;
  const results = [];

  for (const solution of pendingSolutions) {
    try {
      await prisma.solution.update({
        where: { id: solution.id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(), // Solution 使用 camelCase
          reviewNotes: '批量批准操作' // Solution 使用 camelCase
        }
      });

      // 创建审核记录（SolutionReview 使用 camelCase）
      await prisma.solutionReview.create({
        data: {
          solutionId: solution.id, // SolutionReview 使用 camelCase
          reviewerId: adminId, // SolutionReview 使用 camelCase
          status: 'COMPLETED',
          decision: 'APPROVED',
          comments: '批量批准操作',
          reviewedAt: new Date() // SolutionReview 使用 camelCase
        }
      });

      approved++;
      results.push({ id: solution.id, title: solution.title, status: 'approved' });
    } catch (error) {
      console.error(`批准方案 ${solution.id} 失败:`, error);
      results.push({ id: solution.id, title: solution.title, status: 'failed', error: error instanceof Error ? error.message : '未知错误' });
    }
  }

  return { approved, total: pendingSolutions.length, results };
}

// 拒绝所有待审核方案
async function rejectAllPendingSolutions(adminId: string, reason: string) {
  const pendingSolutions = await prisma.solution.findMany({
    where: { status: 'PENDING_REVIEW' },
    select: {
      id: true,
      title: true,
    }
  });

  let rejected = 0;
  const results = [];

  for (const solution of pendingSolutions) {
    try {
      await prisma.solution.update({
        where: { id: solution.id },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(), // Solution 使用 camelCase
          reviewNotes: reason // Solution 使用 camelCase
        }
      });

      // 创建审核记录（SolutionReview 使用 camelCase）
      await prisma.solutionReview.create({
        data: {
          solutionId: solution.id, // SolutionReview 使用 camelCase
          reviewerId: adminId, // SolutionReview 使用 camelCase
          status: 'COMPLETED',
          decision: 'REJECTED',
          comments: reason,
          reviewedAt: new Date() // SolutionReview 使用 camelCase
        }
      });

      rejected++;
      results.push({ id: solution.id, title: solution.title, status: 'rejected' });
    } catch (error) {
      console.error(`拒绝方案 ${solution.id} 失败:`, error);
      results.push({ id: solution.id, title: solution.title, status: 'failed', error: error instanceof Error ? error.message : '未知错误' });
    }
  }

  return { rejected, total: pendingSolutions.length, results };
}

// 导出方案数据
async function exportSolutions(params: any = {}) {
  const where: any = {};
  
  // 状态筛选
  if (params.status) {
    if (Array.isArray(params.status)) {
      where.status = { in: params.status };
    } else {
      where.status = params.status;
    }
  }
  
  // 分类筛选
  if (params.category) {
    if (Array.isArray(params.category)) {
      where.category = { in: params.category };
    } else {
      where.category = params.category;
    }
  }
  
  // 日期范围筛选
  if (params.dateFrom) {
    where.createdAt = { gte: new Date(params.dateFrom) }; // Solution 使用 camelCase
  }
  
  if (params.dateTo) {
    if (where.createdAt) {
      where.createdAt.lte = new Date(params.dateTo);
    } else {
      where.createdAt = { lte: new Date(params.dateTo) };
    }
  }
  
  // 价格范围筛选
  if (params.priceMin !== undefined) {
    where.price = { gte: parseFloat(params.priceMin) };
  }
  
  if (params.priceMax !== undefined) {
    if (where.price) {
      where.price.lte = parseFloat(params.priceMax);
    } else {
      where.price = { lte: parseFloat(params.priceMax) };
    }
  }
  
  // 限制导出数量（防止内存溢出）
  const limit = params.limit ? Math.min(parseInt(params.limit), 50000) : 50000;

  const solutions = await prisma.solution.findMany({
    where,
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      price: true,
      status: true,
      createdAt: true, // Solution 使用 camelCase
      updatedAt: true, // Solution 使用 camelCase
      reviewedAt: true, // Solution 使用 camelCase
      reviewNotes: true, // Solution 使用 camelCase
      creator: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' } // Solution 使用 camelCase
  });

  // 格式化导出数据（Solution 字段已经是 camelCase，直接使用）
  const exportData = solutions.map(solution => ({
    id: solution.id,
    title: solution.title,
    description: solution.description,
    category: solution.category,
    price: solution.price?.toString() || '0',
    status: solution.status,
    creator: solution.creator?.displayName || '未知',
    createdAt: solution.createdAt?.toISOString() || '',
    updatedAt: solution.updatedAt?.toISOString() || '',
    reviewedAt: solution.reviewedAt?.toISOString() || '',
    reviewNotes: solution.reviewNotes || '',
  }));

  return { count: exportData.length, data: exportData };
}

// 导出用户数据
async function exportUsers(params: any = {}) {
  const where: any = {};
  
  // 角色筛选
  if (params.role) {
    // 支持多角色查询
    if (Array.isArray(params.role)) {
      where.OR = params.role.flatMap((r: string) => [
        { role: r },
        { roles: { has: r } }
      ]);
    } else {
      where.OR = [
        { role: params.role },
        { roles: { has: params.role } }
      ];
    }
  }
  
  // 状态筛选
  if (params.status) {
    if (Array.isArray(params.status)) {
      where.status = { in: params.status };
    } else {
      where.status = params.status;
    }
  }
  
  // 日期范围筛选
  if (params.dateFrom) {
    where.created_at = { gte: new Date(params.dateFrom) };
  }
  
  if (params.dateTo) {
    if (where.created_at) {
      where.created_at.lte = new Date(params.dateTo);
    } else {
      where.created_at = { lte: new Date(params.dateTo) };
    }
  }
  
  // 限制导出数量
  const limit = params.limit ? Math.min(parseInt(params.limit), 50000) : 50000;

  const users = await prisma.userProfile.findMany({
    where,
    take: limit,
    select: {
      id: true,
      user_id: true, // UserProfile 使用 snake_case
      first_name: true,
      last_name: true,
      display_name: true,
      email: true,
      phone: true,
      role: true,
      roles: true,
      status: true,
      created_at: true,
      updated_at: true
    },
    orderBy: { created_at: 'desc' }
  });

  // 格式化导出数据
  const exportData = users.map(user => ({
    id: user.user_id,
    userId: user.user_id,
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    displayName: user.display_name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || '',
    roles: Array.isArray(user.roles) ? user.roles.join(', ') : (user.roles || ''),
    status: user.status || '',
    createdAt: user.created_at?.toISOString() || '',
    updatedAt: user.updated_at?.toISOString() || '',
  }));

  return { count: exportData.length, data: exportData };
}

// 清理旧的审核记录
async function clearOldReviews(days: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await prisma.solutionReview.deleteMany({
    where: {
      reviewedAt: { // SolutionReview 使用 camelCase
        lt: cutoffDate
      }
    }
  });

  return { deleted: result.count, cutoffDate };
}

// 发送批量通知
async function sendBulkNotification(params: any) {
  // 这里可以实现批量通知逻辑
  // 例如：向所有创作者发送系统通知
  const message = params.message || '系统通知';
  const targetRole = params.targetRole || 'CREATOR';

  const users = await prisma.userProfile.findMany({
    where: {
      OR: [
        { role: targetRole },
        { roles: { has: targetRole } }
      ]
    },
    select: { 
      id: true,
      user_id: true,
      display_name: true,
      role: true,
      roles: true,
    }
  });

  // 模拟发送通知
  let sent = 0;
  for (const user of users) {
    try {
      // 这里可以调用通知服务
      console.log(`发送通知给用户 ${user.user_id} (${user.display_name}): ${message}`);
      sent++;
    } catch (error) {
      console.error(`发送通知给用户 ${user.user_id} 失败:`, error);
    }
  }

  return { sent, total: users.length, message };
}