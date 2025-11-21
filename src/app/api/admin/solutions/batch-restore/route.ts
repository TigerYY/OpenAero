import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdminAuth } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse, logAuditAction } from '@/lib/api-helpers';

const batchRestoreSchema = z.object({
  solutionIds: z.array(z.string().min(1)).min(1, '至少选择一个方案').max(10, '最多只能选择 10 个方案'),
});

// POST /api/admin/solutions/batch-restore - 批量恢复方案
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const validatedData = batchRestoreSchema.parse(body);

    // 验证所有方案都存在且状态为 SUSPENDED
    const solutions = await prisma.solution.findMany({
      where: {
        id: { in: validatedData.solutionIds }
      }
    });

    if (solutions.length !== validatedData.solutionIds.length) {
      const foundIds = new Set(solutions.map(s => s.id));
      const missingIds = validatedData.solutionIds.filter(id => !foundIds.has(id));
      return createErrorResponse(`以下方案不存在: ${missingIds.join(', ')}`, 400);
    }

    // 验证所有方案状态为 SUSPENDED
    const invalidStatusSolutions = solutions.filter(s => s.status !== 'SUSPENDED');
    if (invalidStatusSolutions.length > 0) {
      return createErrorResponse(
        `以下方案状态不正确，必须为"临时下架": ${invalidStatusSolutions.map(s => s.title).join(', ')}`,
        400
      );
    }

    // 使用事务批量恢复
    const results = await prisma.$transaction(async (tx) => {
      const success: string[] = [];
      const failures: Array<{ id: string; error: string }> = [];

      for (const solution of solutions) {
        try {
          // 更新方案状态（不改变 published_at）
          await tx.solution.update({
            where: { id: solution.id },
            data: {
              status: 'PUBLISHED',
            }
          });

          // 创建审核记录
          await tx.solutionReview.create({
            data: {
              solution_id: solution.id,
              reviewer_id: authResult.user.id,
              from_status: solution.status,
              to_status: 'PUBLISHED',
              status: 'COMPLETED',
              decision: 'APPROVED',
              comments: '批量恢复',
              reviewed_at: new Date(),
            }
          });

          success.push(solution.id);
        } catch (error) {
          failures.push({
            id: solution.id,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      }

      return { success, failures };
    });

    // 记录审计日志
    await logAuditAction(request, {
      userId: authResult.user.id,
      action: 'SOLUTION_BATCH_RESTORED',
      resource: 'solution',
      resourceId: validatedData.solutionIds.join(','),
      oldValue: { count: solutions.length },
      newValue: { successCount: results.success.length, failureCount: results.failures.length },
    });

    return createSuccessResponse(
      {
        successCount: results.success.length,
        failureCount: results.failures.length,
        success: results.success,
        failures: results.failures,
      },
      `成功恢复 ${results.success.length} 个方案${results.failures.length > 0 ? `，失败 ${results.failures.length} 个` : ''}`
    );
  } catch (error) {
    console.error('批量恢复失败:', error);
    
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }
    
    return createErrorResponse(
      error instanceof Error ? error : new Error('批量恢复失败'),
      500
    );
  }
}

