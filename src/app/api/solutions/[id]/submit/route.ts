import { NextRequest, NextResponse } from 'next/server';
import { solutionService } from '@/backend/solution/solution.service';
import { authenticateRequest } from '@/lib/auth-helpers';
import { logUserAction } from '@/backend/auth/auth.middleware';
import { ApiResponse } from '@/types';

// POST /api/solutions/[id]/submit - 提交方案审核
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
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

    const solutionId = params.id;
    
    // 提交方案审核
    const result = await solutionService.submitForReview(
      solutionId,
      authResult.user.id
    );

    // 记录审计日志
    await logUserAction(
      authResult.user.id,
      'SOLUTION_SUBMIT_REVIEW',
      'solution',
      solutionId,
      undefined,
      { title: result.title, action: 'submit_for_review' },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '方案已成功提交审核'
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('提交方案审核失败:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: error.message || '提交审核失败',
      data: null
    };

    return NextResponse.json(response, { status: 500 });
  }
}