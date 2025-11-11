import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';


import { authenticateRequest } from '@/lib/auth-helpers';
import { db } from '@/lib/prisma';
import { ApiResponse } from '@/types';

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
    // 移除了用户认证，因为用户系统已被清除

    const body = await request.json();
    const validatedData = quickActionSchema.parse(body);

    let result: any = null;
    let message = '';

    switch (validatedData.action) {
      case 'approve_all_pending':
        result = await approveAllPendingSolutions(authResult.user.id);
        message = `批量批准完成: ${result.approved}个方案已批准`;
        break;

      case 'reject_all_pending':
        const reason = validatedData.params?.reason || '批量拒绝操作';
        result = await rejectAllPendingSolutions(authResult.user.id, reason);
        message = `批量拒绝完成: ${result.rejected}个方案已拒绝`;
        break;

      case 'export_solutions':
        result = await exportSolutions(validatedData.params);
        message = `方案数据导出完成: ${result.count}条记录`;
        break;

      case 'export_users':
        result = await exportUsers(validatedData.params);
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
  const pendingSolutions = await db.solution.findMany({
    where: { status: 'PENDING_REVIEW' },
    include: {
      creator: {
        include: { user: true }
      }
    }
  });

  let approved = 0;
  const results = [];

  for (const solution of pendingSolutions) {
    try {
      const updated = await db.solution.update({
        where: { id: solution.id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewNotes: '批量批准操作'
        }
      });

      // 创建审核记录
      await db.solutionReview.create({
        data: {
          solutionId: solution.id,
          reviewerId: adminId,
          status: 'COMPLETED',
          decision: 'APPROVED',
          comments: '批量批准操作',
          reviewedAt: new Date()
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
  const pendingSolutions = await db.solution.findMany({
    where: { status: 'PENDING_REVIEW' },
    include: {
      creator: {
        include: { user: true }
      }
    }
  });

  let rejected = 0;
  const results = [];

  for (const solution of pendingSolutions) {
    try {
      const updated = await db.solution.update({
        where: { id: solution.id },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewNotes: reason
        }
      });

      // 创建审核记录
      await db.solutionReview.create({
        data: {
          solutionId: solution.id,
          reviewerId: adminId,
          status: 'COMPLETED',
          decision: 'REJECTED',
          comments: reason,
          reviewedAt: new Date()
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
  
  if (params.status) {
    where.status = params.status;
  }
  
  if (params.dateFrom) {
    where.createdAt = { gte: new Date(params.dateFrom) };
  }

  const solutions = await db.solution.findMany({
    where,
    include: {
      creator: {
        include: { user: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 格式化导出数据
  const exportData = solutions.map(solution => ({
    id: solution.id,
    title: solution.title,
    description: solution.description,
    category: solution.category,
    price: solution.price,
    status: solution.status,
    creatorEmail: solution.creator.user.email,
    creatorName: `${solution.creator.user.firstName || ''} ${solution.creator.user.lastName || ''}`.trim(),
    createdAt: solution.createdAt,
    updatedAt: solution.updatedAt,
    reviewedAt: solution.reviewedAt,
    reviewNotes: solution.reviewNotes
  }));

  return { count: exportData.length, data: exportData };
}

// 导出用户数据
async function exportUsers(params: any = {}) {
  const where: any = {};
  
  if (params.role) {
    where.role = params.role;
  }
  
  if (params.dateFrom) {
    where.createdAt = { gte: new Date(params.dateFrom) };
  }

  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return { count: users.length, data: users };
}

// 清理旧的审核记录
async function clearOldReviews(days: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await db.solutionReview.deleteMany({
    where: {
      reviewedAt: {
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

  const users = await db.user.findMany({
    where: { role: targetRole },
    select: { id: true, email: true }
  });

  // 模拟发送通知
  let sent = 0;
  for (const user of users) {
    try {
      // 这里可以调用通知服务
      console.log(`发送通知给 ${user.email}: ${message}`);
      sent++;
    } catch (error) {
      console.error(`发送通知给 ${user.email} 失败:`, error);
    }
  }

  return { sent, total: users.length, message };
}