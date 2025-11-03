import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logUserAction } from '@/backend/auth/auth.middleware';
import { reviewNotificationService } from '@/backend/email/review-notification.service';
import { solutionService } from '@/backend/solution/solution.service';
import { authenticateRequest } from '@/lib/auth-helpers';
import { ApiResponse } from '@/types';

// 批量审核请求验证模式
const batchReviewSchema = z.object({
  solutionIds: z.array(z.string()).min(1, '至少需要选择一个方案').max(50, '一次最多审核50个方案'),
  action: z.enum(['approve', 'reject'], {
    required_error: '审核操作为必填项',
    invalid_type_error: '审核操作必须是approve或reject'
  }),
  notes: z.string().optional().describe('批量审核备注')
});

// POST /api/admin/solutions/batch-review - 管理员批量审核方案
export async function POST(request: NextRequest) {
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
        error: '权限不足，仅管理员可以批量审核方案',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    const body = await request.json();
    
    // 验证输入数据
    const validatedData = batchReviewSchema.parse(body);
    
    const results = [];
    const notifications = [];
    let successCount = 0;
    let failedCount = 0;

    // 逐个处理每个方案
    for (const solutionId of validatedData.solutionIds) {
      try {
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

        results.push({
          solutionId,
          success: true,
          data: result
        });

        // 准备通知数据
        notifications.push({
          solutionId: result.id,
          solutionTitle: result.title,
          creatorEmail: result.creator.user.email,
          creatorName: `${result.creator.user.firstName || ''} ${result.creator.user.lastName || ''}`.trim() || result.creator.user.email,
          reviewStatus: validatedData.action === 'approve' ? 'APPROVED' as const : 'REJECTED' as const,
          reviewNotes: validatedData.notes || '',
          reviewerName: authResult.user.email,
          reviewedAt: new Date()
        });

        successCount++;

      } catch (error) {
        console.error(`审核方案 ${solutionId} 失败:`, error);
        results.push({
          solutionId,
          success: false,
          error: error instanceof Error ? error.message : '审核失败'
        });
        failedCount++;
      }
    }

    // 记录审计日志
    await logUserAction(
      authResult.user.id,
      `BATCH_SOLUTION_${validatedData.action.toUpperCase()}`,
      `批量${validatedData.action === 'approve' ? '批准' : '拒绝'}方案: ${successCount}个成功, ${failedCount}个失败`
    );

    // 批量发送通知邮件
    if (notifications.length > 0) {
      try {
        const notificationResult = await reviewNotificationService.sendBatchReviewNotifications(notifications);
        console.log(`批量通知发送结果: ${notificationResult.success}个成功, ${notificationResult.failed}个失败`);
      } catch (notificationError) {
        console.error('批量发送审核通知失败:', notificationError);
        // 不影响主要的审核流程
      }
    }

    const response: ApiResponse<{
      results: typeof results;
      summary: {
        total: number;
        success: number;
        failed: number;
      };
    }> = {
      success: true,
      data: {
        results,
        summary: {
          total: validatedData.solutionIds.length,
          success: successCount,
          failed: failedCount
        }
      },
      message: `批量审核完成: ${successCount}个成功, ${failedCount}个失败`
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('批量审核方案失败:', error);
    
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
      error: error instanceof Error ? error.message : '批量审核方案失败',
      data: null
    };

    return NextResponse.json(response, { status: 500 });
  }
}