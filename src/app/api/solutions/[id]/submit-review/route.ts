import { NextRequest, NextResponse } from 'next/server';

import { logUserAction } from '@/backend/auth/auth.middleware';
import { solutionService } from '@/backend/solution/solution.service';
import { authenticateRequest } from '@/lib/auth-helpers';
import { ApiResponse } from '@/types';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证用户身份
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.error || NextResponse.json(
        {
          success: false,
          error: '未授权访问',
          code: 401,
          data: null
        } as ApiResponse<null>,
        { status: 401 }
      );
    }

    const solutionId = params.id;

    // 调用服务层提交审核
    const result = await solutionService.submitForReview(solutionId, authResult.user.id);

    // 记录用户操作日志
    await logUserAction(
      authResult.user.id,
      'SUBMIT_FOR_REVIEW',
      'solution',
      solutionId,
      undefined,
      { solutionId, action: 'submit_for_review' },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    const response: ApiResponse<any> = {
      success: true,
      data: result,
      message: '方案已成功提交审核'
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('Submit for review error:', error);

    // 根据错误类型返回不同的状态码
    if (error.message.includes('权限不足') || error.message.includes('无权限')) {
      const response: ApiResponse<null> = {
        success: false,
        error: error.message,
        code: 403,
        data: null
      };
      return NextResponse.json(response, { status: 403 });
    }

    if (error.message.includes('不存在') || error.message.includes('未找到')) {
      const response: ApiResponse<null> = {
        success: false,
        error: error.message,
        code: 404,
        data: null
      };
      return NextResponse.json(response, { status: 404 });
    }

    if (error.message.includes('状态') || error.message.includes('不能')) {
      const response: ApiResponse<null> = {
        success: false,
        error: error.message,
        code: 400,
        data: null
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse<null> = {
      success: false,
      error: '提交审核失败，请稍后重试',
      code: 500,
      data: null
    };
    return NextResponse.json(response, { status: 500 });
  }
}