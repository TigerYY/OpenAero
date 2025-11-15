import { NextRequest } from 'next/server';
import { z } from 'zod';
import { VerificationStatus } from '@prisma/client';
import {
  requireAdminAuth,
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { getApplications, reviewApplication } from '@/lib/creator-application';

export const dynamic = 'force-dynamic';

const applicationsQuerySchema = z.object({
  page: z.string().nullable().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().nullable().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  status: z.string().nullable().optional().transform((val) => {
    // 如果为 null、空字符串或 'all'，返回 undefined
    if (!val || val === '' || val === 'all') {
      return undefined;
    }
    // 验证是否为有效的 VerificationStatus
    if (Object.values(VerificationStatus).includes(val as VerificationStatus)) {
      return val as VerificationStatus;
    }
    return undefined;
  }),
});

const reviewApplicationSchema = z.object({
  applicationId: z.string().min(1, '申请ID不能为空'),
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(1000, '备注不能超过1000个字符').optional(),
});

// GET - 获取申请列表
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get('status');
    
    console.log('API 接收到的查询参数:', {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: statusParam,
    });
    
    const queryResult = applicationsQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: statusParam,
    });

    if (!queryResult.success) {
      console.error('查询参数验证失败:', queryResult.error);
      return createErrorResponse('查询参数无效', 400);
    }

    const { page, limit, status } = queryResult.data;
    console.log('解析后的查询参数:', { page, limit, status });
    
    const result = await getApplications(page, limit, status);
    console.log('查询结果:', { count: result.applications.length, total: result.total });

    return createPaginatedResponse(
      result.applications,
      page,
      limit,
      result.total,
      '获取申请列表成功'
    );
  } catch (error) {
    console.error('获取申请列表失败:', error);
    return createErrorResponse(
      '获取申请列表失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

// PUT - 审核申请
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const body = await request.json();
    const validationResult = reviewApplicationSchema.safeParse(body);

    if (!validationResult.success) {
      return createErrorResponse('请求参数无效', 400);
    }

    const { applicationId, action, notes } = validationResult.data;

    const updatedApplication = await reviewApplication(
      applicationId,
      action === 'approve',
      authResult.user.id,
      notes
    );

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: action === 'approve' ? 'CREATOR_APPLICATION_APPROVED' : 'CREATOR_APPLICATION_REJECTED',
      resource: 'creator_applications',
      resource_id: applicationId,
      metadata: {
        action,
        notes,
        userId: updatedApplication.userId,
      },
    });

    // 发送通知邮件
    if (updatedApplication.user.email) {
      try {
        const { sendEmail } = await import('@/lib/email/smtp-service');
        const { getCreatorApprovalEmail } = await import('@/lib/email/email-templates');
        
        const userName = updatedApplication.user.firstName || updatedApplication.user.lastName 
          ? `${updatedApplication.user.firstName || ''} ${updatedApplication.user.lastName || ''}`.trim()
          : updatedApplication.user.email.split('@')[0];
        
        const emailTemplate = getCreatorApprovalEmail({
          userName,
          approved: action === 'approve',
          reason: notes || undefined,
        });

        await sendEmail({
          to: updatedApplication.user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        });

        console.log(`已发送${action === 'approve' ? '批准' : '拒绝'}通知邮件给:`, updatedApplication.user.email);
      } catch (error) {
        console.error('发送通知邮件失败:', error);
        // 不抛出错误，避免影响审核流程
      }
    }

    return createSuccessResponse(
      updatedApplication,
      `申请已${action === 'approve' ? '批准' : '拒绝'}`
    );
  } catch (error) {
    console.error('审核申请失败:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : '审核申请失败',
      error instanceof Error && error.message.includes('不存在') ? 404 : 500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

// DELETE - 删除申请
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const applicationId = searchParams.get('id');

    if (!applicationId) {
      return createErrorResponse('缺少申请ID', 400);
    }

    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const applicationIndex = mockApplications.findIndex(app => app.id === applicationId);
    if (applicationIndex === -1) {
      return createErrorResponse('申请不存在', 404);
    }

    // 删除申请
    const deletedApplication = mockApplications.splice(applicationIndex, 1)[0];

    return createSuccessResponse(
      { deletedApplication },
      '申请已删除'
    );
  } catch (error) {
    console.error('删除申请失败:', error);
    return createErrorResponse(error instanceof Error ? error : new Error('服务器错误'), 500);
  }
}