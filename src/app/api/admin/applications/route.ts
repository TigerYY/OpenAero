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
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  status: z.nativeEnum(VerificationStatus).optional(),
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
    const queryResult = applicationsQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
    });

    if (!queryResult.success) {
      return createErrorResponse('查询参数无效', 400);
    }

    const { page, limit, status } = queryResult.data;
    const result = await getApplications(page, limit, status);

    return createPaginatedResponse(
      result.applications,
      {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
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

    // TODO: 发送通知邮件
    // if (action === 'approve') {
    //   await sendApplicationApprovedEmail(updatedApplication.user.email, updatedApplication);
    // } else {
    //   await sendApplicationRejectedEmail(updatedApplication.user.email, updatedApplication, notes);
    // }

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