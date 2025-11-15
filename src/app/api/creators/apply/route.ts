import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerUser } from '@/lib/auth/auth-service';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';
import { createCreatorApplication } from '@/lib/creator-application';

export const dynamic = 'force-dynamic';

const createApplicationSchema = z.object({
  bio: z.string().min(10, '个人简介至少需要10个字符').max(1000, '个人简介不能超过1000个字符'),
  website: z.union([
    z.string().url('请输入有效的网址'),
    z.literal(''),
  ]).optional(),
  experience: z.string().min(10, '相关经验至少需要10个字符').max(2000, '相关经验不能超过2000个字符'),
  specialties: z.array(z.string()).min(1, '至少选择一个专长领域').max(10, '最多选择10个专长领域'),
  portfolio: z.array(z.string().url('作品集链接必须是有效的URL')).optional(),
  documents: z.array(z.string().url('文档链接必须是有效的URL')).optional(),
});

/**
 * POST /api/creators/apply - 提交创作者申请
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    const body = await request.json();
    const validationResult = createApplicationSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const applicationData = {
      userId: user.id,
      ...validationResult.data,
    };

    const application = await createCreatorApplication(applicationData);

    // 记录审计日志
    await logAuditAction(request, {
      userId: user.id,
      action: 'CREATOR_APPLICATION_SUBMITTED',
      resource: 'creator_applications',
      resource_id: application.id,
      metadata: {
        bio: application.bio,
        specialties: application.specialties,
      },
    });

    // TODO: 发送申请提交通知邮件

    return createSuccessResponse(
      {
        applicationId: application.id,
        status: application.status,
        submittedAt: application.submittedAt,
      },
      '创作者申请提交成功，我们将在3个工作日内审核您的申请',
      201
    );
  } catch (error) {
    console.error('创作者申请错误:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : '申请提交失败，请稍后重试',
      error instanceof Error && (error.message.includes('已经是') || error.message.includes('已经有一个'))
        ? 409
        : 500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}