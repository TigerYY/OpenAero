import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logUserAction } from '@/backend/auth/auth.middleware';
import { reviewNotificationService } from '@/backend/email/review-notification.service';
import { solutionService } from '@/backend/solution/solution.service';
import { authenticateRequest } from '@/lib/auth-helpers';
import { ApiResponse } from '@/types';

// 审核请求验证模式
const reviewSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    required_error: '审核操作为必填项',
    invalid_type_error: '审核操作必须是approve或reject'
  }),
  notes: z.string().optional().describe('审核备注')
});

// POST /api/admin/solutions/[id]/review - 管理员审核方案
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份和权限
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.error || NextResponse.json(
        {
          success: false,
          error: '未授权访问',
          data: null
        } as ApiResponse<null>,
        { status: 401 }
      );
    }

    // 检查管理员权限
    if (authResult.user.role !== 'ADMIN') {
      const response: ApiResponse<null> = {
        success: false,
        error: '权限不足，仅管理员可以审核方案',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    const solutionId = params.id;
    const body = await request.json();
    
    // 验证输入数据
    const validatedData = reviewSchema.parse(body);
    
    let result;
    if (validatedData.action === 'approve') {
      // 批准方案
      result = await solutionService.approveSolution(
        solutionId, 
        authResult.user.id,
        validatedData.notes
      );
    } else {
      // 拒绝方案
      result = await solutionService.rejectSolution(
        solutionId, 
        authResult.user.id,
        validatedData.notes || '方案不符合要求'
      );
    }

    // 记录审计日志
    await logUserAction(
      authResult.user.id,
      `SOLUTION_${validatedData.action.toUpperCase()}`,
      `${validatedData.action === 'approve' ? '批准' : '拒绝'}方案: ${solutionId}`
    );

    // 发送审核通知邮件给创作者
    try {
      await reviewNotificationService.sendReviewNotification({
        solutionId: result.id,
        solutionTitle: result.title,
        creatorEmail: (result as any)?.creator?.user?.email ?? (result as any)?.user?.email ?? '',
        creatorName: `${(result as any)?.creator?.user?.firstName ?? ''} ${(result as any)?.creator?.user?.lastName ?? ''}`.trim() || (result as any)?.user?.email || '',
        reviewStatus: validatedData.action === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewNotes: validatedData.notes || '',
        reviewerName: authResult.user.email,
        reviewedAt: new Date()
      });
    } catch (notificationError) {
      console.error('发送审核通知失败:', notificationError);
      // 不影响主要的审核流程，只记录错误
    }

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: `方案已${validatedData.action === 'approve' ? '批准' : '拒绝'}`
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('审核方案失败:', error);
    
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
      error: error instanceof Error ? error.message : '审核方案失败',
      data: null
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// GET /api/admin/solutions/[id]/review - 获取方案审核历史
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份和权限
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.error || NextResponse.json(
        {
          success: false,
          error: '未授权访问',
          data: null
        } as ApiResponse<null>,
        { status: 401 }
      );
    }

    // 检查管理员权限
    if (authResult.user.role !== 'ADMIN') {
      const response: ApiResponse<null> = {
        success: false,
        error: '权限不足，仅管理员可以查看审核历史',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    const solutionId = params.id;
    
    // 获取审核历史
    const reviewHistory = await solutionService.getReviewHistory(solutionId);

    const response: ApiResponse<typeof reviewHistory> = {
      success: true,
      data: reviewHistory,
      message: '获取审核历史成功'
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('获取审核历史失败:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取审核历史失败',
      data: null
    };
    return NextResponse.json(response, { status: 500 });
  }
}