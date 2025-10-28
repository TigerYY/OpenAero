import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth-helpers';
import { solutionService } from '@/backend/solution/solution.service';
import { logUserAction } from '@/backend/auth/auth.middleware';
import { ApiResponse } from '@/types';

// 分配审核员请求验证模式
const assignReviewerSchema = z.object({
  solutionId: z.string().min(1, '方案ID为必填项'),
  reviewerId: z.string().optional().describe('审核员ID，不提供则自动分配')
});

// POST /api/admin/solutions/assign-reviewer - 分配审核员
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
        error: '权限不足，仅管理员可以分配审核员',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    const body = await request.json();
    
    // 验证输入数据
    const validatedData = assignReviewerSchema.parse(body);
    
    // 开始审核流程并分配审核员
    const result = await solutionService.startReview(
      validatedData.solutionId,
      validatedData.reviewerId
    );

    // 记录审计日志
    await logUserAction(
      authResult.user.id,
      'ASSIGN_REVIEWER',
      `分配审核员: 方案${validatedData.solutionId} -> 审核员${result.reviewer.email}`
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: `已成功分配审核员: ${result.reviewer.email}`
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('分配审核员失败:', error);
    
    if (error instanceof z.ZodError) {
      const response: ApiResponse<null> = {
        success: false,
        error: '输入数据验证失败: ' + error.errors.map(e => e.message).join(', '),
        data: null
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '分配审核员失败',
      data: null
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// GET /api/admin/solutions/assign-reviewer - 获取可用审核员列表
export async function GET(request: NextRequest) {
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
        error: '权限不足，仅管理员可以查看审核员列表',
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    // 获取可用审核员列表
    const { db } = await import('@/lib/db');
    const reviewers = await db.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            solutionReviews: {
              where: {
                status: 'IN_PROGRESS'
              }
            }
          }
        }
      },
      orderBy: {
        email: 'asc'
      }
    });

    const response: ApiResponse<typeof reviewers> = {
      success: true,
      data: reviewers,
      message: `找到 ${reviewers.length} 个可用审核员`
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('获取审核员列表失败:', error);

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取审核员列表失败',
      data: null
    };

    return NextResponse.json(response, { status: 500 });
  }
}